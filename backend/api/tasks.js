import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission, methodPermission, getEffectivePermissions } from './_permissions.js';
import { employeeMap, nextTaskNo } from './_join.js';
import { logAudit } from './_audit.js';
import { fetchTasks, insertTask, updateTaskRecord, deleteTaskRecord, insertTaskUpdate } from './_tasks_db.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, methodPermission('tasks', req.method));
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { id, project_id, assigned_employee_id, status, priority, module: taskModule, scope } = req.query || {};
      const { isAdmin, employee } = await getEffectivePermissions(user);

      const employeeId = employee?.id || null;

      if (id) {
        const [{ data: task }, emps] = await Promise.all([
          fetchTasks({ id }),
          employeeMap()
        ]);

        if (!task) return fail(res, 404, 'Task not found');
        return res.status(200).json(enrichTask(task, emps));
      }

      const [{ data }, emps] = await Promise.all([
        fetchTasks({ project_id, assigned_employee_id, status, priority, module: taskModule, scope, employeeId, isAdmin }),
        employeeMap()
      ]);

      let rows = data || [];
      if (scope === 'team_tasks' && !isAdmin && employeeId) {
        rows = rows.filter(t => t.assigned_employee_id && t.assigned_employee_id !== employeeId);
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

      const data = await insertTask(payload);

      // Automatically record an initial creation task update
      await insertTaskUpdate({
        task_id: data.id,
        employee_id: user.employee_id || null,
        update_note: `Task created and assigned.`,
        status_from: null,
        status_to: data.status,
      });

      await logAudit({ req, user, action: 'CREATE', module: 'Tasks', entity: 'Task', entityId: data.id, description: `Created task: ${data.title} (${data.task_no})`, newValues: data });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Task id is required');

      const payload = validate(req.body);
      payload.updated_at = new Date().toISOString();

      const { data: oldData } = await fetchTasks({ id });
      if (!oldData) return fail(res, 404, 'Task not found');

      if (payload.status === 'completed' && oldData.status !== 'completed') {
        payload.completed_at = new Date().toISOString();
      } else if (payload.status !== 'completed') {
        payload.completed_at = null;
      }

      const data = await updateTaskRecord(id, payload);

      // Log status transition in updates if changed
      if (oldData.status !== data.status || oldData.assigned_employee_id !== data.assigned_employee_id) {
        let note = `Updated task.`;
        if (oldData.status !== data.status) note = `Status updated from ${oldData.status} to ${data.status}.`;
        await insertTaskUpdate({
          task_id: data.id,
          employee_id: user.employee_id || null,
          update_note: note,
          status_from: oldData.status,
          status_to: data.status,
        });
      }

      await logAudit({ req, user, action: 'UPDATE', module: 'Tasks', entity: 'Task', entityId: id, description: `Updated task: ${data.title}`, oldValues: oldData, newValues: data });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Task id is required');

      const { data: oldData } = await fetchTasks({ id });
      await deleteTaskRecord(id);

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

