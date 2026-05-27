'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PropertyResult {
  id: string
  street_address: string
  zip_code: string
  county_name: string
  current_proposed_value: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

const countyLabel: Record<string, string> = {
  collin: 'Collin County',
  tarrant: 'Tarrant County',
  dallas: 'Dallas County',
}

export function AddressSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PropertyResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.length < 3) {
      setResults([])
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/property-search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.properties ?? [])
        setIsOpen(true)
        setActiveIndex(-1)
      } catch {
        toast.error('Search failed. Please try again.')
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function handleSelect(property: PropertyResult) {
    setIsStarting(true)
    setIsOpen(false)
    setActiveIndex(-1)
    setQuery(property.street_address)
    router.push(`/protest/preview/${property.id}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(results[activeIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  const showEmpty = isOpen && results.length === 0 && query.length >= 3 && !isSearching
  const activeId = activeIndex >= 0 ? `address-option-${activeIndex}` : undefined

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true">
          {isSearching || isStarting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search your property address…"
          disabled={isStarting}
          role="combobox"
          aria-label="Property address search"
          aria-expanded={isOpen && results.length > 0}
          aria-controls="address-results"
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-busy={isSearching}
          autoComplete="off"
          className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-5 text-base text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 transition-shadow"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div id="address-results" role="listbox" aria-label="Property suggestions" className="absolute z-10 mt-2 w-full rounded-2xl border border-border bg-card shadow-lg overflow-y-auto max-h-72">
          {results.map((p, i) => (
            <button
              key={p.id}
              id={`address-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => handleSelect(p)}
              className={`w-full px-5 py-3.5 text-left transition-colors ${i > 0 ? 'border-t border-border' : ''} ${i === activeIndex ? 'bg-muted' : 'hover:bg-muted'}`}
            >
              <p className="text-sm font-medium text-foreground">{p.street_address}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fmt(p.current_proposed_value)} assessed · {countyLabel[p.county_name] ?? p.county_name}
              </p>
            </button>
          ))}
        </div>
      )}

      {showEmpty && (
        <div className="absolute z-10 mt-2 w-full rounded-2xl border border-border bg-card shadow-lg px-5 py-4">
          <p className="text-sm text-muted-foreground">
            No properties found for{' '}
            <span className="font-medium text-foreground">"{query}"</span>.
            FairValue currently covers Dallas, Collin, and Tarrant counties.
          </p>
        </div>
      )}
    </div>
  )
}
