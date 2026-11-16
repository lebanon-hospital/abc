import { useEffect, useState, type FormEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { api } from '@/api/client'
import { useI18n } from '@/lib/i18n'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ImageInput } from '@/components/shared/image-input'

type Slide = {
  id: string
  titleAr: string
  titleEn: string
  desktopUrl: string
  mobileUrl: string | null
  sortOrder: number
  isActive: boolean
}

type SlideForm = {
  key: string // stable local identity (new slides have no server id yet)
  id: string | null // null = new, unsaved
  titleAr: string
  titleEn: string
  desktopUrl: string
  mobileUrl: string
  sortOrder: string
  isActive: boolean
}

function toForm(s: Slide): SlideForm {
  return {
    key: s.id,
    id: s.id,
    titleAr: s.titleAr,
    titleEn: s.titleEn,
    desktopUrl: s.desktopUrl,
    mobileUrl: s.mobileUrl ?? '',
    sortOrder: String(s.sortOrder),
    isActive: s.isActive,
  }
}

export function HeroSlidesPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [slides, setSlides] = useState<SlideForm[]>([])
  const [loaded, setLoaded] = useState(false)
  const [deleting, setDeleting] = useState<SlideForm | null>(null)
  const [error, setError] = useState<string | null>(null)

  const slidesQuery = useQuery({
    queryKey: ['hero-slides'],
    queryFn: () => api<{ data: Slide[] }>('/hero-slides/admin/'),
    placeholderData: keepPreviousData,
  })

  // hydrate local editable state once; mutations update it explicitly afterwards
  useEffect(() => {
    if (slidesQuery.data && !loaded) {
      setSlides(slidesQuery.data.data.map(toForm))
      setLoaded(true)
    }
  }, [slidesQuery.data, loaded])

  function update(key: string, patch: Partial<SlideForm>) {
    setSlides((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }

  const saveMutation = useMutation({
    mutationFn: async (slide: SlideForm) => {
      if (!slide.desktopUrl) throw new Error(t('heroSlides.needDesktop'))
      const payload = {
        titleAr: slide.titleAr,
        titleEn: slide.titleEn,
        desktopUrl: slide.desktopUrl,
        // send as-is (even '') so clearing persists — backend maps '' to null
        mobileUrl: slide.mobileUrl,
        sortOrder: Number(slide.sortOrder) || 0,
        isActive: slide.isActive,
      }
      return slide.id
        ? api<Slide>(`/hero-slides/admin/${slide.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : api<Slide>('/hero-slides/admin/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
    },
    onSuccess: (saved, slide) => {
      void queryClient.invalidateQueries({ queryKey: ['hero-slides'] })
      // swap local row for the saved one (new slides get their server id)
      setSlides((prev) => prev.map((s) => (s.key === slide.key ? { ...toForm(saved), key: slide.key, id: saved.id } : s)))
      toast.success(t('toast.saved'))
    },
    onError: (e: Error) => { setError(e.message); toast.error(e.message) },
  })

  const deleteMutation = useMutation({
    mutationFn: (slide: SlideForm) => api<{ ok: boolean }>(`/hero-slides/admin/${slide.id}`, { method: 'DELETE' }),
    onSuccess: (__, slide) => {
      void queryClient.invalidateQueries({ queryKey: ['hero-slides'] })
      setSlides((prev) => prev.filter((s) => s.key !== slide.key))
      setDeleting(null)
      toast.success(t('toast.deleted'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function addSlide() {
    setSlides((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        id: null,
        titleAr: '',
        titleEn: '',
        desktopUrl: '',
        mobileUrl: '',
        sortOrder: String(prev.length),
        isActive: true,
      },
    ])
  }

  function onSubmit(e: FormEvent, slide: SlideForm) {
    e.preventDefault()
    setError(null)
    saveMutation.mutate(slide)
  }

  function confirmDelete(slide: SlideForm) {
    if (slide.id === null) {
      // unsaved draft — just discard locally
      setSlides((prev) => prev.filter((s) => s.key !== slide.key))
      return
    }
    setDeleting(slide)
  }

  return (
    <div className="space-y-4 p-3 lg:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold sm:text-2xl">{t('heroSlides.title')}</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t('heroSlides.subtitle')}</p>
        </div>
        <Button onClick={addSlide}>
          <Plus className="h-4 w-4" />
          {t('heroSlides.add')}
        </Button>
      </div>

      {slidesQuery.isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : slides.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          {t('heroSlides.none')}
        </div>
      ) : (
        <div className="space-y-4">
          {slides.map((slide) => (
            <form
              key={slide.key}
              onSubmit={(e) => onSubmit(e, slide)}
              className="space-y-4 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">#{Number(slide.sortOrder) || 0}</Badge>
                  {slide.id === null && <Badge variant="secondary">{t('heroSlides.newSlide')}</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id={`active-${slide.id ?? 'new'}`}
                    checked={slide.isActive}
                    onCheckedChange={(v) => update(slide.key, { isActive: v })}
                  />
                  <Label htmlFor={`active-${slide.id ?? 'new'}`}>{t('heroSlides.active')}</Label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('heroSlides.titleAr')}</Label>
                  <Input dir="rtl" value={slide.titleAr}
                    onChange={(e) => update(slide.key, { titleAr: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('heroSlides.titleEn')}</Label>
                  <Input dir="ltr" value={slide.titleEn}
                    onChange={(e) => update(slide.key, { titleEn: e.target.value })} />
                </div>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">{t('heroSlides.titleHint')}</p>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('heroSlides.desktop')} <span className="text-destructive">*</span></Label>
                  <ImageInput aspect="wide" value={slide.desktopUrl}
                    onChange={(url) => update(slide.key, { desktopUrl: url })} />
                  <p className="text-xs font-semibold text-muted-foreground" dir="ltr">🖼️ {t('heroSlides.desktopHint')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('heroSlides.mobile')}</Label>
                  <ImageInput aspect="wide" value={slide.mobileUrl}
                    onChange={(url) => update(slide.key, { mobileUrl: url })} />
                  <p className="text-xs font-semibold text-muted-foreground" dir="ltr">📱 {t('heroSlides.mobileHint')}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="w-28 space-y-1">
                  <Label>{t('heroSlides.order')}</Label>
                  <Input type="number" value={slide.sortOrder}
                    onChange={(e) => update(slide.key, { sortOrder: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  {slide.id !== null && (
                    <Button type="button" variant="destructive" onClick={() => confirmDelete(slide)}>
                      <Trash2 className="h-4 w-4" />
                      {t('common.delete')}
                    </Button>
                  )}
                  {slide.id === null && (
                    <Button type="button" variant="outline" onClick={() => confirmDelete(slide)}>
                      <Trash2 className="h-4 w-4" />
                      {t('common.cancel')}
                    </Button>
                  )}
                  <Button type="submit" disabled={saveMutation.isPending || !slide.desktopUrl}>
                    {(saveMutation.isPending && saveMutation.variables?.key === slide.key) && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Save className="h-4 w-4" />
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            </form>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('heroSlides.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription dir="rtl">{deleting?.titleAr || deleting?.titleEn || deleting?.desktopUrl}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && deleteMutation.mutate(deleting)}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
