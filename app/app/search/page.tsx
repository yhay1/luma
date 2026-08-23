import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SearchClient } from '@/components/search-client'

export default async function SearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/app/search')
  return <SearchClient />
}
