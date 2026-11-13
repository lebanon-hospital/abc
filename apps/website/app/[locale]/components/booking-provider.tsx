'use client'

import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Locale } from '@/lib/i18n'
import { BookingSheet } from './booking-sheet'

type BookingContext = { doctorSlug?:string; departmentSlug?:string }
const Context = createContext<((selection?:BookingContext)=>void) | null>(null)
export function BookingProvider({locale,children}:{locale:Locale;children:ReactNode}) {
  const pathname = usePathname()
  const [open,setOpen] = useState(false)
  const [selection,setSelection] = useState<BookingContext>({})
  useEffect(()=>setOpen(false),[pathname])
  return <Context.Provider value={selection => {setSelection(selection ?? {});setOpen(true)}}>{children}<BookingSheet locale={locale} open={open} onOpenChange={setOpen} initialDepartment={selection.departmentSlug} initialDoctor={selection.doctorSlug} /></Context.Provider>
}
export function useBooking() {
  const open = useContext(Context)
  if (!open) throw new Error('BookingProvider is required')
  return open
}
export function BookingButton({locale,className,children,doctorSlug,departmentSlug}:{locale:Locale;className?:string;children?:ReactNode;doctorSlug?:string;departmentSlug?:string}) {
  const open = useBooking()
  return <button type="button" className={className ?? 'booking-cta'} aria-haspopup="dialog" onClick={()=>open({doctorSlug,departmentSlug})}>{children ?? (locale==='ar'?'احجز موعد':'Book an appointment')}</button>
}
