import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  if (process.env.CRON_SECRET) {
    const authorization = request.headers.get('authorization')
    if (authorization !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const now = new Date().toISOString()
  const { data: expired, error: selectError } = await supabase.from('statuses').select('id, image_path').lte('expires_at', now).order('expires_at', { ascending: true }).limit(100)
  if (selectError) return NextResponse.json({ error: 'Could not inspect expired Statuses.' }, { status: 500 })
  let deleted = 0
  let failures = 0
  const statuses = expired ?? []
  if (statuses.length) {
    const storageResult = await supabase.storage.from('statuses').remove(statuses.map((status) => status.image_path))
    if (storageResult.error) failures = statuses.length
    else {
      const result = await supabase.from('statuses').delete().in('id', statuses.map((status) => status.id)).lte('expires_at', now)
      if (result.error) failures = statuses.length
      else deleted = statuses.length
    }
  }
  return NextResponse.json({ deleted, failures }, { status: failures ? 207 : 200 })
}
