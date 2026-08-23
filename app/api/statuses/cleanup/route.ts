import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: expired } = await supabase.from('statuses').select('id, image_path').lte('expires_at', new Date().toISOString()).limit(100)
  for (const status of expired ?? []) {
    await supabase.storage.from('statuses').remove([status.image_path])
    await supabase.from('statuses').delete().eq('id', status.id).lte('expires_at', new Date().toISOString())
  }
  return NextResponse.json({ deleted: expired?.length ?? 0 })
}
