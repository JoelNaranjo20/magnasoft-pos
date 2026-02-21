// @ts-nocheck
import { supabase } from '../lib/supabase';

export interface ActivationStatus {
    isValid: boolean;
    businessId?: string;
    message?: string;
}

export class LicenseService {
    /**
     * Gets the unique Hardware ID of the machine.
     */
    static async getHWID(): Promise<string> {
        // 1. Try to get cached HWID from Persistent Storage (Critical for stability)
        if (window.electronAPI && window.electronAPI.storageGet) {
            const cachedHwid = await window.electronAPI.storageGet('sv_hwid_persistent');
            if (cachedHwid) {
                console.log('[LicenseService] Using persistent HWID:', cachedHwid);
                return cachedHwid;
            }
        }

        // 2. Get fresh HWID
        let hwid = '';
        if (window.electronAPI && window.electronAPI.getHWID) {
            hwid = await window.electronAPI.getHWID();
        } else {
            // Fallback for browser dev without electron bridge
            hwid = 'DEV-HWID-' + Math.random().toString(36).substr(2, 9);
        }

        // 3. Cache it persistently
        if (window.electronAPI && window.electronAPI.storageSet) {
            await window.electronAPI.storageSet('sv_hwid_persistent', hwid);
            console.log('[LicenseService] Cached new HWID persistent:', hwid);
        }

        return hwid;
    }

