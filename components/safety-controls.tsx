'use client'

import { useState, useTransition } from 'react'
import { blockUser, reportTarget, unblockUser } from '@/lib/social/safety-actions'

export function SafetyControls({ userId, blocked = false }: { userId: string; blocked?: boolean }) {
  const [isBlocked, setIsBlocked] = useState(blocked)
  const [showReport, setShowReport] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  function toggleBlock() { startTransition(async () => { const result = isBlocked ? await unblockUser(userId) : await blockUser(userId); setMessage(result.error ?? (isBlocked ? 'Member unblocked.' : 'Member blocked.')); if (!result.error) setIsBlocked(!isBlocked) }) }
  function submitReport(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(async () => { const result = await reportTarget('user', userId, String(data.get('reason')), String(data.get('details') ?? '')); setMessage(result.error ?? 'Report submitted.'); if (!result.error) setShowReport(false) }) }
  return <div className="flex flex-col items-end gap-2"><div className="flex gap-2"><button type="button" disabled={pending} onClick={toggleBlock} className="rounded-full border border-border px-3 py-2 text-xs hover:bg-muted">{isBlocked ? 'Unblock' : 'Block'}</button><button type="button" onClick={() => setShowReport((value) => !value)} className="rounded-full border border-border px-3 py-2 text-xs hover:bg-muted">Report</button></div>{showReport && <form onSubmit={submitReport} className="flex w-64 flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-lg"><label className="text-xs font-medium" htmlFor="report-reason">Reason</label><select id="report-reason" name="reason" className="rounded-lg border border-input bg-background px-2 py-2 text-sm" defaultValue="harassment"><option value="harassment">Harassment</option><option value="spam">Spam</option><option value="hate">Hate</option><option value="privacy">Privacy</option><option value="other">Other</option></select><textarea name="details" maxLength={500} placeholder="Optional details" className="rounded-lg border border-input bg-background px-2 py-2 text-sm" /><button disabled={pending} className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Submit report</button></form>}{message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}</div>
}
