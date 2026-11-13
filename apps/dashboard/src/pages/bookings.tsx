import { useState, type FormEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Phone, Plus } from 'lucide-react'
import { api } from '@/api/client'
import { useI18n } from '@/lib/i18n'
import { toast } from 'sonner'
import { formatDateTime, formatDate, formatTime } from '@/lib/format'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PhoneInput } from '@/components/shared/phone-input'
import { WhatsAppIcon } from '@/components/shared/whatsapp-icon'
import { DEFAULT_PAGE_SIZE, TablePagination } from '@/components/shared/table-pagination'

type Booking = {
  id: string
  paymentType: 'cash' | 'insurance'
  insuranceCompany: string | null
  requestStage: 'draft' | 'complete'
  patientName: string
  phone: string
  source: 'website' | 'walk_in' | 'phone'
  departmentId: string | null
  departmentSlug: string | null
  departmentNameAr: string | null
  departmentNameEn: string | null
  doctorId: string | null
  doctorNameAr: string | null
  doctorNameEn: string | null
  preferredDate: string | null
  patientNotes: string | null
  status: 'new' | 'contacted' | 'confirmed' | 'declined' | 'cancelled' | 'completed'
  appointmentDate: string | null
  appointmentTime: string | null
  staffNotes: string | null
  createdAt: string
}

type ListResponse = { data: Booking[]; page: number; limit: number; total: number }

const STATUSES = ['new', 'contacted', 'confirmed', 'completed', 'declined', 'cancelled'] as const


type ManualForm = {
  paymentType: 'cash' | 'insurance'
  insuranceCompany: string
  patientName: string
  phone: string
  source: 'walk_in' | 'phone'
  departmentId: string
  appointmentDate: string
  appointmentTime: string
  staffNotes: string
}

const emptyManual: ManualForm = {
  paymentType: 'cash',
  insuranceCompany: '',
  patientName: '',
  phone: '',
  source: 'walk_in',
  departmentId: '',
  appointmentDate: '',
  appointmentTime: '',
  staffNotes: '',
}

