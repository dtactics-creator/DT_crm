import supabase from './db-client.js';

/**
 * Redacts sensitive fields from objects before logging
 */
export function sanitizeAuditData(data) {
  if (!data) return null;
  const sensitiveKeys = ['password', 'password_hash', 'token', 'access_token', 'refresh_token', 'jwt', 'authorization', 'api_key', 'secret', 'private_key', 'credit_card'];
  
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeAuditData(item));
  }

  const sanitized = { ...data };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeAuditData(sanitized[key]);
    }
  }
  return sanitized;
}

/**
 * Creates an audit log entry.
 * @param {Object} req - The Express request object.
 * @param {Object} user - The authenticated user (can be null/undefined for system actions).
 * @param {String} action - The action performed (e.g., CREATE, UPDATE, DELETE, LOGIN).
 * @param {String} module - The application module (e.g., Leads, Projects, Authentication).
 * @param {String} entity - The entity type (e.g., Lead, Project, MasterItem).
 * @param {String} entityId - The ID of the affected entity.
 * @param {String} description - A human-readable description of the action.
 * @param {Object} oldValues - The previous state of the entity (JSON).
 * @param {Object} newValues - The new state of the entity (JSON).
 * @param {String} status - SUCCESS or FAILED.
 * @param {String} errorMessage - Error message if failed.
 */
export async function logAudit({
  req,
  user,
  action,
  module,
  entity = null,
  entityId = null,
  description = null,
  oldValues = null,
  newValues = null,
  status = 'SUCCESS',
  errorMessage = null
}) {
  try {
    const ipAddress = req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || req?.socket?.remoteAddress || req?.ip || null;
    const userAgent = req?.headers?.['user-agent'] || null;
    const httpMethod = req?.method || null;
    const endpoint = req?.originalUrl || req?.url || null;

    // Use provided user, or attempt to extract from req if it has a custom user prop (though typically we pass it directly)
    const actingUser = user || (req && req.user ? req.user : null);

    const logEntry = {
      user_id: actingUser?.employee_id || actingUser?.id || null,
      username: actingUser?.employee_name || actingUser?.email || actingUser?.user_metadata?.name || 'SYSTEM',
      user_email: actingUser?.email || null,
      user_role: actingUser?.role || 'SYSTEM',
      action,
      module,
      entity,
      entity_id: entityId ? String(entityId) : null,
      description,
      old_values: sanitizeAuditData(oldValues),
      new_values: sanitizeAuditData(newValues),
      ip_address: ipAddress,
      user_agent: userAgent,
      http_method: httpMethod,
      endpoint,
      status,
      error_message: errorMessage
    };

    const { error } = await supabase.from('audit_logs').insert(logEntry);
    
    if (error) {
      console.error('Failed to write audit log:', error, logEntry);
    }
  } catch (err) {
    console.error('Unexpected error in logAudit:', err);
  }
}
