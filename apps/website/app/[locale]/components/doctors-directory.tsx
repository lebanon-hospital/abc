'use client'
import Link from 'next/link'
import { useState } from 'react'
import { MultiSelect } from './ui/multi-select'
import { QueryState } from './query-state'
import { Stethoscope } from 'lucide-react'
import type { Dictionary, Locale } from '@/lib/i18n'
import { DirectoryHeader } from './directory/directory-header'
import { DoctorCard } from './directory/doctor-card'
type DoctorCard = {
  id: string
  slug: string
  name: string
  title: string | null
  photoUrl: string | null
  departmentSlugs?: string[]
  departments?: {id:string;slug:string;name:string}[]
  departmentSlug: string | null
  departmentName: string | null
}

export function DoctorsDirectory({ locale, t, doctors, departments }: { locale: Locale; t: Dictionary; doctors: DoctorCard[]; departments: { id: string; slug: string; name: string }[] }) {
 const [query, setQuery] = useState('')
 const selected = new URLSearchParams(query).getAll('dept').flatMap(value => value.split(',')).filter(Boolean)
 const [nameQuery,setNameQuery] = useState('')
 const filteredDoctors = doctors.filter(d => (!selected.length || (d.departmentSlugs ?? [d.departmentSlug]).some(slug => slug && selected.includes(slug))) && `${d.name} ${d.title ?? ''}`.toLocaleLowerCase(locale).includes(nameQuery.trim().toLocaleLowerCase(locale)))
 function changeDepartments(values:string[]) {
   const params = new URLSearchParams(query)
   if (values.length) params.set('dept',values.join(',')); else params.delete('dept')
   window.history.replaceState(null,'',`/${locale}/doctors${params.size ? `?${params}` : ''}`)
 }
  const ar = locale === 'ar'
  return (
    <div className="hospital-directory">
      <QueryState onChange={setQuery} />
      <DirectoryHeader locale={locale} title={t.nav.doctors} label={ar ? 'فريق مستشفى ABC' : 'THE ABC HOSPITAL TEAM'} description={ar ? 'تعرّف على أطبائنا واختر التخصص المناسب لاحتياجاتك. نحن هنا لمساعدتك في ترتيب زيارتك.' : 'Meet our doctors and find the right specialty for your needs. We’re here to help you arrange your visit.'} />
      <section className="hospital-container hospital-directory-content">
        <div className="directory-filter-bar">
          <div><label htmlFor="doctor-specialties">{ar ? 'التخصصات' : 'Specialties'}</label><MultiSelect closeMenuOnSelect id="doctor-specialties" locale={locale} options={departments.map(d => ({value:d.slug,label:d.name}))} value={selected} onChange={changeDepartments} placeholder={ar ? 'كل التخصصات — اختر تخصصًا أو أكثر' : 'All specialties — select one or more'} /></div>
          <div><label htmlFor="doctor-name-search">{ar ? 'اسم الطبيب' : 'Doctor name'}</label><input id="doctor-name-search" type="search" value={nameQuery} onChange={e=>setNameQuery(e.target.value)} placeholder={ar ? 'ابحث باسم الطبيب…' : 'Search doctors…'} /></div>
        </div>
        <div className="filter-results-transition">
        <div className="hospital-section-title"><h2>{ar ? 'أطباؤنا' : 'Our doctors'}</h2><span>{filteredDoctors.length} {ar ? 'طبيب' : filteredDoctors.length === 1 ? 'doctor' : 'doctors'}</span></div>
        <div className="hospital-doctor-grid">{filteredDoctors.map((doc) => <DoctorCard key={doc.id} doctor={doc} locale={locale} />)}</div>
        {filteredDoctors.length === 0 && <div className="hospital-directory-empty"><Stethoscope size={36} /><h3>{ar ? 'لا يوجد أطباء للعرض حالياً' : 'No doctors to display right now'}</h3><p>{ar ? 'جرّب تخصصاً آخر أو تواصل معنا لمساعدتك في اختيار الطبيب المناسب.' : 'Try another specialty or contact our team for help choosing a doctor.'}</p><Link href={`/${locale}/contact`}>{ar ? 'تواصل معنا' : 'Contact our team'}</Link></div>}
        </div>
      </section>
    </div>
  )
}
