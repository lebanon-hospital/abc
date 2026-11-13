'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const Sheet = DialogPrimitive.Root
const SheetTitle = DialogPrimitive.Title
const SheetDescription = DialogPrimitive.Description

function SheetContent({ children, className, closeLabel = 'Close', ...props }: ComponentProps<typeof DialogPrimitive.Content> & { closeLabel?: string }) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="booking-sheet-overlay fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
    <DialogPrimitive.Content className={cn('booking-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-2xl border border-border bg-card text-card-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom', className)} {...props}>
      <div aria-hidden="true" className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border" />
      {children}
      <DialogPrimitive.Close aria-label={closeLabel} className="absolute end-4 top-4 rounded-md p-2 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand"><X className="size-5" /></DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
}

export { Sheet, SheetContent, SheetTitle, SheetDescription }
