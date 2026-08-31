import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission, methodPermission } from './_permissions.js';
import { logAudit } from './_audit.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const perm = req.method === 'GET' ? null : methodPermission('employees', req.method);
  const user = await requirePermission(req, res, perm);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      let q = supabase.from('crm_employees').select('*').is('deleted_at', null);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      // Never leak whether a login exists beyond a boolean-ish hint; strip nothing sensitive here
      // Remove password hashes from API responses
      const safeData = data.map(({ password_hash, ...rest }) => rest);
      return res.status(200).json(safeData);
    }

    if (req.method === 'POST') {
      const payload = validate(req.body);
      const password = validatePassword(req.body.password, true);

      // Create the login account first so we don't create an orphan employee row
      // if the email is already taken.
      await upsertAuthUser(payload.email, password);

      const bcrypt = (await import('bcryptjs')).default;
      payload.password_hash = await bcrypt.hash(password, 10);

      const { data, error } = await supabase.from('crm_employees').insert(payload).select().single();
      if (error) throw error;
      const { password_hash, ...safeData } = data;
      await logAudit({ req, user, action: 'CREATE', module: 'Employees', entity: 'Employee', entityId: data.id, description: `Created employee: ${data.employee_name}`, newValues: safeData });
      return res.status(201).json(safeData);
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Employee id is required');
      const payload = validate(req.body);
      payload.updated_at = new Date().toISOString();

      // If a new password is supplied, create/update the login account.
      const password = validatePassword(req.body.password, false);
      if (password) {
        await upsertAuthUser(payload.email, password);
        const bcrypt = (await import('bcryptjs')).default;
        payload.password_hash = await bcrypt.hash(password, 10);
      }

      const { data: oldData } = await supabase.from('crm_employees').select('*').eq('id', id).single();
      const { data, error } = await supabase.from('crm_employees').update(payload).eq('id', id).select().single();
      if (error) throw error;
      const { password_hash, ...safeData } = data;
      const oldSafeData = oldData ? (() => { const { password_hash, ...rest } = oldData; return rest; })() : null;
      if (oldData) await logAudit({ req, user, action: 'UPDATE', module: 'Employees', entity: 'Employee', entityId: id, description: `Updated employee: ${data.employee_name}`, oldValues: oldSafeData, newValues: safeData });
      return res.status(200).json(safeData);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Employee id is required');
      const { data: oldData } = await supabase.from('crm_employees').select('*').eq('id', id).single();
      const { error } = await supabase.from('crm_employees')
        .update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      if (oldData) await logAudit({ req, user, action: 'DELETE', module: 'Employees', entity: 'Employee', entityId: id, description: `Deleted employee: ${oldData.employee_name}`, oldValues: oldData });
      return res.status(200).json({ ok: true });
    }

    return fail(res, 405, 'Method not allowed');
  } catch (err) {
    const isValidation = /required|valid|must|too long|already|password/i.test(err.message || '');
    return fail(res, isValidation ? 400 : 500, err.message);
  }
}

// Create a Supabase auth account, or update the password if one already exists.
async function upsertAuthUser(email, password) {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!error) return;

  // Already registered -> find the user and update the password instead.
  const already = /already|registered|exists/i.test(error.message || '');
  if (!already) throw new Error(`Could not create login: ${error.message}`);

  const existing = await findAuthUserByEmail(email);
  if (!existing) throw new Error('A login already exists for this email.');
  const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, { password });
  if (updErr) throw new Error(`Could not update login password: ${updErr.message}`);
}

async function findAuthUserByEmail(email) {
  const target = email.toLowerCase();
  // Scan a reasonable number of pages (small team app).
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

function validatePassword(value, required) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error('Password is required (min 6 characters)');
    return null;
  }
  const s = String(value);
  if (s.length < 6) throw new Error('Password must be at least 6 characters');
  if (s.length > 72) throw new Error('Password is too long');
  return s;
}

function validate(body) {
  return {
    employee_name: V.str(body.employee_name, { field: 'Employee name', required: true, min: 2 }),
    role: V.str(body.role, { field: 'Role', required: true }),
    phone: V.str(body.phone, { field: 'Phone', max: 40 }),
    email: V.email(body.email, { field: 'Email', required: true }),
    status: V.str(body.status, { field: 'Status' }) || 'active',
  };
}
