import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SlideshowHero } from '@/components/slideshow-hero'
import { LoginForm } from '@/components/auth/login-form'
import { SLIDESHOW_IMAGES } from '@/lib/slideshow'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { verified?: string }
}) {
  const slides = SLIDESHOW_IMAGES
  const verified = searchParams.verified === '1' || searchParams.verified === 'true'

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-espresso">
      <SlideshowHero slides={slides} />

      {/* Deeper overlay — focuses attention on the form */}
      <div className="absolute inset-0 bg-gradient-to-b from-foreground/75 via-foreground/72 to-foreground/80" />

      <div className="relative z-10 w-full max-w-[460px] mx-auto px-4 py-16">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-5 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
        <LoginForm verified={verified} />
      </div>
    </div>
  )
}