export function BookingsPage() {
  const { t, tLabel, locale } = useI18n()
  const ar = locale === 'ar'
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [stageFilter,setStageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [detail, setDetail] = useState<Booking | null>(null)
  const [detailPayment, setDetailPayment] = useState<'cash' | 'insurance'>('cash')
  const [detailCompany, setDetailCompany] = useState('')
  const [detailNotes, setDetailNotes] = useState('')
  const [detailDate, setDetailDate] = useState('')
  const [detailTime, setDetailTime] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState<ManualForm>(emptyManual)
  const [error, setError] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['bookings', page, pageSize, statusFilter, sourceFilter, stageFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
      if(stageFilter !== 'all')params.set('requestStage',stageFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (sourceFilter !== 'all') params.set('source', sourceFilter)
      return api<ListResponse>(`/bookings/admin/?${params}`)
    },
    placeholderData: keepPreviousData,
    refetchInterval:15000,
  })

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: () => api<{ data: Array<{ id: string; nameAr: string }> }>('/departments/admin/'),
    placeholderData: keepPreviousData,
  })

  const partnersQuery = useQuery({ queryKey: ['booking-insurance', locale], queryFn: () => api<{ data: { name: string; category: string }[] }>(`/content/partners?locale=${locale}`) })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['bookings'] })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api<Booking>(`/bookings/admin/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => { invalidate(); toast.success(t('toast.saved')) },
    onError: (e: Error) => toast.error(e.message),
  })

  const detailMutation = useMutation({
    mutationFn: async () => {
      if (!detail) throw new Error('no booking')
      return api<Booking>(`/bookings/admin/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType: detailPayment,
          insuranceCompany: detailPayment === 'insurance' ? detailCompany.trim() : null,
          appointmentDate: detailDate || null,
          appointmentTime: detailTime || null,
          staffNotes: detailNotes || null,
        }),
      })
    },
    onSuccess: () => {
      invalidate()
      setDetail(null)
      toast.success(t('toast.saved'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const manualMutation = useMutation({
    mutationFn: () =>
      api<Booking>('/bookings/admin/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType: manual.paymentType,
          insuranceCompany: manual.paymentType === 'insurance' ? manual.insuranceCompany.trim() : undefined,
          patientName: manual.patientName.trim(),
          phone: manual.phone,
          source: manual.source,
          departmentId: manual.departmentId || undefined,
          appointmentDate: manual.appointmentDate || undefined,
          appointmentTime: manual.appointmentTime || undefined,
          staffNotes: manual.staffNotes || undefined,
        }),
      }),
    onSuccess: () => {
      invalidate()
      setManualOpen(false)
      setManual(emptyManual)
      setError(null)
      toast.success(t('toast.saved'))
    },
    onError: (e: Error) => { setError(e.message); toast.error(e.message) },
  })

  function openDetail(b: Booking) {
    setDetailPayment(b.paymentType ?? 'cash')
    setDetailCompany(b.insuranceCompany ?? '')
    setDetail(b)
    setDetailNotes(b.staffNotes ?? '')
    setDetailDate(b.appointmentDate ?? '')
    setDetailTime(b.appointmentTime ?? '')
  }

  function paymentFields(value: 'cash' | 'insurance', company: string, change: (value: 'cash' | 'insurance') => void, changeCompany: (value: string) => void, prefix: string) {
    return <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor={`${prefix}-payment`}>{ar ? 'طريقة الدفع' : 'Payment method'}</Label><Select value={value} onValueChange={v => { change(v === 'insurance' ? 'insurance' : 'cash'); changeCompany('') }}><SelectTrigger id={`${prefix}-payment`} className="w-full"><SelectValue>{value === 'insurance' ? (ar ? 'تأمين' : 'Insurance') : (ar ? 'نقدي' : 'Cash')}</SelectValue></SelectTrigger><SelectContent><SelectItem value="cash">{ar ? 'نقدي' : 'Cash'}</SelectItem><SelectItem value="insurance">{ar ? 'تأمين' : 'Insurance'}</SelectItem></SelectContent></Select></div>
      {value === 'insurance' && <div className="space-y-2"><Label htmlFor={`${prefix}-company`}>{ar ? 'شركة التأمين' : 'Insurance company'}</Label><Input id={`${prefix}-company`} list={`${prefix}-companies`} value={company} maxLength={120} required onChange={e => changeCompany(e.target.value)} placeholder={ar ? 'اختر أو اكتب اسم الشركة' : 'Select or type a company'} /><datalist id={`${prefix}-companies`}>{partnersQuery.data?.data.filter(p => p.category === 'insurance').map(p => <option key={p.name} value={p.name} />)}</datalist></div>}
    </div>
  }

  const statusBadge = (status: string) => {
    const variant =
      status === 'new' ? 'default' : status === 'confirmed' || status === 'completed' ? 'secondary' : 'outline'
    return <Badge variant={variant}>{tLabel(`bookings.status.${status}`)}</Badge>
  }

  const rows = listQuery.data?.data ?? []
  const departments = departmentsQuery.data?.data ?? []

  return (
    <div className="space-y-4 p-3 lg:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-xl font-bold sm:text-2xl">{t('bookings.title')}</h1>
        <Button onClick={() => setManualOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('bookings.manual')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={stageFilter} onValueChange={value=>{setStageFilter(value ?? 'all');setPage(1)}}><SelectTrigger className="h-9 w-44"><SelectValue>{stageFilter==='draft'?(ar?'بيانات مبدئية':'Initial details'):stageFilter==='complete'?(ar?'طلبات مكتملة البيانات':'Completed requests'):(ar?'كل مراحل الطلب':'All request stages')}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">{ar?'كل مراحل الطلب':'All request stages'}</SelectItem><SelectItem value="draft">{ar?'بيانات مبدئية':'Initial details'}</SelectItem><SelectItem value="complete">{ar?'طلبات مكتملة البيانات':'Completed requests'}</SelectItem></SelectContent></Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? 'all'); setPage(1) }}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue>
              {statusFilter === 'all' ? t('bookings.allStatuses') : tLabel(`bookings.status.${statusFilter}`)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={String(s)}>{tLabel(`bookings.status.${s}`)}</SelectItem>
            ))}
            <SelectItem value="all">{t('bookings.allStatuses')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v ?? 'all'); setPage(1) }}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue>
              {sourceFilter === 'all' ? t('bookings.allSources') : tLabel(`bookings.source.${sourceFilter}`)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(['website', 'walk_in', 'phone'] as const).map((s) => (
              <SelectItem key={s} value={s}>{tLabel(`bookings.source.${s}`)}</SelectItem>
            ))}
            <SelectItem value="all">{t('bookings.allSources')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-160">
          <TableHeader>
            <TableRow>
              <TableHead>{t('submissions.name')}</TableHead>
              <TableHead>{t('submissions.phone')}</TableHead>
              <TableHead>{ar ? 'الدفع / شركة التأمين' : 'Payment / insurance company'}</TableHead>
              <TableHead>{t('departments.title')}</TableHead>
              <TableHead>{t('doctors.title')}</TableHead>
              <TableHead>{t('submissions.status')}</TableHead>
              <TableHead>{t('bookings.appointment')}</TableHead>
              <TableHead>{t('bookings.source.label')}</TableHead>
              <TableHead>{t('common.date')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(9)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  {t('bookings.none')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((b) => (
                <TableRow key={b.id} className="cursor-pointer" onClick={() => openDetail(b)}>
                  <TableCell className="font-medium">{b.patientName}{b.requestStage==='draft' && <Badge variant="outline" className="mt-1 block w-fit text-xs">{ar?'بيانات مبدئية':'Initial details'}</Badge>}</TableCell>
                  <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <span dir="ltr">{b.phone}</span>
                      <a
                        href={`https://wa.me/${b.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="WhatsApp"
                        className="text-muted-foreground transition-colors hover:text-green-600"
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                      </a>
                      <a
                        href={`tel:${b.phone}`}
                        aria-label="Call"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>{b.requestStage === 'draft' ? (ar ? 'لم يُحدد' : 'Not specified') : b.paymentType === 'insurance' ? `${ar ? 'تأمين' : 'Insurance'} — ${b.insuranceCompany ?? '—'}` : (ar ? 'نقدي' : 'Cash')}</TableCell>
                  <TableCell dir="rtl">{b.departmentNameAr ?? '—'}</TableCell>
                  <TableCell dir="rtl">{b.doctorNameAr ?? '—'}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={b.status}
                      onValueChange={(status) => statusMutation.mutate({ id: b.id, status: status ?? 'new' })}
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue>{tLabel(`bookings.status.${b.status}`)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{tLabel(`bookings.status.${s}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell dir="ltr" className="whitespace-nowrap text-muted-foreground">
                    {b.appointmentDate
                      ? `${formatDate(b.appointmentDate)}${b.appointmentTime ? ` ${formatTime(b.appointmentTime)}` : ''}`
                      : '—'}
                  </TableCell>
                  <TableCell>{tLabel(`bookings.source.${b.source}`)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground" dir="ltr">
                    {formatDateTime(b.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={page}
        pageSize={pageSize}
        total={listQuery.data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />

      {/* Detail / manage dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.patientName}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <a href={`tel:${detail.phone}`} className="flex items-center gap-1.5 hover:text-foreground" dir="ltr">
                  <Phone className="h-4 w-4" /> {detail.phone}
                </a>
                {statusBadge(detail.status)}
                {detail.doctorNameAr && (
                  <span dir="rtl">{detail.doctorNameAr}</span>
                )}
                {detail.preferredDate && (
                  <span>{t('bookings.preferred')}: {detail.preferredDate}</span>
                )}
              </div>
              {detail.requestStage==='draft' && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{ar?'الاسم ورقم الهاتف محفوظان مبدئيًا. العميل لم يُكمل طلب الموعد بعد.':'Name and phone saved. The patient has not completed the appointment request yet.'}</p>}
              {paymentFields(detailPayment, detailCompany, setDetailPayment, setDetailCompany, 'detail')}
              {detail.patientNotes && (
                <p className="rounded-lg border bg-muted/50 p-3 text-sm leading-relaxed">{detail.patientNotes}</p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('bookings.appointmentDate')}</Label>
                  <Input type="date" dir="ltr" value={detailDate} onChange={(e) => setDetailDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('bookings.appointmentTime')}</Label>
                  <Input type="time" dir="ltr" value={detailTime} onChange={(e) => setDetailTime(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('bookings.staffNotes')}</Label>
                <Textarea rows={3} value={detailNotes} onChange={(e) => setDetailNotes(e.target.value)} />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>{t('common.cancel')}</Button>
                <Button onClick={() => detailMutation.mutate()} disabled={detailMutation.isPending || (detailPayment === 'insurance' && !detailCompany.trim())}>
                  {detailMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual entry dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('bookings.manual')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); manualMutation.mutate() }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>{t('submissions.name')}</Label>
              <Input required value={manual.patientName} onChange={(e) => setManual((m) => ({ ...m, patientName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('submissions.phone')}</Label>
              <PhoneInput value={manual.phone} onChange={(v) => setManual((m) => ({ ...m, phone: v }))} />
            </div>
            {paymentFields(manual.paymentType, manual.insuranceCompany, value => setManual(m => ({ ...m, paymentType: value })), value => setManual(m => ({ ...m, insuranceCompany: value })), 'manual')}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('bookings.source.label')}</Label>
                <Select value={manual.source} onValueChange={(v) => setManual((m) => ({ ...m, source: (v ?? 'walk_in') as 'walk_in' | 'phone' }))}>
                  <SelectTrigger className="w-full"><SelectValue>{tLabel(`bookings.source.${manual.source}`)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk_in">{tLabel('bookings.source.walk_in')}</SelectItem>
                    <SelectItem value="phone">{tLabel('bookings.source.phone')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('departments.title')}</Label>
                <Select value={manual.departmentId || 'none'} onValueChange={(v) => setManual((m) => ({ ...m, departmentId: v === 'none' ? '' : (v ?? '') }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue dir="rtl">{manual.departmentId ? (departments.find((d) => d.id === manual.departmentId)?.nameAr ?? '—') : '—'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id} dir="rtl">{d.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('bookings.appointmentDate')}</Label>
                <Input type="date" dir="ltr" value={manual.appointmentDate} onChange={(e) => setManual((m) => ({ ...m, appointmentDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('bookings.appointmentTime')}</Label>
                <Input type="time" dir="ltr" value={manual.appointmentTime} onChange={(e) => setManual((m) => ({ ...m, appointmentTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('bookings.staffNotes')}</Label>
              <Textarea rows={2} value={manual.staffNotes} onChange={(e) => setManual((m) => ({ ...m, staffNotes: e.target.value }))} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setManualOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={manualMutation.isPending}>
                {manualMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
