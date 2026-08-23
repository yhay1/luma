'use server'

import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'

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
  const form = await request.formData()
  const file = form.get('image')
  const caption = String(form.get('caption') ?? '').trim()
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Choose an image to share.' }, { status: 400 })
  if (file.size > MAX_BYTES || !allowed.has(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name)) return NextResponse.json({ error: 'Use a JPEG, PNG, or WebP image under 5 MB.' }, { status: 400 })
  if (caption.length > 280) return NextResponse.json({ error: 'Captions are limited to 280 characters.' }, { status: 400 })
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!matchesMagic(file.type, bytes)) return NextResponse.json({ error: 'That file is not a valid image.' }, { status: 400 })
  const statusId = randomUUID()
  const path = `${user.id}/${statusId}/original.${allowed.get(file.type)}`
  const upload = await supabase.storage.from('statuses').upload(path, bytes, { contentType: file.type, upsert: false })
  if (upload.error) return NextResponse.json({ error: 'We could not upload that image.' }, { status: 500 })
  const { error } = await supabase.rpc('create_status', { p_image_path: path, p_caption: caption || null })
  if (error) {
    await supabase.storage.from('statuses').remove([path])
    return NextResponse.json({ error: 'We could not create that Status.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  const { id } = await request.json()
  const { data: status } = await supabase.from('statuses').select('image_path').eq('id', id).eq('author_id', user.id).maybeSingle()
  if (!status) return NextResponse.json({ error: 'Status not found.' }, { status: 404 })
  await supabase.storage.from('statuses').remove([status.image_path])
  const { error } = await supabase.from('statuses').delete().eq('id', id).eq('author_id', user.id)
  if (error) return NextResponse.json({ error: 'We could not delete that Status.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
