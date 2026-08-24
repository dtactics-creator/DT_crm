import { config } from 'dotenv';
config({ path: './backend/.env' });
import supabase from './backend/api/db-client.js';

async function fixAuditLogs() {
  const { data: employees } = await supabase.from('crm_employees').select('id, employee_name, email');
  
  if (!employees) {
    console.log("No employees found.");
    return;
  }

  const { data: logs } = await supabase.from('audit_logs').select('id, user_email, username').like('username', '%@%');
  
  if (!logs) {
    console.log("No logs to fix.");
    return;
  }

  let count = 0;
  for (const log of logs) {
    const emp = employees.find(e => e.email === log.username || e.email === log.user_email);
    if (emp && emp.employee_name) {
      await supabase.from('audit_logs').update({ username: emp.employee_name }).eq('id', log.id);
      count++;
    }
  }
  
  console.log(`Fixed ${count} audit logs.`);
}

fixAuditLogs();
