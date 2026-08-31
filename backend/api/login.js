import bcrypt from 'bcryptjs';
import { V, fail } from './_lib.js';
import supabase from './db-client.js';
import { logAudit } from './_audit.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return fail(res, 405, 'Method not allowed');
  }

  try {
    const email = V.email(req.body?.email, { required: true });
    const password = V.str(req.body?.password, { required: true });

    // Find the employee by email
    const { data: employee, error } = await supabase
      .from('crm_employees')
      .select('id, email, password_hash, status, employee_name, role')
      .eq('email', email)
      .is('deleted_at', null)
      .single();

    if (error || !employee) {
      console.error('DB query error:', error, 'Employee:', employee);
      await logAudit({ req, user: { email }, action: 'LOGIN_FAILED', module: 'Authentication', description: 'Invalid credentials or user not found', status: 'FAILED' });
      return fail(res, 401, 'Invalid credentials.');
    }

    if (employee.status !== 'active') {
      await logAudit({ req, user: employee, action: 'LOGIN_FAILED', module: 'Authentication', description: 'Account is inactive', status: 'FAILED' });
      return fail(res, 403, 'Account is inactive. Please contact your administrator.');
    }

    if (!employee.password_hash) {
      await logAudit({ req, user: employee, action: 'LOGIN_FAILED', module: 'Authentication', description: 'No password hash set', status: 'FAILED' });
      return fail(res, 401, 'Invalid credentials.');
    }

    // Verify password hash
    const isValid = await bcrypt.compare(password, employee.password_hash);
    if (!isValid) {
      console.error('Bcrypt compare failed.');
      await logAudit({ req, user: employee, action: 'LOGIN_FAILED', module: 'Authentication', description: 'Invalid password', status: 'FAILED' });
      return fail(res, 401, 'Invalid credentials.');
    }

    // Password matches our DB hash. 
    // Now ensure the user exists in Supabase Auth with this exact password so the frontend can log in.
    await upsertAuthUser(email, password);

    // Return success.
    // The frontend will then proceed to authenticate with Supabase Auth to get the actual session token.
    await logAudit({ req, user: employee, action: 'LOGIN', module: 'Authentication', description: 'User successfully authenticated via password' });
    return res.status(200).json({ success: true });
  } catch (err) {
    await logAudit({ req, user: null, action: 'LOGIN_FAILED', module: 'Authentication', description: 'Unexpected error during login', status: 'FAILED', errorMessage: err.message });
    return fail(res, 400, err.message);
  }
}

// Ensure the user exists in Supabase Auth, or update their password to match
async function upsertAuthUser(email, password) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (!error) return;

    // Already registered -> update the password
    const errMessage = error?.message || error?.error_description || (typeof error === 'string' ? error : '') || '';
    const already = /already|registered|exists/i.test(errMessage);
    if (already) {
      const existing = await findAuthUserByEmail(email);
      if (existing?.id) {
        await supabase.auth.admin.updateUserById(existing.id, { password });
      }
    }
  } catch (err) {
    console.error('Error in upsertAuthUser:', err);
  }
}

async function findAuthUserByEmail(email) {
  try {
    const target = (email || '').toLowerCase();
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const users = data?.users || [];
      const match = users.find((u) => (u.email || '').toLowerCase() === target);
      if (match) return match;
      if (users.length < 200) break;
    }
  } catch (err) {
    console.error('Error in findAuthUserByEmail:', err);
  }
  return null;
}
