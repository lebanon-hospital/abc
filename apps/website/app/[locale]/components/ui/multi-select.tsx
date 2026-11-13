'use client'

import { useId } from 'react'
import ReactSelect from 'react-select'
export type FilterOption = { value: string; label: string }
export function MultiSelect({ id, locale, options, value, onChange, placeholder, closeMenuOnSelect = false }: { id?:string; locale:'ar'|'en'; options:FilterOption[]; value:string[]; onChange:(values:string[])=>void; placeholder:string; closeMenuOnSelect?:boolean }) {
  const instanceId = useId()
  return <ReactSelect<FilterOption,true> instanceId={instanceId} inputId={id} isMulti isSearchable isClearable closeMenuOnSelect={closeMenuOnSelect} hideSelectedOptions={false} isRtl={locale === 'ar'} className="searchable-select directory-multi-select" classNamePrefix="searchable-select" components={{ IndicatorSeparator:null }} options={options} value={options.filter(option => value.includes(option.value))} onChange={options => onChange(options.map(option => option.value))} placeholder={placeholder} noOptionsMessage={() => locale === 'ar' ? 'لا توجد نتائج' : 'No results'}
    styles={{ control: (base,state) => ({ ...base,minHeight:48,borderColor:state.isFocused ? '#b8934f' : '#dfdfd7',borderRadius:8,backgroundColor:'#fff',boxShadow:state.isFocused ? '0 0 0 2px #b8934f20' : 'none',fontSize:14 }), input:base => ({ ...base,color:'#252c28' }), singleValue:base => ({ ...base,color:'#252c28' }), multiValue:base => ({ ...base,backgroundColor:'#f3ecdf',borderRadius:5 }),multiValueLabel:base=>({...base,color:'#5f4b2c',fontSize:12}),multiValueRemove:base=>({...base,color:'#776343',':hover':{backgroundColor:'#e9dcc5',color:'#252c28'}}), menu:base=>({...base,zIndex:45,color:'#252c28',backgroundColor:'#fff',width:'100%'}),option:(base,state)=>({...base,color:'#252c28',backgroundColor:state.isSelected?'#f3ecdf':state.isFocused?'#f8f5ef':'#fff',fontSize:14,cursor:'pointer'}) }} />
}