    /**
     * Checks if the current machine is already activated.
     */
    /**
     * Checks if the current machine is already activated and ensures it is LOGGED IN.
     * Enforces STRICT authentication.
     */
    static async checkActivation(): Promise<ActivationStatus> {
        const hwid = await this.getHWID();
        let localSerial: string | null = null;

        // 1. Try to get serial from Persistent File Storage first (Reliable)
        if (window.electronAPI && window.electronAPI.storageGet) {
            console.log('[LicenseService] 🔍 Reading sv_serial from file...');
            localSerial = await window.electronAPI.storageGet('sv_serial');
            console.log('[LicenseService] 📄 File Serial Result:', localSerial);
        }

        // 2. Fallback to localStorage
        if (!localSerial) {
            console.log('[LicenseService] ⚠️ No file serial, checking localStorage...');
            localSerial = localStorage.getItem('sv_serial');
            console.log('[LicenseService] 🏠 LocalStorage Serial Result:', localSerial);
        }

        if (!localSerial) {
            console.warn('[LicenseService] ❌ No serial found anywhere.');
            return { isValid: false, message: 'No se encontró serial de activación.' };
        }

        // 1. Try to login as Device
        try {
            console.log('[LicenseService] Checking activation with Serial:', localSerial);
            console.log('[LicenseService] Current HWID:', hwid);

            const loginResult = await this.loginAsDevice(localSerial, hwid);
            if (!loginResult.success) {
                console.error('[LicenseService] Login failed:', loginResult.message);

                // Debugging Info
                console.warn('[LicenseService] Mismatch Debug Info:');
                console.warn('- Local Serial:', localSerial);
                console.warn('- Local HWID:', hwid);
                console.warn('If HWID changed, password generation will mismatch.');

                // If login fails but we have a serial, it might be that the user doesn't exist yet (rare if migration ran)
                // or internet is down.
                return { isValid: false, message: 'Error de autenticación del dispositivo: ' + loginResult.message };
            }

            // 2. Verify Business Status (via Authenticated RLS)
            // Now that we are logged in, we can query safely.
            // We do NOT trust localStorage business_id anymore for security.
            const user = (await supabase.auth.getUser()).data.user;
            const businessId = user?.app_metadata?.business_id || user?.user_metadata?.business_id;

            if (!businessId) {
                console.warn('⚠️ Authenticated but missing business_id. Attempting self-healing...');

                // Self-Healing: Call provision RPC again to force metadata update
                try {
                    await supabase.rpc('provision_device_user', {
                        p_serial: localSerial,
                        p_hwid: hwid
                    });

                    // Refresh session to get new metadata
                    const { data: refreshData } = await supabase.auth.refreshSession();
                    const refreshedUser = refreshData.session?.user;
                    const newBusinessId = refreshedUser?.app_metadata?.business_id || refreshedUser?.user_metadata?.business_id;

                    if (newBusinessId) {
                        console.log('✅ Self-healing successful. Business ID restored:', newBusinessId);
                        return { isValid: true, businessId: newBusinessId };
                    }
                } catch (healingError) {
                    console.error('Self-healing failed:', healingError);
                }

                // Fallback: Fetch from Activation Code table (now visible because we are auth'd as device owner of that code? 
                // Actually, the device user needs RLS access to its own activation code or business)
                // For simplified flow, we assume the JWT claim is there. If not, we fetch profile.
                const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user?.id).single();
                if (profile?.business_id) {
                    return { isValid: true, businessId: profile.business_id };
                }
                return { isValid: false, message: 'Dispositivo autenticado pero sin negocio asignado. (Self-healing failed)' };
            }

            return { isValid: true, businessId: businessId };

        } catch (error: any) {
            console.error('License Check Error:', error);
            // If offline, check if we have a valid session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                return { isValid: true, businessId: session.user.user_metadata.business_id }; // Trust session if offline
            }
            return { isValid: false, message: 'Error de conexión: ' + error.message };
        }
    }

    /**
     * Authenticates the device against Supabase Auth using Serial as credentials.
     */
    static async loginAsDevice(serial: string, hwid: string): Promise<{ success: boolean; message?: string }> {
        const email = `device_${serial}@saas-pos.local`;
        const rawPassword = `${serial}_${hwid}_secure`;
        const password = rawPassword.length > 70 ? rawPassword.substring(0, 70) : rawPassword;

        try {
            // 1. Attempt Sign In
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (!error && data.session) {
                console.log('✅ Device Authenticated:', email);
                return { success: true };
            }

            // Si es un error 500 de base de datos, NO intentamos registrar otra vez
            if (error?.status === 500 || error?.message?.includes('schema')) {
                return { success: false, message: 'Error interno del servidor (Schema/Crypto). Por favor aplica el fix SQL.' };
            }

            // 2. Si falla por credenciales, intentamos auto-registro (solo para recuperación suave)
            if (error?.message?.includes('Invalid login credentials')) {
                console.log('⚠️ Credenciales inválidas, intentando auto-registro...');
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: `Terminal ${serial.substring(0, 4)}`,
                            role: 'device',
                        }
                    }
                });

                if (signUpError) {
                    // Si el usuario ya existe, el problema es la contraseña o el 500 anterior
                    if (signUpError.message?.includes('already registered')) {
                        return { success: false, message: 'El usuario ya existe pero la contraseña no coincide. Revisa el HWID.' };
                    }
                    return { success: false, message: signUpError.message };
                }

                if (signUpData.session) return { success: true };
            }

            return { success: false, message: error?.message || 'Error de autenticación desconocido' };

        } catch (err: any) {
            return { success: false, message: err.message };
        }
    }

    /**
     * Activates a new serial for this machine.
     */
    static async activateSerial(serial: string): Promise<ActivationStatus> {
        const hwid = await this.getHWID();

        try {
            // 1. Activate in DB (Need partial open access for this? Or specific RPC?)
            // We assume there is an RPC for public activation, OR a temporary open policy on activation_codes.
            // Since we locked down everything, we need an RPC.

            // NOTE: Since we applied STRICT RLS, the previous direct update will FAIL for Anon.
            // We MUST use a Server Action or RPC. 
            // For now, let's assume `provision_device_user` helps us or we rely on a specific RPC `activate_device`.

            // Let's try to call the provisioning RPC we created
            console.log('[LicenseService] 🚀 Calling provision_device_user RPC...');
            const { data: credentials, error: rpcError } = await supabase.rpc('provision_device_user', {
                p_serial: serial,
                p_hwid: hwid
            });

            if (rpcError) throw rpcError;
            console.log('[LicenseService] ✅ RPC Success, validating credentials...');

            // 2. Login newly provisioned user
            const creds = credentials as any;
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: creds.email,
                password: creds.password
            });

            if (loginError) {
                // Mejora de error para el usuario
                if (loginError.status === 500 || loginError.message?.includes('schema')) {
                    throw new Error('Error interno crítico (500). Por favor ejecuta el script: 20260202_fix_500_internal_error.sql');
                }
                throw loginError;
            }
            console.log('[LicenseService] ✅ Login Success. Attempting Persistence...');

            // 3. Save locally (Metadata only)
            // Save to File Storage (Persistent)
            if (window.electronAPI && window.electronAPI.storageSet) {
                console.log('[LicenseService] 💾 Writing serial to file...');
                const success = await window.electronAPI.storageSet('sv_serial', serial);
                console.log('[LicenseService] 💾 Write result:', success);
            } else {
                console.warn('[LicenseService] ⚠️ No electronAPI found, skipping file save');
            }

            // Also save to localStorage as backup
            localStorage.setItem('sv_serial', serial);
            // localStorage.setItem('sv_business_id', creds.business_id); // NO LONGER NEEDED FOR SECURITY, just UI

            return { isValid: true, businessId: creds.business_id };
        } catch (error: any) {
            console.error('[LicenseService] ❌ Activation Error:', error);
            return { isValid: false, message: 'Error en la activación: ' + error.message };
        }
    }
}
