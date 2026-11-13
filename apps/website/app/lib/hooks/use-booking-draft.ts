'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

const storageKey='abc:booking-request-key'
let memoryKey:string|undefined
let writes:Promise<unknown>=Promise.resolve()
function key() {
 try {
  const existing=sessionStorage.getItem(storageKey)
  if(existing){memoryKey=existing;return existing}
  memoryKey=crypto.randomUUID()
  sessionStorage.setItem(storageKey,memoryKey)
 } catch { memoryKey ??=crypto.randomUUID() }
 return memoryKey!
}
function serialize<T>(operation:()=>Promise<T>):Promise<T> {
 const next=writes.catch(()=>{}).then(operation)
 writes=next.catch(()=>{})
 return next
}

export function useBookingDraft({name,phone,country,enabled=true}:{name:string;phone:string;country:CountryCode;enabled?:boolean}) {
 const [state,setState]=useState<'idle'|'saving'|'saved'|'error'>('idle')
 const lastSaved=useRef('')
 const completing=useRef(false)
 const generation=useRef(0)
 useEffect(()=>{
  if(!enabled || completing.current || !window.matchMedia('(max-width:800px)').matches)return
  const parsed=parsePhoneNumberFromString(phone,country)
  if(name.trim().length<2 || name.trim().length>120 || !parsed?.isValid())return
  const signature=JSON.stringify({patientName:name.trim(),phone:parsed.number})
  if(signature===lastSaved.current)return
  const ticket=++generation.current
  const requestKey=key()
  const timer=setTimeout(()=>{
   if(completing.current)return
   setState('saving')
   serialize(async()=>{
    if(completing.current || ticket!==generation.current)return
    const response=await fetch('/api/bookings/draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestKey,...JSON.parse(signature)})})
    if(!response.ok)throw new Error('Draft save failed')
    lastSaved.current=signature
    if(ticket===generation.current)setState('saved')
   }).catch(()=>{if(ticket===generation.current)setState('error')})
  },900)
  return ()=>{clearTimeout(timer); if(generation.current===ticket)generation.current++}
 },[name,phone,country,enabled])

 const complete=useCallback(async(payload:Record<string,unknown>)=>{
  completing.current=true
  generation.current++
  const requestKey=key()
  try {
   const response=await serialize(()=>fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestKey})}))
   if(!response.ok)throw new Error('Booking failed')
   try { if(sessionStorage.getItem(storageKey)===requestKey)sessionStorage.removeItem(storageKey) } catch {}
   if(memoryKey===requestKey)memoryKey=undefined
   lastSaved.current=''
   setState('idle')
   return response
  } finally { completing.current=false }
 },[])
 return {state,complete}
}
