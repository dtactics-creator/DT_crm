import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ifaqiafzqohtrgapdfvs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmYXFpYWZ6cW9odHJnYXBkZnZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQyODUzNCwiZXhwIjoyMTAyMDA0NTM0fQ.B63YX2CAgOLF25wz6R4Zq_3ruKfRPtENjJuWNODF3h4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = 'demo@dtactics.io';
  const password = 'dtactics2025';

  try {
    // 1. Create auth user
    console.log('Creating demo@dtactics.io in Supabase Auth...');
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });
    
    if (authErr && !authErr.message.includes('already registered')) {
        console.error('Auth User creation error:', authErr.message);
    } else {
        console.log('Auth user ready!');
    }

    // 2. Ensure Super Admin role exists
    let { data: role } = await supabase.from('dt_roles2').select('*').eq('name', 'Super Admin').is('deleted_at', null).single();
    if (!role) {
      console.log('Creating Super Admin role...');
      const { data: newRole, error } = await supabase.from('dt_roles2').insert({ name: 'Super Admin', type: 'sales' }).select().single();
      if (error) throw new Error('Role creation failed: ' + error.message);
      role = newRole;
    }

    // 3. Ensure * permission exists
    const { data: perm } = await supabase.from('dt_role_permissions').select('*').eq('role_id', role.id).eq('permission', '*').single();
    if (!perm) {
      console.log('Granting * permission to Super Admin role...');
      await supabase.from('dt_role_permissions').insert({ role_id: role.id, permission: '*' });
    }

    // 4. Check if employee exists
    const { data: emp } = await supabase.from('crm_employees').select('*').eq('email', email).is('deleted_at', null).single();
    if (emp) {
      const { error } = await supabase.from('crm_employees').update({ role: 'Super Admin', is_manager: true }).eq('id', emp.id);
      if (error) throw new Error('Failed to update employee: ' + error.message);
      console.log(`Updated existing employee (${emp.id}) to Super Admin.`);
    } else {
      console.log('Creating new employee record for demo@dtactics.io...');
      const { error } = await supabase.from('crm_employees').insert({
        employee_name: 'Demo Admin',
        email: email,
        role: 'Super Admin',
        status: 'active',
        is_manager: true
      });
      if (error) throw new Error('Failed to create employee: ' + error.message);
      console.log('Created employee record with Super Admin role.');
    }

    console.log('Successfully created demo@dtactics.io as super admin!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
