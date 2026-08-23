import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const now = new Date().toISOString()
  const { data: expired, error: selectError } = await supabase.from('statuses').select('id, image_path').lte('expires_at', now).limit(100)
  if (selectError) return NextResponse.json({ error: 'Could not inspect expired Statuses.' }, { status: 500 })
  let deleted = 0
  let failures = 0
  for (const status of expired ?? []) {
    const storageResult = await supabase.storage.from('statuses').remove([status.image_path])
    if (storageResult.error) { failures += 1; continue }
    const result = await supabase.from('statuses').delete().eq('id', status.id).lte('expires_at', now)
    if (result.error) failures += 1
    else deleted += 1
  }
  return NextResponse.json({ deleted, failures }, { status: failures ? 207 : 200 })
}
