import { supabase } from './supabase';

export interface ActivityLog {
  id: string;
  action: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function logActivity(userId: string, action: string, description?: string, metadata?: Record<string, unknown>): Promise<void> {
  await supabase.from('user_activity').insert({
    user_id: userId,
    action,
    description: description ?? null,
    metadata: metadata ?? null,
  });
}

export async function fetchActivity(userId: string, limit = 20): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('user_activity')
    .select('id, action, description, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as ActivityLog[];
}
