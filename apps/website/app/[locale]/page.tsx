import { contentFetch } from '@/lib/content-fetch'
import { HomeFaq } from './components/home-faq'
import { LatestPosts } from './components/posts/post-cards'
import { HomeHero } from './components/home-hero'
import { HomeSections } from './components/home-sections'
import type { Locale } from '@/lib/i18n'

type DeptOption = { slug: string; name: string }
type DoctorOption = { slug: string; name: string; departmentSlug: string | null; departmentSlugs?: string[] }
export type HeroSlide = { titleAr: string; titleEn: string; desktopUrl: string; mobileUrl: string | null }

async function getBookingOptions(locale: Locale) {
  const api = process.env.API_URL ?? 'http://localhost:3000/v1'
  const fallback = { departments: [] as DeptOption[], doctors: [] as DoctorOption[] }
  try {
    const [deptRes, docRes] = await Promise.all([
      contentFetch(`${api}/departments?locale=${locale}`, { next: { revalidate: 120 } }),
      contentFetch(`${api}/doctors?locale=${locale}`, { next: { revalidate: 120 } }),
    ])
    if (!deptRes.ok || !docRes.ok) return fallback
    const [depts, docs] = await Promise.all([deptRes.json(), docRes.json()])
    return {
      departments: (depts.data ?? []) as DeptOption[],
      doctors: (docs.data ?? []) as DoctorOption[],
    }
  } catch {
    return fallback
  }
}

// hero slides managed from the dashboard; empty → hero falls back to its default images
async function getHeroSlides() {
  const api = process.env.API_URL ?? 'http://localhost:3000/v1'
  try {
    const res = await contentFetch(`${api}/hero-slides`, { next: { revalidate: 120 } })
    if (!res.ok) return []
    const json = (await res.json()) as { data?: HeroSlide[] }
    return (json.data ?? []).filter((s) => s.desktopUrl)
  } catch {
    return []
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: 'ar' | 'en' }>
}) {
  const { locale } = await params
  const [{ departments, doctors }, heroSlides] = await Promise.all([getBookingOptions(locale), getHeroSlides()])
  return <><HomeHero locale={locale} departments={departments} doctors={doctors} slides={heroSlides} /><HomeSections locale={locale} /><LatestPosts locale={locale} /><HomeFaq locale={locale} /></>
}
