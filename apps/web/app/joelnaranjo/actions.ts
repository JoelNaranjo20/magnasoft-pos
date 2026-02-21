'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * STEP 2 del flujo: Provisionar negocio DESPUÉS del login
 * Se ejecuta cuando el usuario se loguea por primera vez y no tiene business_id
 */
export async function provisionBusiness(formData: {
    userId: string;
    businessName: string;
    businessType?: string;
}) {
    const { userId, businessName, businessType } = formData;

    if (!supabaseServiceKey) {
        return { success: false, error: "Service role key missing" };
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        // 1. Crear el negocio
        const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 10000);

        const { data: business, error: businessError } = await adminClient
            .from('business')
            .insert({
                name: businessName,
                slug: slug,
                status: 'active',
                owner_id: userId
            })
            .select()
            .single();

        if (businessError) throw businessError;

        // 2. Actualizar app_metadata del usuario (esto actualiza el JWT)
        const { error: metadataError } = await adminClient.auth.admin.updateUserById(
            userId,
            {
                app_metadata: {
                    business_id: business.id,
                    role: 'owner'
                }
            }
        );

        if (metadataError) throw metadataError;

        // 3. Actualizar el perfil
        const { error: profileError } = await adminClient
            .from('profiles')
            .update({
                business_id: business.id,
                role: 'super_admin',
                saas_role: 'owner'
            })
            .eq('id', userId);

        if (profileError) throw profileError;

        return { success: true, businessId: business.id };
    } catch (err: any) {
        console.error("Business provisioning error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Crear Super Admin (Bootstrap) - SIMPLIFICADO
 */
export async function createSuperAdmin(formData: any) {
    const { email, password, secretKey } = formData;

    if (secretKey !== "1234") {
        return { success: false, error: "Unauthorized" };
    }

    if (!supabaseServiceKey) {
        return { success: false, error: "Service key missing" };
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        // Verificar que no exista ningún super admin
        const { data: existingAdmins } = await adminClient
            .from('profiles')
            .select('id')
            .eq('saas_role', 'super_admin')
            .limit(1);

        if (existingAdmins && existingAdmins.length > 0) {
            return { success: false, error: "Super Admin already exists" };
        }

        // Crear usuario con app_metadata
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            app_metadata: {
                role: 'super_admin'
                // NO business_id - Super admins son globales
            },
            user_metadata: {
                full_name: 'Super Admin'
            }
        });

        if (authError) throw authError;

        // Actualizar el perfil que ya fue creado por el trigger
        const { error: profileError } = await adminClient
            .from('profiles')
            .update({
                role: 'super_admin',
                saas_role: 'super_admin',
                business_id: null
            })
            .eq('id', authUser.user.id);

        if (profileError) throw profileError;

        return { success: true };
    } catch (err: any) {
        console.error("Super Admin creation error:", err);
        return { success: false, error: err.message };
    }
}
