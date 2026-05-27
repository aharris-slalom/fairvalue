import { readdirSync } from 'fs'
import { join, extname } from 'path'
import { SlideshowHero } from '@/components/slideshow-hero'
import { LoginForm } from '@/components/auth/login-form'

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

function getSlideshowImages(): string[] {
  const dir = join(process.cwd(), 'public', 'slideshow')
  return readdirSync(dir)
    .filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()))
    .map((f) => `/slideshow/${encodeURIComponent(f)}`)
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { verified?: string }
}) {
  const slides = getSlideshowImages()
  const verified = searchParams.verified === '1' || searchParams.verified === 'true'

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-espresso">
      <SlideshowHero slides={slides} />

      {/* Deeper overlay — focuses attention on the form */}
      <div className="absolute inset-0 bg-gradient-to-b from-foreground/75 via-foreground/72 to-foreground/80" />

      <div className="relative z-10 w-full max-w-[460px] mx-auto px-4 py-16">
        <LoginForm verified={verified} />
      </div>
    </div>
  )
}
