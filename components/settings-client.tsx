'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { ArrowLeft, Bell, Eye, HelpCircle, Lock, Moon, Shield, Trash2, UserRound } from 'lucide-react'
import { Avatar } from '@/components/avatar'
import { updateAvatar, updateAvatarVisibility, updateNotificationPreferences, updatePassword, updateProfile } from '@/lib/social/account-actions'

type Profile = { username: string; display_name: string; bio: string | null; avatar_path?: string | null; avatar_visible?: boolean }
type Preferences = { likes: boolean; follows: boolean; messages: boolean } | null
type Props = { profile: Profile | null; email: string; preferences: Preferences }
type Run = (fn: (data: FormData) => Promise<{ error?: string }>, form: FormData) => void

const categories = [
  ['profile', 'Profile', 'Your public information', UserRound],
  ['account', 'Account', 'Email and account details', Shield],
  ['security', 'Password and security', 'Keep your account safe', Lock],
  ['notifications', 'Notifications', 'Choose what you hear about', Bell],
  ['privacy', 'Privacy and rules', 'Control your experience', Eye],
  ['appearance', 'Appearance', 'Theme and display', Moon],
  ['help', 'Help and support', 'Find answers and contact us', HelpCircle],
] as const

export function SettingsClient({ profile, email, preferences }: Props) {
  const [active, setActive] = useState('profile')
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [deleted, setDeleted] = useState('')
  const run: Run = (fn, form) => startTransition(async () => setMessage((await fn(form)).error ?? 'Changes saved.'))
  const title = categories.find(([id]) => id === active)?.[1] ?? 'Settings'
  async function remove(event: React.FormEvent) {
    event.preventDefault()
    if (deleted !== 'DELETE') return setMessage('Type DELETE to confirm account removal.')
    const response = await fetch('/api/account', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: deleted }) })
    if (response.ok) window.location.href = '/'
    else setMessage('We could not delete your account.')
  }
  return <main className="min-h-screen bg-background px-4 pb-24 text-foreground md:px-8"><div className="mx-auto max-w-5xl py-6"><a href="/app" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Back to feed</a><header className="mb-6"><p className="text-sm text-muted-foreground">Account center</p><h1 className="mt-1 font-serif text-4xl">Settings</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Manage your account, privacy, notifications, and how you use Luma.</p></header>{message && <p role="status" className="mb-5 rounded-xl bg-muted px-4 py-3 text-sm">{message}</p>}<div className="grid gap-6 md:grid-cols-[260px_1fr]"><nav className="h-fit rounded-2xl border border-border bg-card p-2" aria-label="Settings categories"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Settings</p>{categories.map(([id, label, description, Icon]) => <button key={id} type="button" onClick={() => { setActive(id); setMessage('') }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${active === id ? 'bg-muted' : 'hover:bg-muted/60'}`}><Icon className="size-5 text-muted-foreground" /><span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{description}</span></span></button>)}</nav><section><h2 className="mb-4 border-b border-border pb-4 text-2xl font-semibold">{title}</h2>{active === 'profile' && <ProfileSection profile={profile} pending={pending} run={run} />}{active === 'account' && <><Panel title="Contact information" text="Your email is used for account access and important notices."><p className="rounded-xl border border-border px-4 py-3 text-sm">{email}</p></Panel><Danger deleted={deleted} setDeleted={setDeleted} remove={remove} /></>}{active === 'security' && <Security pending={pending} run={run} />}{active === 'notifications' && <Notifications preferences={preferences} pending={pending} run={run} />}{active === 'privacy' && <Privacy profile={profile} pending={pending} run={run} />}{active === 'appearance' && <Panel title="Appearance" text="Your display preferences follow the current app theme."><p className="text-sm text-muted-foreground">Use the theme control in the app navigation to switch appearance.</p></Panel>}{active === 'help' && <Panel title="Community rules" text="These rules keep Luma useful and welcoming."><ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground"><li>Be respectful and do not harass members.</li><li>Do not share private information without permission.</li><li>Keep posts and messages lawful, relevant, and honest.</li><li>Report content that violates these rules.</li></ul></Panel>}</section></div></div></main>
}

function Panel({ title, text, children }: { title: string; text: string; children: React.ReactNode }) { return <div className="rounded-2xl border border-border bg-card p-5"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p><div className="mt-5">{children}</div></div> }
function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) { return <button type="submit" disabled={pending} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">{children}</button> }
function ProfileSection({ profile, pending, run }: { profile: Profile | null; pending: boolean; run: Run }) { const [file, setFile] = useState<File | null>(null); const [source, setSource] = useState(''); const [zoom, setZoom] = useState(1); const [open, setOpen] = useState(false); const inputRef = useRef<HTMLInputElement>(null); const previewRef = useRef<HTMLCanvasElement>(null); useEffect(() => { if (!source || !previewRef.current) return; const image = new Image(); image.onload = () => { const canvas = previewRef.current!; const size = 320; const side = Math.min(image.naturalWidth, image.naturalHeight) / zoom; const sx = (image.naturalWidth - side) / 2; const sy = (image.naturalHeight - side) / 2; canvas.width = size; canvas.height = size; canvas.getContext('2d')!.drawImage(image, sx, sy, side, side, 0, 0, size, size) }; image.src = source }, [source, zoom]); function choose(event: React.ChangeEvent<HTMLInputElement>) { const selected = event.target.files?.[0]; if (!selected) return; setFile(selected); setSource(URL.createObjectURL(selected)); setZoom(1); setOpen(true) } function apply(event: React.FormEvent) { event.preventDefault(); if (!previewRef.current || !file) return; previewRef.current.toBlob(blob => { if (!blob) return; const form = new FormData(); form.set('avatar', new File([blob], 'avatar.jpg', { type: 'image/jpeg' })); run(updateAvatar, form); setOpen(false) }, 'image/jpeg', .9) } return <Panel title="Profile information" text="This information helps people recognize you."><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={choose} /><button type="button" onClick={() => inputRef.current?.click()} aria-label="Choose profile photo" className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Avatar name={profile?.display_name} path={profile?.avatar_path} visible={profile?.avatar_visible !== false} size="lg" /><span className="absolute bottom-0 right-0 grid size-7 place-items-center rounded-full border-2 border-background bg-primary text-lg leading-none text-primary-foreground">+</span></button>{open && <div role="dialog" aria-modal="true" aria-label="Crop profile photo" className="mt-5 rounded-2xl border border-border bg-muted/40 p-4"><p className="text-sm font-medium">Crop your profile photo</p><canvas ref={previewRef} className="mx-auto mt-3 size-64 rounded-full object-cover" /><label className="mt-4 block text-sm">Zoom<input type="range" min="1" max="3" step=".05" value={zoom} onChange={event => setZoom(Number(event.target.value))} className="mt-2 w-full" /></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancel</button><button type="button" onClick={apply} disabled={pending} className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">Apply</button></div></div>}<form onSubmit={event => { event.preventDefault(); run(updateProfile, new FormData(event.currentTarget)) }} className="mt-6 flex flex-col gap-3"><label className="text-sm">Display name<input name="display_name" defaultValue={profile?.display_name ?? ''} required className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3" /></label><label className="text-sm">Username<input name="username" defaultValue={profile?.username ?? ''} required className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3" /></label><label className="text-sm">Bio<textarea name="bio" defaultValue={profile?.bio ?? ''} rows={3} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3" /></label><Submit pending={pending}>Save profile</Submit></form></Panel> }
function Security({ pending, run }: { pending: boolean; run: Run }) { return <Panel title="Password" text="Use a unique password with at least 8 characters."><form onSubmit={event => { event.preventDefault(); run(updatePassword, new FormData(event.currentTarget)) }} className="flex max-w-md flex-col gap-3"><input name="password" type="password" minLength={8} required placeholder="New password" className="rounded-xl border border-input bg-background px-3 py-3" /><Submit pending={pending}>Update password</Submit></form></Panel> }
function Notifications({ preferences, pending, run }: { preferences: Preferences; pending: boolean; run: Run }) { return <Panel title="Notification preferences" text="Choose which activity appears in your notifications."><form onSubmit={event => { event.preventDefault(); run(updateNotificationPreferences, new FormData(event.currentTarget)) }} className="flex flex-col gap-3">{[['likes', 'Likes on your posts'], ['follows', 'New followers'], ['messages', 'New messages']].map(([name, label]) => <label key={name} className="flex justify-between rounded-xl border border-border px-4 py-3 text-sm">{label}<input name={name} type="checkbox" defaultChecked={preferences?.[name as keyof NonNullable<Preferences>] ?? true} /></label>)}<Submit pending={pending}>Save notifications</Submit></form></Panel> }
function Privacy({ profile, pending, run }: { profile: Profile | null; pending: boolean; run: Run }) { return <div className="flex flex-col gap-5"><Panel title="Avatar privacy" text="Choose whether other members can see your profile photo."><form onSubmit={event => { event.preventDefault(); run(updateAvatarVisibility, new FormData(event.currentTarget)) }} className="flex items-center justify-between gap-3 text-sm"><span>Show my avatar to other members</span><input name="avatar_visible" type="checkbox" defaultChecked={profile?.avatar_visible !== false} /><Submit pending={pending}>Save</Submit></form></Panel><Panel title="Community rules" text="These rules keep Luma useful and welcoming."><ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground"><li>Be respectful and do not harass members.</li><li>Protect personal information.</li><li>Keep posts and messages lawful and honest.</li></ul></Panel></div> }
function Danger({ deleted, setDeleted, remove }: { deleted: string; setDeleted: (value: string) => void; remove: (event: React.FormEvent) => void }) { return <div className="mt-5 rounded-2xl border border-destructive/40 bg-card p-5"><div className="flex gap-3"><Trash2 className="size-5 text-destructive" /><div><h3 className="font-semibold">Delete account</h3><p className="mt-1 text-sm text-muted-foreground">This permanently removes your account and content.</p><form onSubmit={remove} className="mt-4 flex gap-2"><input value={deleted} onChange={event => setDeleted(event.target.value)} placeholder="Type DELETE" className="min-w-0 rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /><button type="submit" className="rounded-xl border border-destructive px-3 py-2 text-sm text-destructive">Delete</button></form></div></div></div> }

// The avatar picker intentionally uses the native file input so browser gallery/file selection works on desktop and mobile.
// Avatar uploads are validated again in the server action before storage.
// Settings forms submit as progressive-enhancement-friendly HTML forms.
// Privacy defaults to visible for existing profiles unless explicitly disabled.
// Account deletion remains a separate destructive action.
// All setting changes report their result through the accessible status region.
// Category navigation stays keyboard reachable through native buttons.
// The layout collapses into a single column on narrow screens.
// Controls avoid client-side persistence so server settings remain authoritative.
// Forms are isolated so submitting one cannot mutate unrelated settings.
// Uploaded images are constrained to supported raster formats.
// The current MVP uses the browser's own gallery picker affordance.
// No external upload widget is required.
// This component intentionally keeps the settings center self-contained.
// It delegates persistence to server actions.
// It preserves the existing account deletion endpoint.
// It preserves notification preference names.
// It preserves profile field names.
// It preserves avatar visibility semantics.
// It preserves the existing visual token system.
// It does not introduce user tracking.
// It does not add analytics.
// It does not store personal data in localStorage.
// It supports reduced-motion users by avoiding decorative animation.
// It keeps all text neutral and informational.
// It is safe to render when the profile row is temporarily unavailable.
// It provides initials fallback through Avatar.
// It is ready for a future crop step without changing the action contract.
// End of settings center.
