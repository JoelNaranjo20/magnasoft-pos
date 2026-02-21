"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env vars
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env.local') });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase environment variables.');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
async function runSecurityAudit() {
    console.log('🛡️ STARTING SECURITY AUDIT: Tenant Isolation (RLS)...');
    // 2. Auto-provision Attacker Account
    const TEST_EMAIL = 'joelnaranjocr@gmail.com';
    const TEST_PASSWORD = '123456';
    // Try to sign up first (idempotent-ish)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    });
    // If signup failed (likely already exists), just log it and proceed to login
    if (signUpError) {
        // console.log('ℹ️ User likely exists or signup error:', signUpError.message);
    }
    // Login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    });
    if (authError || !authData.user) {
        console.error('❌ Login failed. Cannot proceed with RLS test.', authError === null || authError === void 0 ? void 0 : authError.message);
        return;
    }
    console.log(`✅ Logged in as Audit User: ${authData.user.id}`);
    // 3. Identify a Target Business (The Victim)
    // We'll try to fetch ANY product that definitely does NOT belong to the attacker.
    // In a real RLS scenario, a simple SELECT * should only return the attacker's items.
    // If we find an item with a different business_id, it's a FAIL.
    const { data: leakedData, error: readError } = await supabase
        .from('products')
        .select('id, business_id, name')
        .limit(100);
    if (readError) {
        console.error('❌ Access Error (Unexpected):', readError);
        return;
    }
    // 4. Verify Isolation
    // We assume the attacker has a specific business_id (fetched from profile)
    const { data: attackerProfile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', authData.user.id)
        .single();
    const attackerBusinessId = attackerProfile === null || attackerProfile === void 0 ? void 0 : attackerProfile.business_id;
    console.log(`ℹ️ Attacker belongs to Business: ${attackerBusinessId}`);
    const leaks = leakedData.filter(item => item.business_id !== attackerBusinessId);
    if (leaks.length > 0) {
        console.error('🚨 [CRITICAL FAIL] SECURITY BREACH DETECTED!');
        console.error('   The attacker managed to read data from other businesses:');
        console.table(leaks);
    }
    else {
        console.log('✅ [PASS] Tenant Isolation Verified.');
        console.log(`   Scanned ${leakedData.length} records. All belong to business ${attackerBusinessId}.`);
    }
}
runSecurityAudit();
