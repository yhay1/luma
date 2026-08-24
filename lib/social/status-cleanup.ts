import type { SupabaseClient } from '@supabase/supabase-js'

type CleanupClient = Pick<SupabaseClient, 'from' | 'storage'>

export async function cleanupExpiredStatuses(supabase: CleanupClient) {
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('statuses')
    .select('id, image_path')
    .lte('expires_at', now)
    .order('expires_at', { ascending: true })
    .limit(100)

  const statuses = data ?? []
  const paths = statuses.map((status) => status.image_path)
  if (paths.length) {
    const storageResult = await supabase.storage.from('statuses').remove(paths)
    if (!storageResult.error) await supabase.from('statuses').delete().in('id', statuses.map((status) => status.id)).lte('expires_at', now)
  }
}
