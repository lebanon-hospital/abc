'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'
import type { Locale } from '@/lib/i18n'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet'
import { useBookingDraft } from '@/lib/hooks/use-booking-draft'
import { DraftStatus } from './ui/draft-status'
import { PhoneInput } from './ui/phone-input'
import { PaymentFields } from './ui/payment-fields'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

type Department = { slug: string; name: string }
type Doctor = Department & { departmentSlug: string | null; departmentSlugs?: string[] }
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1'

export function BookingSheet({ locale, open, onOpenChange, initialDoctor, initialDepartment }: { locale: Locale; open: boolean; onOpenChange: (value: boolean) => void; initialDoctor?:string; initialDepartment?:string }) {
  const ar = locale === 'ar'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState<CountryCode>('EG')
  const [department, setDepartment] = useState('')
  const [doctor, setDoctor] = useState('')
  const [paymentType, setPaymentType] = useState('cash')
  const [insuranceCompany, setInsuranceCompany] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [optionsError, setOptionsError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [phoneError, setPhoneError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(false)
  const draft = useBookingDraft({name,phone,country,enabled:open && !sent})
  useEffect(() => {
    if (open) { setDepartment(initialDepartment ?? ''); setDoctor(initialDoctor ?? ''); setSent(false);setError(false) }
  },[open,initialDepartment,initialDoctor])
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setOptionsError(false)
    fetch(`/api/booking-options?locale=${locale}`, { signal:controller.signal })
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then((body: { departments: Department[]; doctors: Doctor[] }) => { setDepartments(body.departments); setDoctors(body.doctors); if(initialDoctor && !initialDepartment) { const doctor=body.doctors.find(d=>d.slug===initialDoctor); setDepartment(doctor?.departmentSlugs?.[0] ?? doctor?.departmentSlug ?? '') } })
      .catch(() => { if (!controller.signal.aborted) setOptionsError(true) })
    return () => controller.abort()
  }, [open, locale, retry, initialDoctor, initialDepartment])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parsePhoneNumberFromString(phone, country)
    setPhoneError(!parsed?.isValid())
    if (!parsed?.isValid() || name.trim().length < 2 || submitting || (paymentType === 'insurance' && !insuranceCompany.trim())) return
    setSubmitting(true)
    setError(false)
    try {
      const res = await draft.complete({patientName:name.trim(),phone:parsed.number,departmentSlug:department || undefined,doctorSlug:doctor || undefined,paymentType,insuranceCompany:paymentType === 'insurance' ? insuranceCompany.trim() : undefined})
      if (!res.ok) throw new Error()
      setSent(true)
      setName(''); setPhone(''); setDepartment(''); setDoctor(''); setPaymentType('cash'); setInsuranceCompany('')
    } catch { setError(true) } finally { setSubmitting(false) }
  }
  return <Sheet open={open} onOpenChange={value => { if (!submitting) { onOpenChange(value); if (!value) { setSent(false); setError(false) } } }}>
    <SheetContent className="site-booking-sheet" dir={ar ? 'rtl' : 'ltr'} closeLabel={ar ? 'إغلاق' : 'Close'} onInteractOutside={event => { if (submitting) event.preventDefault() }}>
      <div className="px-6 pb-4 pt-5"><SheetTitle className="font-heading text-xl font-bold">{ar ? 'احجز موعد' : 'Book an appointment'}</SheetTitle><SheetDescription className="mt-2 text-sm text-muted-foreground">{ar ? 'اترك بياناتك واختر تفاصيل زيارتك.' : 'Leave your details and choose your visit.'}</SheetDescription></div>
      {sent ? <div role="status" className="px-6 pb-8 text-center"><CheckCircle2 className="mx-auto mb-3 size-10 text-brand-deep" /><p>{ar ? 'تم استلام طلبك. سيتواصل معك فريقنا لتأكيد الموعد.' : 'Request received. Our team will call to confirm.'}</p></div> : <form onSubmit={submit} className="min-h-0 overflow-y-auto px-6 pb-6" data-lenis-prevent>
        <div className="hero-booking-fields booking-sheet-fields">
          <label htmlFor="quick-booking-name">{ar ? 'الاسم' : 'Name'} *<input id="quick-booking-name" required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label>
          <div className="hero-phone-field"><label htmlFor="quick-booking-phone">{ar ? 'رقم الموبايل' : 'Mobile number'} *</label><PhoneInput id="quick-booking-phone" locale={locale} country={country} onCountryChange={setCountry} value={phone} onChange={setPhone} invalid={phoneError} required />{phoneError && <p role="alert" className="mt-1 text-xs text-destructive">{ar ? 'أدخل رقم هاتف صحيح.' : 'Enter a valid phone number.'}</p>}</div>
          <div className="hero-field"><label htmlFor="quick-booking-department">{ar ? 'التخصص' : 'Specialty'}</label><Select value={department || 'any'} onValueChange={value => { setDepartment(value === 'any' ? '' : value); setDoctor('') }} dir={ar ? 'rtl' : 'ltr'}><SelectTrigger id="quick-booking-department" className="hero-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">{ar ? 'ساعدني في الاختيار' : 'Help me choose'}</SelectItem>{departments.map(item => <SelectItem key={item.slug} value={item.slug}>{item.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="hero-field"><label htmlFor="quick-booking-doctor">{ar ? 'الطبيب' : 'Doctor'}</label><Select value={doctor || 'any'} onValueChange={value => setDoctor(value === 'any' ? '' : value)} disabled={!department && !initialDoctor} dir={ar ? 'rtl' : 'ltr'}><SelectTrigger id="quick-booking-doctor" className="hero-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">{ar ? 'أي طبيب مناسب' : 'Any suitable doctor'}</SelectItem>{doctors.filter(item => !department || (item.departmentSlugs ?? [item.departmentSlug]).includes(department)).map(item => <SelectItem key={item.slug} value={item.slug}>{item.name}</SelectItem>)}</SelectContent></Select></div>
          <PaymentFields locale={locale} paymentType={paymentType} insuranceCompany={insuranceCompany} onPaymentChange={setPaymentType} onCompanyChange={setInsuranceCompany} />
        </div>
        <DraftStatus state={draft.state} locale={locale} />
        {optionsError && <p role="status" className="mt-3 text-xs text-muted-foreground">{ar ? 'تعذر تحميل التخصصات. يمكنك إرسال الطلب وسنساعدك في الاختيار.' : 'Could not load specialties. You can still send your request.'} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</button></p>}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{ar ? 'تعذر إرسال الطلب. حاول مرة أخرى.' : 'Unable to send your request. Please retry.'}</p>}
        <button type="submit" className="hero-booking-submit" disabled={submitting || (paymentType === 'insurance' && !insuranceCompany.trim())}>{submitting ? (ar ? 'جارٍ الإرسال…' : 'Sending…') : (ar ? 'تأكيد الموعد' : 'Confirm appointment')}</button>
        <p className="hero-booking-note">{ar ? 'الموعد يتم تأكيده باتصال من فريقنا.' : 'Our team will call to confirm your appointment.'}</p>
        <p className="hero-booking-terms"><Link href={`/${locale}/terms`} onClick={() => onOpenChange(false)}>{ar ? 'تطبق الشروط والأحكام' : 'Terms and conditions apply'}</Link></p>
      </form>}
    </SheetContent>
  </Sheet>
}
