import bcrypt from 'bcryptjs';
import { V, fail } from './_lib.js';
import supabase from './db-client.js';

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
      .select('id, email, password_hash, status')
      .eq('email', email)
      .single();

    if (error || !employee) {
      console.error('DB query error:', error, 'Employee:', employee);
      return fail(res, 401, 'Invalid credentials.');
    }

    if (employee.status !== 'active') {
      return fail(res, 403, 'Account is inactive. Please contact your administrator.');
    }

    if (!employee.password_hash) {
      return fail(res, 401, 'Invalid credentials.');
    }

    // Verify password hash
    const isValid = await bcrypt.compare(password, employee.password_hash);
    if (!isValid) {
      console.error('Bcrypt compare failed.');
      return fail(res, 401, 'Invalid credentials.');
    }

    // Password matches our DB hash. 
    // Now ensure the user exists in Supabase Auth with this exact password so the frontend can log in.
    await upsertAuthUser(email, password);

    // Return success.
    // The frontend will then proceed to authenticate with Supabase Auth to get the actual session token.
    return res.status(200).json({ success: true });
  } catch (err) {
    return fail(res, 400, err.message);
  }
}

// Ensure the user exists in Supabase Auth, or update their password to match
async function upsertAuthUser(email, password) {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!error) return;

  // Already registered -> update the password
  const already = /already|registered|exists/i.test(error.message || '');
  if (already) {
    const existing = await findAuthUserByEmail(email);
    if (existing) {
      await supabase.auth.admin.updateUserById(existing.id, { password });
    }
  }
}

async function findAuthUserByEmail(email) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const users = data?.users || [];
    const match = users.find((u) => (u.email || '').toLowerCase() === target);
    if (match) return match;
    if (users.length < 200) break;
  }
  return null;
}
