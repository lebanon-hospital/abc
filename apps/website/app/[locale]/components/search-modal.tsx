'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Search, Stethoscope, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Dictionary } from '@/lib/i18n'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1'

type Result = {
  id: string
  title: string
  type: 'doctor' | 'department' | 'post'
  href: string
}

type Props = {
  open: boolean
  onClose: () => void
  locale: 'ar' | 'en'
  t: Dictionary
}

type Doctor = { slug: string; name?: string; titleAr?: string; titleEn?: string }
type Department = { slug: string; name?: string; nameAr?: string; nameEn?: string }
type Post = { slug: string; type?: string; title?: string; titleAr?: string; titleEn?: string }

export function SearchModal({ open, onClose, locale, t }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isAr = locale === 'ar'
  const typeLabels = useMemo(
    () => ({ doctor: isAr ? 'طبيب' : 'Doctor', department: isAr ? 'قسم' : 'Department', post: isAr ? 'مقال' : 'Article' }),
    [isAr],
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setPosts([])
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [open, onClose])

  // Load the real doctors/departments directories once per open (small lists)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    Promise.all([
      fetch(`${API_URL}/doctors?locale=${locale}&limit=200`).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
      fetch(`${API_URL}/departments?locale=${locale}`).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
    ]).then(([d, dep]: [{ data: Doctor[] }, { data: Department[] }]) => {
      if (cancelled) return
      setDoctors(Array.isArray(d?.data) ? d.data : [])
      setDepartments(Array.isArray(dep?.data) ? dep.data : [])
    })
    return () => {
      cancelled = true
    }
  }, [open, locale])

  // Debounced server-side search across published posts
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setPosts([])
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      fetch(`${API_URL}/posts?q=${encodeURIComponent(q)}&locale=${locale}&limit=5`)
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((p: { data: Post[] }) => setPosts(Array.isArray(p?.data) ? p.data : []))
        .catch(() => setPosts([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query, locale])

  const q = query.trim()
  const results: Result[] = useMemo(() => {
    if (!q) return []
    const out: Result[] = []
    for (const d of doctors) {
      const name = d.name || d.titleAr || d.titleEn || ''
      if (name.includes(q)) out.push({ id: `doc-${d.slug}`, title: name, type: 'doctor', href: `/${locale}/doctors/${d.slug}` })
    }
    for (const d of departments) {
      const name = d.name || d.nameAr || d.nameEn || ''
      if (name.includes(q)) out.push({ id: `dep-${d.slug}`, title: name, type: 'department', href: `/${locale}/departments/${d.slug}` })
    }
    for (const p of posts) {
      const title = p.title || p.titleAr || p.titleEn || ''
      out.push({ id: `post-${p.slug}`, title, type: 'post', href: `/${locale}/${p.type === 'news' ? 'news' : 'blog'}/${p.slug}` })
    }
    return out.slice(0, 12)
  }, [q, doctors, departments, posts, locale])

  const TypeIcon = { doctor: Stethoscope, department: Search, post: FileText }

  const go = (href: string) => {
    onClose()
    router.push(href)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-[10vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
            aria-label={t.header.search}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.header.searchPlaceholder}
                className="h-13 w-full bg-transparent py-4 text-base text-card-foreground caret-current outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={t.header.close}
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body: live results from the real database */}
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {!q && <p className="px-3 pb-1 pt-2 text-xs text-muted-foreground">{t.header.searchHint}</p>}
              {q && !loading && results.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t.header.searchNoResults}</p>
              )}
              {results.map((r) => {
                const Icon = TypeIcon[r.type]
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => go(r.href)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start transition-colors hover:bg-muted"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-semibold">{r.title}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {typeLabels[r.type]}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
