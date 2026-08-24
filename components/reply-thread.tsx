'use client'

import { useRef, useState, useTransition } from 'react'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import { createReply, deleteReply, type Reply } from '@/lib/social/reply-actions'
import { Avatar } from '@/components/avatar'

function relativeTime(date: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000))
  return minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.round(minutes / 60)}h` : `${Math.round(minutes / 1440)}d`
}

export function ReplyThread({ postId, replies }: { postId: string; replies: Reply[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  function submit(formData: FormData) {
    startTransition(async () => {
      setError('')
      const result = await createReply(formData)
      if (result.error) setError(result.error)
      else formRef.current?.reset()
    })
  }
  return <div className="mt-2">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-full px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><MessageCircle className="size-4" />{replies.length ? `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}` : 'Reply'}</button>
    {open && <div className="mt-3 border-l-2 border-border pl-4">
      <div className="flex flex-col gap-3">{replies.map((reply) => <div key={reply.id} className="group flex gap-2"><Avatar name={reply.author.display_name} path={reply.author.avatar_path} visible={reply.author.avatar_visible !== false} size="sm" /><div className="min-w-0 flex-1"><p className="text-sm"><a className="font-medium hover:underline" href={`/app/profile/${reply.author.username}`}>{reply.author.display_name}</a><span className="ml-2 text-xs text-muted-foreground">{relativeTime(reply.created_at)}</span></p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{reply.content}</p></div>{reply.author.username && <button type="button" aria-label="Delete reply" onClick={() => startTransition(async () => { await deleteReply(reply.id) })} className="invisible rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive group-hover:visible"><Trash2 className="size-3.5" /></button>}</div>)}</div>
      <form ref={formRef} action={submit} className="mt-4 flex items-center gap-2"><input type="hidden" name="postId" value={postId} /><input name="content" maxLength={1000} required placeholder="Write a reply…" className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none" /><button disabled={pending} aria-label="Send reply" className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4" /></button></form>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>}
  </div>
}
