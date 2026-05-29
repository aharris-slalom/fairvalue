'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Camera, Loader2, Send, Volume2, VolumeX } from 'lucide-react'
import { toast } from 'sonner'
import type { PropertyData, Deficit } from '@/lib/store/protest-store'
import { useProtestStore } from '@/lib/store/protest-store'
import { lockProtestValue } from '@/lib/actions/computation'
import { saveAuditNarrative } from '@/lib/actions/narrative'
import { createClient } from '@/lib/supabase/client'
import { ChatBubble } from './chat-bubble'
import { DeficitCard } from './deficit-card'
import { VoiceButton } from './voice-button'

interface DeficitToolOutput {
  success: boolean
  deficitId?: string
}

interface DeficitToolInput {
  category: string
  user_description: string
  estimated_cost_to_cure: number
}

interface ToolPart {
  type: string
  toolCallId: string
  toolName?: string   // present on dynamic-tool parts
  state: string
  input?: DeficitToolInput
  output?: DeficitToolOutput
}

function isLogDeficitPart(p: ToolPart): boolean {
  return p.type === 'tool-log_deficit' || (p.type === 'dynamic-tool' && p.toolName === 'log_deficit')
}

interface Props {
  protestId?: string
  property: PropertyData
  userId?: string
  existingDeficits?: Deficit[]
  previewMode?: { propertyId: string; argumentType: string | null }
  onPreviewFinish?: (deficits: Deficit[], transcript: string, photosByPreviewId: Record<string, string[]>) => Promise<void>
}

