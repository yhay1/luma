import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16"><p className="text-sm text-muted-foreground">luma / private beta</p><h1 className="text-4xl font-semibold tracking-tight">Your circle starts here.</h1><p className="max-w-lg text-muted-foreground">Your account is ready. The feed, Status, and chat surfaces will land here next.</p><p className="text-sm text-muted-foreground">Signed in as {user.email}</p></main>
}
