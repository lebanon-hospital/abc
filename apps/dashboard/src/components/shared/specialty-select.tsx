import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command'
export function SpecialtySelect({options,value,onChange,ar}:{options:{id:string;nameAr:string}[];value:string[];onChange:(value:string[])=>void;ar:boolean}) {
 const [open,setOpen]=useState(false)
 return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger render={<Button type="button" variant="outline" className="h-auto min-h-10 w-full justify-between whitespace-normal text-start font-normal" />}><span>{value.length ? options.filter(d=>value.includes(d.id)).map(d=>d.nameAr).join('، ') : (ar?'اختر تخصصًا أو أكثر':'Select one or more specialties')}</span><ChevronsUpDown className="ms-2 size-4 shrink-0 text-muted-foreground"/></PopoverTrigger><PopoverContent className="w-(--anchor-width) min-w-64 p-0" align="start"><Command><CommandInput placeholder={ar?'ابحث عن تخصص…':'Search specialties…'}/><CommandList><CommandEmpty>{ar?'لا توجد نتائج':'No results'}</CommandEmpty>{options.map(d=><CommandItem key={d.id} value={d.nameAr} onSelect={()=>onChange(value.includes(d.id)?value.filter(id=>id!==d.id):[...value,d.id])}><Check className={`size-4 ${value.includes(d.id)?'opacity-100':'opacity-0'}`}/>{d.nameAr}</CommandItem>)}</CommandList></Command></PopoverContent></Popover>
}