export function Phase3Audit({ protestId, property, userId, existingDeficits = [], previewMode, onPreviewFinish }: Props) {
  const [input, setInput] = useState('')
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [locking, setLocking] = useState(false)
  const [auditComplete, setAuditComplete] = useState(false)
  const [lastDeficitId, setLastDeficitId] = useState<string | null>(null)
  const [attachingPhoto, setAttachingPhoto] = useState(false)
  // Preview mode only: blob URLs for display, keyed by preview deficit ID
  const [previewPhotos, setPreviewPhotos] = useState<Map<string, string[]>>(new Map())
  // Preview mode only: Supabase storage paths, keyed by preview deficit ID
  const [previewPhotoStoragePaths, setPreviewPhotoStoragePaths] = useState<Map<string, string[]>>(new Map())
  // Preview mode only: number of photo uploads currently in flight
  const [uploadingCount, setUploadingCount] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inlinePhotoRef = useRef<HTMLInputElement>(null)
  const spokenMessageIds = useRef<Set<string>>(new Set())

  const setTargetValue = useProtestStore((s) => s.setTargetValue)
  const setPhase = useProtestStore((s) => s.setPhase)
  const deficits = useProtestStore((s) => s.deficits)

  function buildTranscript(): string {
    return messages
      .map((msg) => {
        const textPart = msg.parts.find((p) => p.type === 'text') as
          | { type: 'text'; text: string }
          | undefined
        if (!textPart?.text) return null
        const label = (msg.role as string) === 'user' ? 'Homeowner' : 'Auditor'
        return `[${label}]: ${textPart.text}`
      })
      .filter(Boolean)
      .join('\n\n')
  }

  // Extract logged deficits directly from the messages array. This is the
  // source of truth in preview mode (deficits aren't written to DB until claim).
  function extractDeficitsFromMessages(): Deficit[] {
    const seen = new Set<string>()
    const result: Deficit[] = []
    for (const msg of messages) {
      for (const part of msg.parts) {
        const p = part as unknown as ToolPart
        if (!isLogDeficitPart(p)) continue
        if (p.state !== 'output-available') continue
        if (!p.output?.success || !p.output.deficitId) continue
        if (seen.has(p.output.deficitId)) continue
        seen.add(p.output.deficitId)
        result.push({
          id: p.output.deficitId,
          category: p.input?.category ?? '',
          user_description: p.input?.user_description ?? '',
          estimated_cost_to_cure: p.input?.estimated_cost_to_cure ?? 0,
        })
      }
    }
    return result
  }

  async function handleFinishAudit() {
    setLocking(true)
    try {
      if (previewMode && onPreviewFinish) {
        const extracted = extractDeficitsFromMessages()
        const photosByPreviewId: Record<string, string[]> = {}
        for (const [id, paths] of previewPhotoStoragePaths.entries()) {
          photosByPreviewId[id] = paths
        }
        await onPreviewFinish(extracted, buildTranscript(), photosByPreviewId)
      } else if (protestId) {
        const transcript = buildTranscript()
        const [result] = await Promise.all([
          lockProtestValue(protestId),
          transcript ? saveAuditNarrative(protestId, transcript) : Promise.resolve({ narrative: undefined }),
        ])
        if (result.error) {
          toast.error('Could not compute protest value. Please try again.')
          console.error('[finish audit]', result.error)
          return
        }
        setTargetValue(result.targetValue, result.savings, result.equityTarget, result.deficitTotal, result.compCount)
        toast.success('Audit complete — reviewing your protest strategy.')
        setPhase(4)
      }
    } finally {
      setLocking(false)
    }
  }

  async function handleInlinePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !lastDeficitId || !userId || !protestId) return

    setAttachingPhoto(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const storagePath = `${userId}/${protestId}/${lastDeficitId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('evidence-photos')
        .upload(storagePath, file, { upsert: false })
      if (uploadError) throw uploadError

      const { error: dbError } = await supabase
        .from('evidence_attachments')
        .insert({ deficit_id: lastDeficitId, storage_path: storagePath, attachment_type: 'photo' })
      if (dbError) throw dbError

      toast.success('Photo added to your evidence packet.')
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setAttachingPhoto(false)
      if (inlinePhotoRef.current) inlinePhotoRef.current.value = ''
    }
  }

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: previewMode
        ? { mode: 'preview', propertyId: previewMode.propertyId, argumentType: previewMode.argumentType }
        : { protestId },
    }),
    messages: [
      {
        id: 'init',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: `Let's document your home's condition to build the strongest possible case for ${property.street_address}. I'll walk you through each major system one at a time. To start — how is your **roof**? Any issues with age, missing shingles, leaks, or storm damage?`,
          },
        ],
      },
    ],
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Speak the latest assistant message when streaming finishes
  useEffect(() => {
    if (!ttsEnabled || status !== 'ready') return
    const last = [...messages].reverse().find((m) => m.role === 'assistant')
    if (!last || spokenMessageIds.current.has(last.id)) return

    const textPart = last.parts.find((p) => p.type === 'text') as
      | { type: 'text'; text: string }
      | undefined
    if (!textPart?.text) return

    spokenMessageIds.current.add(last.id)
    const utt = new SpeechSynthesisUtterance(textPart.text.replace(/\*\*/g, ''))
    utt.rate = 1.05
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utt)
  }, [status, ttsEnabled, messages])

  // Stop TTS when user disables it
  useEffect(() => {
    if (!ttsEnabled) window.speechSynthesis?.cancel()
  }, [ttsEnabled])

  // Track the most recently logged deficit so the inline camera button knows where to attach
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      for (const part of messages[i].parts) {
        const p = part as unknown as ToolPart
        if (isLogDeficitPart(p) && p.output?.success && p.output.deficitId) {
          setLastDeficitId(p.output.deficitId)
          return
        }
      }
    }
  }, [messages])

  // Detect when the AI signals the audit is complete
  useEffect(() => {
    for (const msg of messages) {
      for (const part of msg.parts) {
        const p = part as unknown as ToolPart
        const isSignal = p.type === 'tool-signal_audit_complete' ||
          (p.type === 'dynamic-tool' && p.toolName === 'signal_audit_complete')
        if (isSignal && p.output?.success) {
          setAuditComplete(true)
          return
        }
      }
    }
  }, [messages])

  async function addPreviewPhoto(deficitId: string, file: File) {
    // Show immediately via blob URL
    const url = URL.createObjectURL(file)
    setPreviewPhotos((prev) => {
      const next = new Map(prev)
      next.set(deficitId, [...(next.get(deficitId) ?? []), url])
      return next
    })

    // Upload to temp Supabase storage; block "Finish Audit" until complete
    setUploadingCount((n) => n + 1)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('propertyId', previewMode!.propertyId)
      const res = await fetch('/api/upload-preview-photo', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.storagePath) {
        setPreviewPhotoStoragePaths((prev) => {
          const next = new Map(prev)
          next.set(deficitId, [...(next.get(deficitId) ?? []), json.storagePath])
          return next
        })
      }
    } finally {
      setUploadingCount((n) => n - 1)
    }
  }

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [input, isLoading, sendMessage])

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    setInput(text)
    if (isFinal && text.trim()) {
      sendMessage({ text })
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      setTimeout(() => textareaRef.current?.focus(), 0)
    }
  }, [sendMessage])

  const totalDocumented = existingDeficits.reduce((sum, d) => sum + d.estimated_cost_to_cure, 0)
  const fmt = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)]">
      {/* Header */}
      <div className="pb-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Home Condition Audit
          </p>
          <h1 className="font-heading text-lg text-foreground mt-0.5">{property.street_address}</h1>
          {existingDeficits.length > 0 && (
            <p className="text-sm text-primary font-medium mt-1">
              {existingDeficits.length} defect{existingDeficits.length !== 1 ? 's' : ''} documented ·{' '}
              {fmt(totalDocumented)} total
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setTtsEnabled((v) => !v)}
          aria-label={ttsEnabled ? 'Mute responses' : 'Read responses aloud'}
          aria-pressed={ttsEnabled}
          className="mt-1 rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      {/* Previously logged deficits (from prior sessions) */}
      {existingDeficits.length > 0 && (
        <div className="pt-4 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Previously documented
          </p>
          {existingDeficits.map((d) => (
            <DeficitCard
              key={d.id}
              deficitId={d.id}
              category={d.category}
              description={d.user_description}
              costToCure={d.estimated_cost_to_cure}
              userId={userId}
              protestId={protestId}
            />
          ))}
        </div>
      )}

      {/* Chat messages */}
      <div role="log" aria-live="polite" aria-label="Chat messages" className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            {message.parts.map((part, i) => {
              if (part.type === 'text') {
                if (!part.text) return null
                return (
                  <ChatBubble
                    key={`${message.id}-${i}`}
                    role={message.role as 'user' | 'assistant'}
                    content={part.text}
                  />
                )
              }

              if (isLogDeficitPart(part as unknown as ToolPart)) {
                const toolPart = part as unknown as ToolPart
                if (!toolPart.input) return null

                const { category, user_description, estimated_cost_to_cure } = toolPart.input

                if (toolPart.state !== 'output-available') {
                  return (
                    <div key={toolPart.toolCallId} className="flex justify-start">
                      <div className="rounded-2xl bg-muted/50 shadow-editorial px-4 py-2.5 text-sm text-muted-foreground animate-pulse">
                        Logging {category}…
                      </div>
                    </div>
                  )
                }

                const out = toolPart.output
                if (!out?.success || !out.deficitId) return null

                return (
                  <DeficitCard
                    key={toolPart.toolCallId}
                    deficitId={out.deficitId}
                    category={category}
                    description={user_description}
                    costToCure={estimated_cost_to_cure}
                    userId={userId}
                    protestId={protestId}
                    onPreviewPhoto={previewMode ? (file) => addPreviewPhoto(out.deficitId!, file) : undefined}
                    previewPhotoUrls={previewMode ? previewPhotos.get(out.deficitId) : undefined}
                  />
                )
              }

              const isSignalComplete = part.type === 'tool-signal_audit_complete' ||
                (part.type === 'dynamic-tool' && (part as unknown as ToolPart).toolName === 'signal_audit_complete')
              if (isSignalComplete) {
                const p = part as unknown as { state: string; output?: { success?: boolean; total_deficits_logged?: number } }
                if (p.state !== 'output-available' || !p.output?.success) return null
                return (
                  <div key={`${message.id}-${i}`} className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 space-y-1">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">Audit Complete</p>
                    <p className="text-xs text-muted-foreground">
                      {p.output.total_deficits_logged
                        ? `${p.output.total_deficits_logged} defect${p.output.total_deficits_logged !== 1 ? 's' : ''} documented.`
                        : 'All categories covered.'
                      }{' '}
                      Tap <strong>Finish Audit →</strong> below to lock in your value — or keep chatting if you have more to add.
                    </p>
                  </div>
                )
              }

              return null
            })}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-card shadow-editorial px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Finish Audit CTA */}
      <div className="border-t border-border py-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {uploadingCount > 0
            ? `Uploading photo${uploadingCount > 1 ? 's' : ''}…`
            : auditComplete
              ? 'All categories covered — ready to lock in your protest value.'
              : 'Done reviewing your home? Lock in your protest value.'}
        </p>
        <button
          type="button"
          onClick={handleFinishAudit}
          disabled={isLoading || locking || uploadingCount > 0}
          className={[
            'rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out shrink-0 whitespace-nowrap',
            'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] disabled:opacity-40',
            auditComplete && uploadingCount === 0 ? 'ring-2 ring-primary ring-offset-2' : '',
          ].join(' ')}
        >
          {locking ? 'Computing…' : 'Finish Audit →'}
        </button>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border pt-3 pb-safe flex gap-2 items-end"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
          }}
          placeholder="Type or speak your answer…"
          aria-label="Your response"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          className="flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[42px] max-h-32 overflow-y-auto transition-colors duration-200"
        />
        <VoiceButton onTranscript={handleTranscript} disabled={isLoading} />
        {userId && protestId && lastDeficitId && (
          <>
            <input
              ref={inlinePhotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleInlinePhoto}
              disabled={attachingPhoto}
            />
            <button
              type="button"
              onClick={() => inlinePhotoRef.current?.click()}
              disabled={attachingPhoto || isLoading}
              aria-label="Attach photo to last defect"
              className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 shrink-0"
            >
              {attachingPhoto
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Camera className="h-4 w-4" />
              }
            </button>
          </>
        )}
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
          className="rounded-xl bg-primary text-primary-foreground p-2.5 hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
