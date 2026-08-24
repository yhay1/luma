import { cn } from '@/lib/utils'

type AvatarProps = { name?: string | null; path?: string | null; visible?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string }

export function Avatar({ name, path, visible = true, size = 'md', className }: AvatarProps) {
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-20 text-2xl' }
  const initial = name?.trim().charAt(0).toUpperCase() || '?'
  const imageUrl = path?.startsWith('http') ? path : path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path.split('/').map(encodeURIComponent).join('/')}` : null
  return <span className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-muted font-semibold text-foreground', sizes[size], className)}>{imageUrl && visible ? <img src={imageUrl} alt={`${name ?? 'User'} avatar`} className="size-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : initial}</span>
}
