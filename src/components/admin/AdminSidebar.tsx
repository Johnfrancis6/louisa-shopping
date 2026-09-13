'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ClipboardList,
  Package,
  FolderTree,
  Boxes,
  Star,
  MessageCircle,
  LayoutTemplate,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin/orders', label: 'Commandes', Icon: ClipboardList },
  { href: '/admin/products', label: 'Catalogue', Icon: Package },
  { href: '/admin/categories', label: 'Catégories', Icon: FolderTree },
  { href: '/admin/stock', label: 'Stock', Icon: Boxes },
  { href: '/admin/reviews', label: 'Avis', Icon: Star },
  { href: '/admin/home', label: 'Accueil', Icon: LayoutTemplate },
  { href: '/admin/whatsapp', label: 'WhatsApp', Icon: MessageCircle },
] as const

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(href + '/')
}

/* ------------------------------------------------------------------ desktop */

function DesktopNav({ pathname }: { pathname: string | null }) {
  return (
    <nav className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col gap-1 bg-ls-gray-900 p-4 text-white md:flex">
      <Link
        href="/admin"
        className="mb-3 flex items-center gap-2 px-2 py-1 text-sm font-semibold uppercase tracking-wide text-white/70"
      >
        <span className="grid h-6 w-6 place-items-center rounded-ls-sm bg-ls-violet text-[13px] font-bold text-white">
          L
        </span>
        Louisa · Admin
      </Link>

      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-ls-sm px-3 py-2 text-[15px] transition-colors',
              active
                ? 'bg-ls-violet text-white'
                : 'text-white/80 hover:bg-white/10 hover:text-white',
            )}
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </Link>
        )
      })}

      <Link
        href="/"
        className="mt-auto flex items-center gap-2 rounded-ls-sm px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft size={16} />
        Retour au site
      </Link>
    </nav>
  )
}

/* ------------------------------------------------------------------- mobile */

function MobileNav({ pathname }: { pathname: string | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ls-gray-900 text-white md:hidden">
      <div className="flex h-12 items-center justify-between px-4">
        <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          <span className="grid h-6 w-6 place-items-center rounded-ls-sm bg-ls-violet text-[13px] font-bold">
            L
          </span>
          Admin
        </Link>
        <Link href="/" className="flex items-center gap-1 text-xs text-white/60">
          <ArrowLeft size={14} />
          Site
        </Link>
      </div>

      <div className="-mb-px flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                active ? 'bg-ls-violet text-white' : 'bg-white/10 text-white/80',
              )}
            >
              <Icon size={14} strokeWidth={2.25} />
              {label}
            </Link>
          )
        })}
      </div>
    </header>
  )
}

/* --------------------------------------------------------------------- shell */

function Nav() {
  const pathname = usePathname()
  return (
    <>
      <DesktopNav pathname={pathname} />
      <MobileNav pathname={pathname} />
    </>
  )
}

function NavFallback() {
  return (
    <>
      <DesktopNav pathname={null} />
      <MobileNav pathname={null} />
    </>
  )
}

export function AdminSidebar() {
  // usePathname() isolé sous <Suspense> (obligatoire avec cacheComponents).
  return (
    <Suspense fallback={<NavFallback />}>
      <Nav />
    </Suspense>
  )
}
