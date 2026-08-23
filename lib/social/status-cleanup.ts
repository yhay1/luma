import type { SupabaseClient } from '@supabase/supabase-js'

type CleanupClient = Pick<SupabaseClient, 'from' | 'storage'>

export async function cleanupExpiredStatuses(supabase: CleanupClient) {
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('statuses')
    .select('id, image_path')
    .lte('expires_at', now)
    .limit(25)

  for (const status of data ?? []) {
    const storageResult = await supabase.storage.from('statuses').remove([status.image_path])
    if (storageResult.error) continue
    await supabase.from('statuses').delete().eq('id', status.id).lte('expires_at', now)
  }
}
