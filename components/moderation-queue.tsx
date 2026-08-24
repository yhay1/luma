'use client'

import { useState, useTransition } from 'react'
import { resolveReport } from '@/lib/social/safety-actions'

type Report = { id: string; target_type: string; target_id: string; reason: string; details: string | null; status: string; created_at: string }

export function ModerationQueue({ reports }: { reports: Report[] }) {
  const [items, setItems] = useState(reports)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  function resolve(id: string, status: 'resolved' | 'dismissed') { startTransition(async () => { const result = await resolveReport(id, status); setMessage(result.error ?? 'Report updated.'); if (!result.error) setItems((current) => current.filter((item) => item.id !== id)) }) }
  return <section className="mt-8 flex flex-col gap-3" aria-label="Open reports">{message && <p role="status" className="rounded-xl bg-muted p-3 text-sm">{message}</p>}{items.length ? items.map((report) => <article key={report.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">{report.target_type} · {report.reason}</p><p className="mt-2 break-all text-sm">Target: {report.target_id}</p>{report.details && <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.details}</p>}</div><time className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString()}</time></div><div className="mt-4 flex gap-2"><button disabled={pending} onClick={() => resolve(report.id, 'resolved')} className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Resolve</button><button disabled={pending} onClick={() => resolve(report.id, 'dismissed')} className="rounded-lg border border-border px-3 py-2 text-sm">Dismiss</button></div></article>) : <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No open reports.</p>}</section>
}
