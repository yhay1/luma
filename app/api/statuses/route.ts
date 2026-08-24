'use server'

import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { allowAction } from '@/lib/social/rate-limit'
import { isUuid } from '@/lib/social/validation'

const MAX_BYTES = 5 * 1024 * 1024
const allowed = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']])

function matchesMagic(type: string, bytes: Uint8Array) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === 'image/png') return bytes.slice(0, 8).every((v, i) => v === [137,80,78,71,13,10,26,10][i])
  if (type === 'image/webp') return new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  return false
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  if (!allowAction(`status:${user.id}`, 10, 60 * 60_000)) return NextResponse.json({ error: 'You have reached the Status limit for now.' }, { status: 429 })
  const form = await request.formData()
  const files = form.getAll('image').filter((value): value is File => value instanceof File && value.size > 0)
  const caption = String(form.get('caption') ?? '').trim()
  const audience = String(form.get('audience') ?? 'everyone')
  if (!['everyone', 'friends', 'selected', 'hidden'].includes(audience)) return NextResponse.json({ error: 'Invalid audience.' }, { status: 400 })
  if (!files.length || files.length > 10) return NextResponse.json({ error: 'Choose between 1 and 10 images.' }, { status: 400 })
  if (caption.length > 280) return NextResponse.json({ error: 'Captions are limited to 280 characters.' }, { status: 400 })
  const uploaded: string[] = []
  try {
    for (const file of files) {
      if (file.size > MAX_BYTES || !allowed.has(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error('Use a JPEG, PNG, or WebP image under 5 MB.')
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (!matchesMagic(file.type, bytes)) throw new Error('That file is not a valid image.')
      const statusId = randomUUID()
      const path = `${user.id}/${statusId}/original.${allowed.get(file.type)}`
      const upload = await supabase.storage.from('statuses').upload(path, bytes, { contentType: file.type, upsert: false })
      if (upload.error) throw new Error('We could not upload that image.')
      uploaded.push(path)
      const { error } = await supabase.rpc('create_status', { p_image_path: path, p_caption: caption || null })
      if (error) throw new Error('We could not create that Status.')
      const { error: audienceError } = await supabase.from('statuses').update({ audience }).eq('image_path', path).eq('author_id', user.id)
      if (audienceError) throw new Error('We could not save Status privacy.')
    }
    return NextResponse.json({ ok: true, count: uploaded.length })
  } catch (error) {
    if (uploaded.length) await supabase.storage.from('statuses').remove(uploaded)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'We could not create that Status.' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  const { id } = await request.json().catch(() => ({}))
  if (!isUuid(id)) return NextResponse.json({ error: 'Status not found.' }, { status: 404 })
  const { data: status } = await supabase.from('statuses').select('image_path').eq('id', id).eq('author_id', user.id).maybeSingle()
  if (!status) return NextResponse.json({ error: 'Status not found.' }, { status: 404 })
  await supabase.storage.from('statuses').remove([status.image_path])
  const { error } = await supabase.from('statuses').delete().eq('id', id).eq('author_id', user.id)
  if (error) return NextResponse.json({ error: 'We could not delete that Status.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
