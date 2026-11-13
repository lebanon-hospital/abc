'use client'

import { useEffect, useId, useState } from 'react'
import CreatableSelect from 'react-select/creatable'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

type Option = { value: string; label: string }
export function PaymentFields({ locale, paymentType, insuranceCompany, onPaymentChange, onCompanyChange }: {
  locale: 'ar' | 'en'; paymentType: string; insuranceCompany: string; onPaymentChange: (value: string) => void; onCompanyChange: (value: string) => void
}) {
  const ar = locale === 'ar'
  const id = useId()
  const [companies, setCompanies] = useState<Option[]>([])
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/partners?locale=${locale}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((body: { data: { name: string; category: string }[] }) => setCompanies(body.data.filter(item => item.category === 'insurance').map(item => ({ value: item.name, label: item.name }))))
      .catch(() => {})
    return () => controller.abort()
  }, [locale])
  return <>
    <div className={`hero-field payment-method-field ${paymentType === 'cash' ? 'hero-field-wide' : ''}`}>
      <label htmlFor={`${id}-payment`}>{ar ? 'طريقة الدفع' : 'Payment method'}</label>
      <Select value={paymentType} onValueChange={value => { onPaymentChange(value); onCompanyChange('') }} dir={ar ? 'rtl' : 'ltr'}>
        <SelectTrigger id={`${id}-payment`} className="hero-select"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="cash">{ar ? 'نقدي' : 'Cash'}</SelectItem><SelectItem value="insurance">{ar ? 'تأمين' : 'Insurance'}</SelectItem></SelectContent>
      </Select>
    </div>
    {paymentType === 'insurance' && <div className="hero-field insurance-company-field">
      <label htmlFor={`${id}-company`}>{ar ? 'شركة التأمين' : 'Insurance company'} *</label>
      <CreatableSelect<Option> instanceId={id} inputId={`${id}-company`} className="searchable-select hero-select" classNamePrefix="searchable-select" isRtl={ar} isSearchable required components={{ IndicatorSeparator: null }} options={companies}
        value={insuranceCompany ? { value: insuranceCompany, label: insuranceCompany } : null}
        onChange={option => onCompanyChange(option?.value ?? '')}
        onCreateOption={value => onCompanyChange(value.trim().slice(0, 120))}
        placeholder={ar ? 'اختر أو اكتب اسم الشركة' : 'Select or enter a company'}
        formatCreateLabel={value => ar ? `استخدم «${value}»` : `Use “${value}”`}
        noOptionsMessage={() => ar ? 'اكتب اسم الشركة' : 'Enter a company name'}
        styles={{ control: base => ({ ...base, minHeight:48, borderColor:'#dfdfd7', borderRadius:6, backgroundColor:'#fff', fontSize:13 }), input: base => ({ ...base, color:'#252c28' }), singleValue: base => ({ ...base, color:'#252c28' }), menu: base => ({ ...base, width:'100%', zIndex:60, backgroundColor:'#fff', color:'#252c28' }), option: (base, state) => ({ ...base, color:'#252c28', backgroundColor:state.isFocused ? '#f3e9d9' : '#fff' }) }} />
      <p className="mt-1 text-xs text-muted-foreground">{ar ? 'لو الشركة مش موجودة، اكتب اسمها واختاره.' : 'Company missing? Type its name and select it.'}</p>
    </div>}
  </>
}
