'use client'

import { House, LayoutGrid, MapPin, Plus, Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { useBooking } from './booking-provider'
import { usePathname } from 'next/navigation'
import type { Locale } from '@/lib/i18n'

export function MobileBottomNav({ locale }: { locale: Locale }) {
  const openBooking = useBooking()
  const pathname = usePathname()
  const ar = locale === 'ar'
  const base = `/${locale}`
  const links = [
    { href: base, label: ar ? 'الرئيسية' : 'Home', Icon: House },
    { href: `${base}/departments`, label: ar ? 'التخصصات' : 'Specialties', Icon: LayoutGrid },
    { href: `${base}/doctors`, label: ar ? 'الأطباء' : 'Doctors', Icon: Stethoscope },
    { href: `${base}/contact`, label: ar ? 'تواصل معنا' : 'Contact', Icon: MapPin },
  ]
  return <>
  <nav className="mobile-bottom-nav lg:hidden" aria-label={ar ? 'التنقل السريع' : 'Quick navigation'}>
    {links.map(({ href, label, Icon }, index) => {
      const active = href === base ? pathname === href || pathname === `${href}/` : pathname === href || pathname.startsWith(`${href}/`)
      return <div key={href} className="contents">{index === 2 && <button type="button" className="mobile-bottom-link mobile-booking-action" onClick={() => openBooking()} aria-haspopup="dialog"><span className="mobile-bottom-icon"><Plus size={23} strokeWidth={1.8} aria-hidden="true" /></span><span>{ar ? 'احجز موعد' : 'Book a visit'}</span></button>}<Link prefetch={true} href={href} aria-current={active ? 'page' : undefined} className="mobile-bottom-link"><span className="mobile-bottom-icon"><Icon size={22} strokeWidth={active ? 2 : 1.7} aria-hidden="true" /></span><span>{label}</span></Link></div>
    })}
  </nav>
  </>
}
