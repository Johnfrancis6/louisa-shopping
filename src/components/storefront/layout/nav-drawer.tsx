'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Logo } from './logo'
import { cn } from '@/lib/utils'
import { NAV_LINKS, useActiveNav } from './nav-links'

/**
 * Menu principal mobile / tablette — hamburger (`< lg`) → drawer latéral gauche.
 * Mêmes liens que la navbar desktop (`NAV_LINKS`) : « Nos boutiques » → /catalogue,
 * le reste défile vers les sections de la home. La bottom-nav mobile est conservée.
 */
export function NavDrawer() {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Menu"
        className="flex h-11 w-11 items-center justify-center rounded-ls-sm text-ls-gray-900 transition-colors hover:bg-ls-gray-100 lg:hidden"
      >
        <Menu size={22} strokeWidth={2.25} />
      </SheetTrigger>

      <SheetContent side="left" className="w-[84%] gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="flex-row items-center border-b border-ls-gray-200 p-4">
          <SheetTitle className="sr-only">Menu principal</SheetTitle>
          <Logo />
        </SheetHeader>

        <nav className="flex flex-col gap-1 p-3">
          <Suspense fallback={<DrawerLinksFallback />}>
            <DrawerLinksLive />
          </Suspense>
        </nav>

        <div className="mt-auto p-4">
          <SheetClose
            render={
              <Link
                href="/#contact"
                className="flex h-11 w-full items-center justify-center rounded-full bg-ls-violet text-ls-body font-medium text-ls-white transition-colors hover:bg-ls-violet-dark"
              />
            }
          >
            Contactez-nous
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}

const ITEM_BASE =
  'flex items-center gap-3.5 rounded-ls-sm px-3 py-3 text-[15px] transition-colors'

function DrawerLinksLive() {
  const isActive = useActiveNav()
  return (
    <>
      {NAV_LINKS.map(({ href, label, Icon }) => {
        const active = isActive(href)
        return (
          <SheetClose
            key={href}
            render={
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  ITEM_BASE,
                  active
                    ? 'bg-ls-violet-bg font-medium text-ls-violet-dark'
                    : 'text-ls-gray-700 hover:bg-ls-gray-50',
                )}
              />
            }
          >
            <Icon
              size={20}
              strokeWidth={1.9}
              className={active ? 'text-ls-violet' : 'text-ls-gray-500'}
            />
            {label}
          </SheetClose>
        )
      })}
    </>
  )
}

function DrawerLinksFallback() {
  return (
    <>
      {NAV_LINKS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(ITEM_BASE, 'text-ls-gray-700 hover:bg-ls-gray-50')}
        >
          <Icon size={20} strokeWidth={1.9} className="text-ls-gray-500" />
          {label}
        </Link>
      ))}
    </>
  )
}
