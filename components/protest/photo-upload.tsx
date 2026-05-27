'use client'

import { useRef, useState } from 'react'
import { Camera, CheckCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  deficitId: string
  userId: string
  protestId: string
}

export function PhotoUpload({ deficitId, userId, protestId }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const storagePath = `${userId}/${protestId}/${deficitId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('evidence-photos')
        .upload(storagePath, file, { upsert: false })

      if (uploadError) throw uploadError

      const { error: dbError } = await supabase
        .from('evidence_attachments')
        .insert({
          deficit_id: deficitId,
          storage_path: storagePath,
          attachment_type: 'photo',
        })

      if (dbError) throw dbError

      setUploaded(true)
      toast.success('Photo added to your evidence packet.')
    } catch (err) {
      toast.error('Upload failed. Please try again.')
      console.error(err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  if (uploaded) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-accent font-medium">
        <CheckCircle className="h-3.5 w-3.5" />
        Photo added
      </div>
    )
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
        disabled={uploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={uploading ? 'Uploading photo' : 'Add photo evidence'}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
        {uploading ? 'Uploading…' : 'Add photo'}
      </button>
    </>
  )
}
