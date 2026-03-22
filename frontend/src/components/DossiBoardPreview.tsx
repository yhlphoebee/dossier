import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import ProjectCoverMark from './ProjectCoverMark'
import type { CoverLogoConfig } from '../utils/coverLogo'
import {
  lerpGradientColor,
  normalizeCoverLetters,
  randomLayoutSeed,
  rgbToRgba,
} from '../utils/coverLogo'
import styles from './DossiBoardPreview.module.css'

export interface DossiBoardPreviewProps {
  projectId: string
  initialCoverLogo: CoverLogoConfig | null
  onColorChange?: (color: string) => void
  onCoverLogoSaved?: (logo: CoverLogoConfig | null) => void
}

export default function DossiBoardPreview({
  projectId,
  initialCoverLogo,
  onColorChange,
  onCoverLogoSaved,
}: DossiBoardPreviewProps) {
  const [coverInput, setCoverInput] = useState('')
  const [gradientT, setGradientT] = useState(0.66)
  const [layoutSeed, setLayoutSeed] = useState<number | null>(null)
  const [isDraggingGradient, setIsDraggingGradient] = useState(false)
  const gradientBarRef = useRef<HTMLDivElement>(null)
  const coverSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (initialCoverLogo == null) {
      setCoverInput('')
      setGradientT(0.66)
      setLayoutSeed(null)
      return
    }
    setCoverInput(initialCoverLogo.title)
    setGradientT(initialCoverLogo.gradient_t)
    setLayoutSeed(initialCoverLogo.layout_seed)
  }, [
    projectId,
    initialCoverLogo?.title,
    initialCoverLogo?.gradient_t,
    initialCoverLogo?.layout_seed,
  ])

  const letters = useMemo(() => normalizeCoverLetters(coverInput), [coverInput])

  const effectiveLayoutSeed = layoutSeed ?? 0

  const pickedColor = useMemo(() => lerpGradientColor(gradientT), [gradientT])

  useEffect(() => {
    onColorChange?.(rgbToRgba(pickedColor, 1))
  }, [pickedColor, onColorChange])

  useEffect(() => {
    if (!projectId) return

    if (coverSaveTimeoutRef.current) clearTimeout(coverSaveTimeoutRef.current)
    coverSaveTimeoutRef.current = setTimeout(async () => {
      coverSaveTimeoutRef.current = null
      try {
        if (letters.length === 0) {
          if (!initialCoverLogo) return
          const res = await fetch(`/api/projects/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cover_logo: null }),
          })
          if (res.ok) onCoverLogoSaved?.(null)
          return
        }

        let seed = layoutSeed
        if (seed === null) {
          seed = randomLayoutSeed()
          setLayoutSeed(seed)
        }
        if (
          initialCoverLogo &&
          initialCoverLogo.title === coverInput &&
          initialCoverLogo.gradient_t === gradientT &&
          initialCoverLogo.layout_seed === seed
        ) {
          return
        }
        const payload: CoverLogoConfig = {
          title: coverInput,
          gradient_t: gradientT,
          layout_seed: seed,
        }
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cover_logo: payload }),
        })
        if (res.ok) {
          const data = (await res.json()) as { cover_logo?: CoverLogoConfig | null }
          if (data.cover_logo) onCoverLogoSaved?.(data.cover_logo)
        }
      } catch {
        // silent, same as other debounced project saves
      }
    }, 650)

    return () => {
      if (coverSaveTimeoutRef.current) clearTimeout(coverSaveTimeoutRef.current)
    }
  }, [
    projectId,
    coverInput,
    gradientT,
    layoutSeed,
    letters.length,
    initialCoverLogo,
    onCoverLogoSaved,
  ])

  const updateGradientFromEvent = useCallback((clientX: number) => {
    const bar = gradientBarRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setGradientT(t)
  }, [])

  const handleGradientMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingGradient(true)
    updateGradientFromEvent(e.clientX)
  }

  useEffect(() => {
    if (!isDraggingGradient) return
    const onMove = (e: MouseEvent) => updateGradientFromEvent(e.clientX)
    const onUp = () => setIsDraggingGradient(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDraggingGradient, updateGradientFromEvent])

  const handleGradientTouchStart = (e: React.TouchEvent) =>
    updateGradientFromEvent(e.touches[0].clientX)
  const handleGradientTouchMove = (e: React.TouchEvent) =>
    updateGradientFromEvent(e.touches[0].clientX)

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase().slice(0, 12)
    setCoverInput(v)
    const nextLetters = normalizeCoverLetters(v)
    if (nextLetters.length > 0) {
      setLayoutSeed((s) => s ?? randomLayoutSeed())
    }
  }

  return (
    <div className={styles.root}>
      <input
        className={styles.titleInput}
        type="text"
        placeholder="Cover Title ( < 12 characters )"
        maxLength={12}
        value={coverInput}
        onChange={handleTitleChange}
        spellCheck={false}
        autoComplete="off"
      />

      <div className={styles.svgWrap}>
        <ProjectCoverMark title={coverInput} gradientT={gradientT} layoutSeed={effectiveLayoutSeed} />
      </div>

      <div
        ref={gradientBarRef}
        className={styles.gradientBar}
        onMouseDown={handleGradientMouseDown}
        onTouchStart={handleGradientTouchStart}
        onTouchMove={handleGradientTouchMove}
      >
        <div className={styles.gradientThumb} style={{ left: `${gradientT * 100}%` }} />
      </div>
    </div>
  )
}
