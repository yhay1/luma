import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listModerationReports } from '@/lib/social/safety-actions'
import { ModerationQueue } from '@/components/moderation-queue'

export default async function ModerationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  if (!user.app_metadata?.is_admin) redirect('/app')
  const result = await listModerationReports()
  return <main className="mx-auto min-h-screen max-w-4xl px-4 py-8"><a href="/app" className="text-sm text-muted-foreground">Back to feed</a><h1 className="mt-6 font-serif text-4xl">Moderation queue</h1><p className="mt-2 text-sm text-muted-foreground">Review community reports using your verified admin role.</p><ModerationQueue reports={result.reports} /></main>
}
