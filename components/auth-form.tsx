'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, authRedirectUrl } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const isSignup = mode === 'signup'

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setPending(true)
    const supabase = createClient()
    const result = isSignup
      ? await supabase.auth.signUp({ email: form.email.trim(), password: form.password, options: { emailRedirectTo: authRedirectUrl(), data: { username: form.username.trim().toLowerCase(), display_name: form.displayName.trim() } } })
      : await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
    setPending(false)
    if (result.error) { setError(result.error.message.toLowerCase().includes('confirm') ? 'Check your email to confirm your account.' : 'Invalid email or password.'); return }
    if (isSignup) setMessage('Check your email to confirm your account.')
    else router.push('/app')
  }

  return <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4">
    {isSignup && <><input required minLength={3} maxLength={24} pattern="[a-z0-9_]+" placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="rounded-lg border bg-background px-4 py-3" /><input required maxLength={80} placeholder="Display name" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className="rounded-lg border bg-background px-4 py-3" /></>}
    <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="rounded-lg border bg-background px-4 py-3" />
    <input required minLength={8} type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="rounded-lg border bg-background px-4 py-3" />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    <button disabled={pending} className="rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-60">{pending ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}</button>
  </form>
}
