import { supabaseAdmin } from '../db/supabaseAdmin';

interface AuditLogEntry {
  admin_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert(entry);
    if (error) {
      console.error('Failed to write audit log:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return false;
  }
}
