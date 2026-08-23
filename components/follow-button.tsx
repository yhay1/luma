'use client'

import { useState, useTransition } from 'react'
import { toggleFollow } from '@/lib/social/actions'

export function FollowButton({ userId, initialFollowing }: { userId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, startTransition] = useTransition()
  return <button disabled={pending} onClick={() => startTransition(async () => { const next = !following; setFollowing(next); const result = await toggleFollow(userId, following); if (result.error) setFollowing(!next) })} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending ? 'Saving…' : following ? 'Following' : 'Follow'}</button>
}
