'use server'

import { createClient } from '@/lib/supabase/server'

export async function recordStatusView(statusId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in first.' }
  const { error } = await supabase.from('status_views').upsert({ status_id: statusId, viewer_id: user.id }, { onConflict: 'status_id,viewer_id', ignoreDuplicates: true })
  return error ? { error: 'View could not be recorded.' } : { ok: true }
}
