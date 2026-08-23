import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from '@/components/settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/app/settings')
  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase.from('profiles').select('username, display_name, bio').eq('id', user.id).maybeSingle(),
    supabase.from('notification_preferences').select('likes, follows, messages').eq('user_id', user.id).maybeSingle(),
  ])
  return <SettingsClient profile={profile} email={user.email ?? ''} preferences={preferences} />
}
