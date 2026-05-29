'use client'

import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { PhotoUpload } from './photo-upload'

interface Props {
  deficitId: string
  category: string
  description: string
  costToCure: number
  userId?: string
  protestId?: string
  previewMode?: boolean
  // Preview mode only: called when user picks/snaps a photo
  onPreviewPhoto?: (file: File) => void
  // Preview mode only: object URLs of locally-stored photos
  previewPhotoUrls?: string[]
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

export function DeficitCard({
  deficitId, category, description, costToCure,
  userId, protestId, previewMode,
  onPreviewPhoto, previewPhotoUrls,
}: Props) {
  const previewInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.12em]">{category}</p>
          <p className="text-sm text-foreground leading-snug">{description}</p>
        </div>
        <p className="text-sm font-semibold text-foreground shrink-0">{fmt(costToCure)}</p>
      </div>

      {/* Authenticated mode: upload directly to Supabase */}
      {!previewMode && userId && protestId && (
        <PhotoUpload deficitId={deficitId} userId={userId} protestId={protestId} />
      )}

      {/* Preview mode: store locally as object URLs, show thumbnails */}
      {onPreviewPhoto && (
        <div className="space-y-2">
          {previewPhotoUrls && previewPhotoUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {previewPhotoUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${category} photo ${i + 1}`}
                  className="h-16 w-16 rounded-lg object-cover border border-border"
                />
              ))}
            </div>
          )}
          <input
            ref={previewInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                onPreviewPhoto(file)
                e.target.value = ''
              }
            }}
          />
          <button
            type="button"
            onClick={() => previewInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
            {previewPhotoUrls && previewPhotoUrls.length > 0 ? 'Add another photo' : 'Add photo'}
          </button>
        </div>
      )}
    </div>
  )
}
