import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import {
  Bold, Italic, List, ListOrdered, Loader2, Redo2, Strikethrough, Undo2,
  Heading2, Heading3, ImagePlus, RemoveFormatting, Quote, Minus,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/api/client'

type Props = {
  value: string // HTML
  onChange: (html: string) => void
  dir?: 'rtl' | 'ltr'
  placeholder?: string
  readOnly?: boolean
}

const btn =
  'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40'

/** upload an image via /storage/images (compressed to WebP on the backend) */
async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('not an image')
  const form = new FormData()
  form.append('file', file)
  const res = await api<{ url: string }>('/storage/images', { method: 'POST', body: form })
  return res.url
}

/**
 * Lightweight TipTap rich-text editor storing HTML.
 * Used for bilingual department/service content.
 * Images upload to /storage/images via the toolbar button, drag & drop, or paste.
 */
export function RichTextEditor({ value, onChange, dir = 'ltr', placeholder, readOnly = false }: Props) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // editorProps handlers are created once, so they must reach the fresh editor
  // through a ref instead of a stale first-render closure
  const insertRef = useRef<(file: File) => void>(() => {})

  const editor = useEditor({
    extensions: [StarterKit, Image.configure({ inline: false, allowBase64: false })],
    editable: !readOnly,
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        dir,
        class: 'prose-tiptap min-h-64 rounded-b-lg border-t border-border px-3 py-2.5 text-sm leading-relaxed outline-none',
        'data-placeholder': placeholder ?? '',
      },
      handlePaste: (_view, event) => {
        const file = event.clipboardData?.files?.[0]
        if (!file) return false // let TipTap handle plain text/HTML paste
        event.preventDefault()
        insertRef.current(file)
        return true
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false // internal node drag, not a file drop
        const file = event.dataTransfer?.files?.[0]
        if (!file) return false
        event.preventDefault()
        insertRef.current(file)
        return true
      },
    },
    onUpdate: ({ editor: e }) => {
      // emit empty string (not '<p></p>') when there is no real content
      const text = e.getText().trim()
      onChange(text ? e.getHTML() : '')
    },
  })

  async function insertUploaded(file: File) {
    if (!editor) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      editor.chain().focus().setImage({ src: url, alt: file.name.replace(/\.[^.]+$/, '') }).run()
    } catch (e) {
      console.error('image upload failed:', e)
    } finally {
      setUploading(false)
    }
  }
  insertRef.current = insertUploaded

  // keep editor in sync when the parent resets the form (open create/edit dialog)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      const text = editor.getText().trim()
      if (!value && !text) return // both empty, nothing to do
      editor.commands.setContent(value || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!editor) return null

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {!readOnly && <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/50 p-1">
        <button type="button" className={btn} onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} aria-label="Bold"><Bold className="h-4 w-4" /></button>
        <button type="button" className={btn} onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} aria-label="Italic"><Italic className="h-4 w-4" /></button>
        <button type="button" className={btn} onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} aria-label="Strikethrough"><Strikethrough className="h-4 w-4" /></button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={btn} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading 2"><Heading2 className="h-4 w-4" /></button>
        <button type="button" className={btn} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Heading 3"><Heading3 className="h-4 w-4" /></button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={btn} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list"><List className="h-4 w-4" /></button>
        <button type="button" className={btn} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Numbered list"><ListOrdered className="h-4 w-4" /></button>
        <button type="button" className={btn} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Quote"><Quote className="h-4 w-4" /></button>
        <button type="button" className={btn} onClick={() => editor.chain().focus().setHorizontalRule().run()} aria-label="Divider"><Minus className="h-4 w-4" /></button>
        <button
          type="button"
          className={btn}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Insert image"
          title="Insert image"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/tiff"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = '' // allow picking the same file again
            if (file) void insertUploaded(file)
          }}
        />
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={btn} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} aria-label="Clear formatting"><RemoveFormatting className="h-4 w-4" /></button>
        <span className="ms-auto flex gap-0.5">
          <button type="button" className={btn} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} aria-label="Undo"><Undo2 className="h-4 w-4" /></button>
          <button type="button" className={btn} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} aria-label="Redo"><Redo2 className="h-4 w-4" /></button>
        </span>
      </div>}
      <EditorContent editor={editor} />
    </div>
  )
}
