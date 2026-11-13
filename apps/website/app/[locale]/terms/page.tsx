import Link from 'next/link'
import type { Metadata } from 'next'
import type { Locale } from '@/lib/i18n'
import { PageHero } from '../components/page-hero'

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params
  return { title: locale === 'ar' ? 'الشروط والأحكام' : 'Terms and conditions' }
}

export default async function TermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const ar = locale === 'ar'
  return <>
    <PageHero title={ar ? 'الشروط والأحكام' : 'Terms and conditions'} />
    <section className="mx-auto max-w-3xl px-5 py-12">
      <article className="prose-hospital">
        <h2>{ar ? 'طلبات حجز المواعيد' : 'Appointment requests'}</h2>
        <p>{ar ? 'إرسال طلب الموعد عبر الموقع لا يعني تأكيد الحجز. الموعد يتم تأكيده باتصال من فريقنا.' : 'Submitting an appointment request through the website does not confirm a booking. Our team will call to confirm your appointment.'}</p>
        <p>{ar ? 'لمعرفة تفاصيل الحجز والتواصل مع المستشفى، راجع سياسة المواعيد. ولمعرفة كيفية التعامل مع بياناتك، راجع سياسة الخصوصية.' : 'For booking and hospital contact details, see the appointment policy. For information about how your data is handled, see the privacy policy.'}</p>
        <div className="mt-6 flex flex-wrap gap-5 text-brand-deep underline underline-offset-4">
          <Link href={`/${locale}/appointment-policy`}>{ar ? 'سياسة المواعيد' : 'Appointment policy'}</Link>
          <Link href={`/${locale}/privacy`}>{ar ? 'سياسة الخصوصية' : 'Privacy policy'}</Link>
          <Link href={`/${locale}/contact`}>{ar ? 'تواصل معنا' : 'Contact us'}</Link>
        </div>
      </article>
    </section>
  </>
}
