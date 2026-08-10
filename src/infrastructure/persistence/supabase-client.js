/**
 * Supabase Client — satu-satunya titik require('@supabase/supabase-js').
 *
 * ADR-006 D2/D4:
 * - service_role key hanya di environment variable, tidak pernah di-commit.
 * - Hanya file ini yang boleh mengimpor SDK Supabase.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required');
}
if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
