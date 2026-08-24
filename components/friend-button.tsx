'use client'

import { useState, useTransition } from 'react'
import { sendFriendRequest, removeFriend } from '@/lib/social/actions'

export function FriendButton({ userId, friendshipId, initialStatus }: { userId: string; friendshipId?: string | null; initialStatus?: 'pending' | 'accepted' | null }) {
  const [status, setStatus] = useState(initialStatus ?? null)
  const [id, setId] = useState(friendshipId)
  const [pending, startTransition] = useTransition()
  function handleClick() {
    startTransition(async () => {
      if (status === 'accepted' && id) { const result = await removeFriend(id); if (!result.error) { setStatus(null); setId(undefined) }; return }
      const result = await sendFriendRequest(userId)
      if (!result.error) setStatus('pending')
    })
  }
  return <button type="button" disabled={pending} onClick={handleClick} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">{pending ? 'Saving…' : status === 'accepted' ? 'Friends' : status === 'pending' ? 'Requested' : 'Add friend'}</button>
}
