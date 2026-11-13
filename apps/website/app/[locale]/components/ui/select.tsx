'use client'

import * as React from 'react'
import ReactSelect from 'react-select'

type PartProps = { children?: React.ReactNode; className?: string; id?: string; value?: string; textValue?: string; disabled?: boolean; 'aria-label'?: string; 'aria-invalid'?: boolean }
type Option = { value: string; label: string; content: React.ReactNode }

// These parts keep the existing declarative API for options and labels.
function SelectTrigger(_props: PartProps) { return null }
function SelectContent(_props: PartProps) { return null }
function SelectItem(_props: PartProps) { return null }
function SelectValue(_props: PartProps) { return null }

function plainText(node: React.ReactNode): string {
  return React.Children.toArray(node).map((child) => React.isValidElement<PartProps>(child) ? plainText(child.props.children) : String(child)).join('')
}

function Select({ children, value, onValueChange, disabled, dir = 'ltr' }: {
  children: React.ReactNode; value?: string; onValueChange?: (value: string) => void; disabled?: boolean; dir?: 'ltr' | 'rtl'
}) {
  const parts = React.Children.toArray(children).filter(React.isValidElement<PartProps>)
  const trigger = parts.find((part) => part.type === SelectTrigger)?.props
  const content = parts.find((part) => part.type === SelectContent)?.props
  const options: Option[] = React.Children.toArray(content?.children).filter(React.isValidElement<PartProps>).map((part) => ({
    value: part.props.value ?? '', label: part.props.textValue ?? plainText(part.props.children), content: part.props.children,
  }))
  const customValue = React.Children.toArray(trigger?.children).find((part) => React.isValidElement<PartProps>(part) && part.type === SelectValue)
  const display = React.isValidElement<PartProps>(customValue) ? customValue.props.children : undefined
  const generatedId = React.useId()
  const ar = dir === 'rtl'
  return <ReactSelect<Option>
    instanceId={generatedId}
    inputId={trigger?.id}
    aria-label={trigger?.['aria-label']}
    aria-invalid={trigger?.['aria-invalid']}
    className={`searchable-select ${trigger?.className ?? ''}`}
    classNamePrefix="searchable-select"
    isRtl={ar}
    isSearchable
    components={{ IndicatorSeparator: null }}
    isDisabled={disabled}
    options={options}
    value={options.find((option) => option.value === value) ?? null}
    onChange={(option) => { if (option) onValueChange?.(option.value) }}
    formatOptionLabel={(option, meta) => meta.context === 'value' && display ? display : option.content}
    placeholder={ar ? 'ابحث أو اختر' : 'Search or select'}
    noOptionsMessage={() => ar ? 'لا توجد نتائج' : 'No results found'}
    menuPlacement="auto"
    styles={{
      control: (base, state) => ({ ...base, minHeight: 47, height: '100%', borderRadius: 6, backgroundColor: state.isDisabled ? '#f2f1ec' : '#fff', borderColor: state.isFocused ? '#b8934f' : '#dfdfd7', boxShadow: state.isFocused ? '0 0 0 2px #b8934f30' : 'none', fontSize: 13 }),
      input: (base) => ({ ...base, color: '#252c28' }),
      singleValue: (base) => ({ ...base, color: '#252c28' }),
      placeholder: (base) => ({ ...base, color: '#6e746e' }),
      menu: (base) => ({ ...base, width: '100%', minWidth: '100%', zIndex: 60, backgroundColor: '#fff', color: '#252c28' }),
      option: (base, state) => ({ ...base, color: '#252c28', backgroundColor: state.isSelected ? '#f3e9d9' : state.isFocused ? '#f7f3ec' : '#fff', cursor: 'pointer', fontSize: 14 }),
    }}
  />
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
