'use client'

import { ArrowUpRight, BookOpen, Building2, Globe2, Menu, Newspaper, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { locales, type Dictionary, type Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { EmergencyButton } from './emergency-button'
import { SearchModal } from './search-modal'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet'

type Props = { locale: Locale; t: Dictionary }

export function SiteHeader({ locale, t }: Props) {
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const homeHref = `/${locale}`
  const ar = locale === 'ar'
  const links = [
    { href: homeHref, label: t.nav.home, exact: true },
    { href: `${homeHref}/departments`, label: t.nav.departments },
    { href: `${homeHref}/doctors`, label: t.nav.doctors },
    { href: `${homeHref}/about`, label: ar ? 'من نحن' : 'About' },
    { href: `${homeHref}/blog`, label: ar ? 'المدونة' : 'Blog' },
    { href: `${homeHref}/news`, label: t.nav.news },
    { href: `${homeHref}/contact`, label: t.nav.contact },
  ]
  const moreLinks = [
    { href: `${homeHref}/about`, label: ar ? 'عن المستشفى' : 'About the hospital', Icon: Building2 },
    { href: `${homeHref}/blog`, label: ar ? 'المقالات الطبية' : 'Health articles', Icon: BookOpen },
    { href: `${homeHref}/news`, label: t.nav.news, Icon: Newspaper },
  ]
  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href)
  useEffect(() => { setOpen(false); setSearchOpen(false) }, [pathname])
  useEffect(() => {
    const query = window.matchMedia('(min-width:1024px)')
    const closeOnDesktop = () => { if (query.matches) setOpen(false) }
    query.addEventListener('change', closeOnDesktop)
    return () => query.removeEventListener('change', closeOnDesktop)
  }, [])

  return <>
    <header className="site-header sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:grid lg:grid-cols-[auto_1fr_auto]">
        <Link prefetch href={homeHref} className="flex shrink-0 items-center" aria-label={t.siteName}>
          <Image src="/abc-logo.webp" alt={t.siteName} width={64} height={64} className="h-10 w-auto lg:h-12" priority />
        </Link>
        <nav aria-label={ar ? 'التنقل الرئيسي' : 'Main navigation'} className="hidden items-center justify-center gap-7 lg:flex">
          {links.map(item => <Link prefetch={true} key={item.href} href={item.href} aria-current={isActive(item.href, item.exact) ? 'page' : undefined} className={cn('text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground', isActive(item.href, item.exact) && 'text-brand-deep hover:text-brand-deep')}>{item.label}</Link>)}
        </nav>
        <div className="hidden lg:flex"><EmergencyButton t={t} /></div>
        <div className="flex items-center gap-1 lg:hidden">
          <button type="button" onClick={() => setSearchOpen(true)} className="mobile-header-action" aria-label={t.header.search}><Search size={21} strokeWidth={1.8} /></button>
          <button type="button" onClick={() => setOpen(true)} className="mobile-header-action" aria-label={t.header.menu} aria-expanded={open} aria-haspopup="dialog"><Menu size={23} strokeWidth={1.8} /></button>
        </div>
      </div>
    </header>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="mobile-more-sheet lg:hidden" dir={ar ? 'rtl' : 'ltr'} closeLabel={t.header.close}>
        <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-5">
          <SheetTitle className="font-heading text-xl font-bold">{ar ? 'المزيد' : 'More'}</SheetTitle>
          <SheetDescription className="sr-only">{ar ? 'معلومات المستشفى واللغة والطوارئ' : 'Hospital information, language and emergency contact'}</SheetDescription>
          <nav className="my-5" aria-label={ar ? 'صفحات إضافية' : 'More pages'}>
            {moreLinks.map(({ href, label, Icon }) => <Link prefetch={true} key={href} href={href} onClick={() => setOpen(false)} aria-current={isActive(href) ? 'page' : undefined} className="flex min-h-14 items-center gap-3 border-b border-border/60 text-sm font-semibold last:border-0"><Icon size={20} strokeWidth={1.7} className="text-muted-foreground" /><span className="flex-1">{label}</span><ArrowUpRight size={16} className="text-muted-foreground rtl:-rotate-90" /></Link>)}
          </nav>
          <div className="flex items-center justify-between gap-4 border-t border-border py-4">
            <span className="flex items-center gap-2 text-sm text-muted-foreground"><Globe2 size={18} />{t.header.language}</span>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {locales.map(l => <Link prefetch={true} key={l} href={pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${l}`)} hrefLang={l} aria-current={l === locale ? 'true' : undefined} className={cn('rounded-md px-3 py-2 text-xs font-semibold', l === locale ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>{l === 'ar' ? 'العربية' : 'English'}</Link>)}
            </div>
          </div>
          <EmergencyButton t={t} className="mt-2 w-full justify-center" />
        </div>
      </SheetContent>
    </Sheet>
    <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} locale={locale} t={t} />
  </>
}
