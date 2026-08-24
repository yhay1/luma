'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageCircle, Search, Send, Users, MoreVertical } from 'lucide-react'
import { Avatar } from '@/components/avatar'
import { createClient } from '@/lib/supabase/client'
import { createGroup, markConversationRead, sendMessage, startConversation } from '@/lib/social/chat-actions'

type Conversation = { conversationId: string; userId: string; username: string; displayName: string; avatarPath?: string | null }
type Message = { id: string; conversation_id: string; sender_id: string; content: string; created_at: string }

export function MessagesClient({ currentUserId, conversations, initialUserId }: { currentUserId: string; conversations: Conversation[]; initialUserId?: string }) {
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [query, setQuery] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [groupName, setGroupName] = useState('')
  const [showGroup, setShowGroup] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const filtered = useMemo(() => conversations.filter((item) => `${item.displayName} ${item.username}`.toLowerCase().includes(query.toLowerCase())), [conversations, query])
  useEffect(() => { if (initialUserId) { const target = conversations.find((item) => item.userId === initialUserId); if (target) openChat(target) } }, [initialUserId, conversations])

  async function openChat(item: Conversation) {
    setError('')
    router.push(`/app/messages?user=${encodeURIComponent(item.userId)}`, { scroll: false })
    if (item.conversationId) {
      setSelected(item)
      return
    }
    startTransition(async () => {
      try {
        const result = await startConversation(item.userId)
        if (!result.conversationId) {
          setError(result.error ?? 'Unable to start conversation.')
          return
        }
        setSelected({ ...item, conversationId: result.conversationId })
      } catch {
        setError('Unable to open this conversation. Please try again.')
      }
    })
  }

  useEffect(() => {
    if (!selected?.conversationId) { setMessages([]); return }
    const supabase = createClient(); let alive = true; let channel: ReturnType<typeof supabase.channel> | null = null
    const load = async () => { const { data } = await supabase.from('messages').select('id, conversation_id, sender_id, content, created_at').eq('conversation_id', selected.conversationId).order('created_at', { ascending: true }).limit(200); if (alive) setMessages(data ?? []); await markConversationRead(selected.conversationId) }
    const syncRealtime = () => { if (document.hidden || channel) return; channel = supabase.channel(`messages:${selected.conversationId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selected.conversationId}` }, (payload) => setMessages((current) => current.some((item) => item.id === payload.new.id) ? current : [...current, payload.new as Message])).subscribe() }
    const onVisibility = () => { if (!document.hidden) { syncRealtime(); load() } else if (channel) { supabase.removeChannel(channel); channel = null } }
    load(); syncRealtime(); document.addEventListener('visibilitychange', onVisibility)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisibility); if (channel) supabase.removeChannel(channel) }
  }, [selected?.conversationId])

  function submit(event: React.FormEvent) {
    event.preventDefault(); if (!text.trim() || pending || !selected?.conversationId) return
    const content = text.trim(); const optimistic: Message = { id: `temp-${Date.now()}`, conversation_id: selected.conversationId, sender_id: currentUserId, content, created_at: new Date().toISOString() }
    setMessages((current) => [...current, optimistic]); setText('')
    startTransition(async () => { const result = await sendMessage(selected.conversationId, content); if (result.error) { setMessages((current) => current.filter((item) => item.id !== optimistic.id)); setError(result.error) } })
  }

  return <main className="min-h-screen bg-background text-foreground"><header className="border-b border-border"><div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4"><a href="/app" className="font-serif text-2xl">luma</a><span className="text-muted-foreground">/ messages</span></div></header><div className="mx-auto flex h-[calc(100vh-73px)] max-w-5xl overflow-hidden md:p-4"><aside className={`${selected ? 'hidden md:flex' : 'flex'} w-full flex-col border-border md:w-80 md:rounded-2xl md:border`}><div className="border-b border-border p-4"><div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Chats</h1><button type="button" onClick={() => setShowGroup(true)} className="rounded-full p-2 hover:bg-muted" aria-label="Create group chat"><Users className="size-5" /></button></div>{showGroup && <form className="mt-4 flex flex-col gap-2 rounded-xl border border-border p-3" onSubmit={(event) => { event.preventDefault(); startTransition(async () => { const result = await createGroup(groupName, []); if (result.error) setError(result.error); else { setGroupName(''); setShowGroup(false); router.push(`/app/messages?conversation=${result.conversationId}`) } }) }}><label htmlFor="group-name" className="text-sm font-medium">New group</label><input id="group-name" value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name" className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm" /><p className="text-xs text-muted-foreground">Open a profile and add members from the group details.</p><button className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Create group</button></form>}<label className="mt-4 flex items-center gap-2 rounded-full border border-border px-3 py-2"><Search className="size-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people" aria-label="Search people" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div>{error && <p role="alert" className="border-b border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</p>}<div className="overflow-y-auto">{filtered.map((item) => <button type="button" key={item.userId} onClick={() => openChat(item)} disabled={pending} className="flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left hover:bg-muted/50 disabled:opacity-60"><Avatar name={item.displayName} path={item.avatarPath} size="md" /><span className="min-w-0"><span className="block truncate font-medium">{item.displayName}</span><span className="block truncate text-sm text-muted-foreground">@{item.username}</span></span></button>)}</div></aside><section className={`${selected ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col md:ml-4 md:rounded-2xl md:border md:border-border`}>{selected ? <><div className="flex items-center gap-3 border-b border-border px-4 py-3"><button onClick={() => setSelected(null)} className="rounded-full p-2 hover:bg-muted md:hidden" aria-label="Back to chats"><ArrowLeft className="size-5" /></button><Avatar name={selected.displayName} path={selected.avatarPath} /><div><p className="font-semibold">{selected.displayName}</p><p className="text-sm text-muted-foreground">@{selected.username}</p></div></div><div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-muted/20 px-4 py-5">{messages.length ? messages.map((message) => <div key={message.id} className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-sm ${message.sender_id === currentUserId ? 'self-end bg-primary text-primary-foreground' : 'self-start bg-card'}`}><p>{message.content}</p><time className="mt-1 block text-[10px] opacity-60">{new Date(message.created_at).toLocaleString()}</time></div>) : <div className="m-auto text-center text-sm text-muted-foreground"><MessageCircle className="mx-auto mb-2 size-7" />No messages yet. Say hello.</div>}</div>{error && <p role="alert" className="px-4 py-2 text-sm text-destructive">{error}</p>}<form onSubmit={submit} className="flex gap-2 border-t border-border p-3"><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Type a message" aria-label="Message" maxLength={2000} className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm outline-none" /><button disabled={pending || !text.trim()} aria-label="Send message" className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4" /></button></form></> : <div className="m-auto hidden text-center text-muted-foreground md:block"><MessageCircle className="mx-auto mb-3 size-10" /><p className="font-medium text-foreground">Select a chat</p><p className="text-sm">Choose someone to start messaging.</p></div>}</section></div></main>
}
