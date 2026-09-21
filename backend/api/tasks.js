import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission, methodPermission, getEffectivePermissions } from './_permissions.js';
import { employeeMap, nextTaskNo } from './_join.js';
import { logAudit } from './_audit.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, methodPermission('tasks', req.method));
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { id, project_id, assigned_employee_id, status, priority, module: taskModule, scope } = req.query || {};
      const { isAdmin, employee } = await getEffectivePermissions(user);

      if (id) {
        const { data: task, error } = await supabase
          .from('dt_tasks')
          .select('*, project:project_id(id, project_no, project_name, client, client_id), updates:dt_task_updates(*)')
          .eq('id', id)
          .is('deleted_at', null)
          .single();

        if (error) throw error;
        const emps = await employeeMap();
        return res.status(200).json(enrichTask(task, emps));
      }

      let q = supabase
        .from('dt_tasks')
        .select('*, project:project_id(id, project_no, project_name, client, client_id), updates:dt_task_updates(*)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (project_id) q = q.eq('project_id', project_id);
      if (assigned_employee_id) q = q.eq('assigned_employee_id', assigned_employee_id);
      if (status) q = q.eq('status', status);
      if (priority) q = q.eq('priority', priority);
      if (taskModule) q = q.eq('module', taskModule);

      if (scope === 'my_tasks' && employee?.id) {
        q = q.eq('assigned_employee_id', employee.id);
      }

      const [{ data, error }, emps] = await Promise.all([q, employeeMap()]);
      if (error) throw error;

      let rows = data || [];
      if (scope === 'team_tasks' && !isAdmin && employee?.id) {
        rows = rows.filter(t => t.assigned_employee_id && t.assigned_employee_id !== employee.id);
      }

      return res.status(200).json(rows.map(t => enrichTask(t, emps)));
    }

    if (req.method === 'POST') {
      const payload = validate(req.body);
      if (!payload.task_no) payload.task_no = await nextTaskNo();

      // Ensure project exists
      const { data: proj, error: projErr } = await supabase
        .from('dt_projects')
        .select('id, project_name')
        .eq('id', payload.project_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (projErr || !proj) return fail(res, 400, 'Invalid project reference');

      if (payload.status === 'completed' && !payload.completed_at) {
        payload.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase.from('dt_tasks').insert(payload).select().single();
      if (error) throw error;

      // Automatically record an initial creation task update
      await supabase.from('dt_task_updates').insert([{
        task_id: data.id,
        employee_id: user.employee_id || null,
        update_note: `Task created and assigned.`,
        status_from: null,
        status_to: data.status,
      }]);

      await logAudit({ req, user, action: 'CREATE', module: 'Tasks', entity: 'Task', entityId: data.id, description: `Created task: ${data.title} (${data.task_no})`, newValues: data });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Task id is required');

      const payload = validate(req.body);
      payload.updated_at = new Date().toISOString();

      const { data: oldData } = await supabase.from('dt_tasks').select('*').eq('id', id).single();
      if (!oldData) return fail(res, 404, 'Task not found');

      if (payload.status === 'completed' && oldData.status !== 'completed') {
        payload.completed_at = new Date().toISOString();
      } else if (payload.status !== 'completed') {
        payload.completed_at = null;
      }

      const { data, error } = await supabase.from('dt_tasks').update(payload).eq('id', id).select().single();
      if (error) throw error;

      // Log status transition in updates if changed
      if (oldData.status !== data.status || oldData.assigned_employee_id !== data.assigned_employee_id) {
        let note = `Updated task.`;
        if (oldData.status !== data.status) note = `Status updated from ${oldData.status} to ${data.status}.`;
        await supabase.from('dt_task_updates').insert([{
          task_id: data.id,
          employee_id: user.employee_id || null,
          update_note: note,
          status_from: oldData.status,
          status_to: data.status,
        }]);
      }

      await logAudit({ req, user, action: 'UPDATE', module: 'Tasks', entity: 'Task', entityId: id, description: `Updated task: ${data.title}`, oldValues: oldData, newValues: data });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Task id is required');

      const { data: oldData } = await supabase.from('dt_tasks').select('*').eq('id', id).single();
      const { error } = await supabase.from('dt_tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;

      if (oldData) await logAudit({ req, user, action: 'DELETE', module: 'Tasks', entity: 'Task', entityId: id, description: `Deleted task: ${oldData.title}`, oldValues: oldData });
      return res.status(200).json({ ok: true });
    }

    return fail(res, 405, 'Method not allowed');
  } catch (err) {
    const isValidation = /required|valid|must|too long/i.test(err.message || '');
    return fail(res, isValidation ? 400 : 500, err.message);
  }
}

function enrichTask(t, emps) {
  return {
    ...t,
    assigned_employee: t.assigned_employee_id ? emps[t.assigned_employee_id] || null : null,
  };
}

function validate(body) {
  return {
    task_no: V.str(body.task_no, { field: 'Task No', max: 40 }),
    project_id: V.uuid(body.project_id, { required: true }),
    title: V.str(body.title, { field: 'Title', required: true, min: 2 }),
    description: V.str(body.description, { field: 'Description', max: 4000 }),
    module: V.str(body.module, { field: 'Module' }),
    assigned_employee_id: V.uuid(body.assigned_employee_id),
    status: V.str(body.status, { field: 'Status' }) || 'assigned',
    priority: V.str(body.priority, { field: 'Priority' }) || 'medium',
    start_date: V.date(body.start_date, { field: 'Start date' }),
    due_date: V.date(body.due_date, { field: 'Due date' }),
    estimated_hours: V.num(body.estimated_hours, { field: 'Estimated hours', min: 0, def: 0 }),
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    additional_notes: V.str(body.additional_notes, { field: 'Additional notes', max: 4000 }),
  };
}
