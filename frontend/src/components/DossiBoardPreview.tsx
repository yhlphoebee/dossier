import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import styles from './DossiBoardPreview.module.css'

// ── Gradient color stops (pink → purple → blue → cyan) ───────────────────────
const GRADIENT_STOPS = [
  { pos: 0,    r: 255, g: 200, b: 252 },
  { pos: 0.33, r: 205, g: 184, b: 255 },
  { pos: 0.66, r: 147, g: 204, b: 255 }, // #93ccff
  { pos: 1,    r: 119, g: 230, b: 255 },
]

function lerpColor(t: number): { r: number; g: number; b: number } {
  let i = 0
  while (i < GRADIENT_STOPS.length - 2 && t > GRADIENT_STOPS[i + 1].pos) i++
  const a = GRADIENT_STOPS[i]
  const b = GRADIENT_STOPS[i + 1]
  const range = b.pos - a.pos
  const local = range === 0 ? 0 : (t - a.pos) / range
  return {
    r: Math.round(a.r + (b.r - a.r) * local),
    g: Math.round(a.g + (b.g - a.g) * local),
    b: Math.round(a.b + (b.b - a.b) * local),
  }
}

function toRgba(c: { r: number; g: number; b: number }, alpha: number) {
  return `rgba(${c.r},${c.g},${c.b},${alpha})`
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Grid constants (mirrors the logo: 4 cols × 3 levels) ─────────────────────
const COLS = 4
const LEVELS = 3

interface LevelLayout {
  letters: Array<{ ch: string; col: number }>
  dots: Array<{ col: number }>
}

// All 12 cells are shuffled, then N cells are picked and sorted by reading order
// (row 0 col 0 → row 0 col 3 → row 1 col 0 → … → row 2 col 3).
// Letters are assigned to those sorted cells in typed order, so reading
// left→right top→bottom always gives back what was typed.
function buildLayout(letters: string[]): LevelLayout[] {
  const n = letters.length

  // All possible cells as {row, col}, shuffled
  const allCells: Array<{ row: number; col: number }> = []
  for (let row = 0; row < LEVELS; row++)
    for (let col = 0; col < COLS; col++)
      allCells.push({ row, col })
  const shuffled = shuffle(allCells)

  // Pick N cells for letters, sort them in reading order
  const letterCells = shuffled
    .slice(0, n)
    .sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col)

  // Remaining cells are dots
  const dotCells = shuffled.slice(n)

  // Build per-level layouts
  const levels: LevelLayout[] = [
    { letters: [], dots: [] },
    { letters: [], dots: [] },
    { letters: [], dots: [] },
  ]
  letterCells.forEach(({ row, col }, i) => {
    levels[row].letters.push({ ch: letters[i], col })
  })
  dotCells.forEach(({ row, col }) => {
    levels[row].dots.push({ col })
  })

  return levels
}

// ── SVG geometry — square grid, equal col/row spacing like the logo ───────────
const SVG_SIZE = 220        // square viewBox
const PAD = 32              // equal padding on all sides
const GRID = SVG_SIZE - PAD * 2          // usable area
const COL_STEP = GRID / (COLS - 1)       // equal horizontal spacing
const ROW_STEP = GRID / (LEVELS - 1)     // equal vertical spacing → same as COL_STEP

const LEVEL_YS = [PAD, PAD + ROW_STEP, PAD + ROW_STEP * 2]

function colX(col: number) {
  return PAD + col * COL_STEP
}

interface DossiBoardPreviewProps {
  onColorChange?: (color: string) => void
}

export default function DossiBoardPreview({ onColorChange }: DossiBoardPreviewProps) {
  const [coverInput, setCoverInput] = useState('')
  const [gradientT, setGradientT] = useState(0.66)
  const [isDraggingGradient, setIsDraggingGradient] = useState(false)
  const gradientBarRef = useRef<HTMLDivElement>(null)

  // Uppercase letters only, max 12
  const letters = useMemo(
    () => coverInput.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12).split(''),
    [coverInput]
  )

  // Rebuild layout whenever the input changes
  const layout = useMemo(() => buildLayout(letters), [coverInput]) // eslint-disable-line react-hooks/exhaustive-deps

  // Picked color from gradient
  const pickedColor = useMemo(() => lerpColor(gradientT), [gradientT])

  useEffect(() => {
    onColorChange?.(toRgba(pickedColor, 1))
  }, [pickedColor, onColorChange])

  // ── Gradient bar interaction ──────────────────────────────────────────────
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

  const handleGradientTouchStart = (e: React.TouchEvent) => updateGradientFromEvent(e.touches[0].clientX)
  const handleGradientTouchMove = (e: React.TouchEvent) => updateGradientFromEvent(e.touches[0].clientX)

  // ── Build SVG elements ────────────────────────────────────────────────────
  // Collect all visible dot positions across all levels (for the filled polygon)
  const allVisibleDots: Array<{ x: number; y: number }> = []
  layout.forEach((lvl, li) => {
    const y = LEVEL_YS[li]
    lvl.dots.forEach((d) => allVisibleDots.push({ x: colX(d.col), y }))
  })

  // Sort top-to-bottom then left-to-right (mirrors the logo's sort)
  allVisibleDots.sort((a, b) => {
    const dy = a.y - b.y
    if (Math.abs(dy) > 0.5) return dy
    return a.x - b.x
  })

  const fillColor = toRgba(pickedColor, 0.82)
  const dotColor = '#111010'
  // Logo uses dotR:0.055 in a ~3-unit-wide world — translates to ~3px in our SVG
  const DOT_R = 3.5

  return (
    <div className={styles.root}>
      {/* Title input */}
      <input
        className={styles.titleInput}
        type="text"
        placeholder="Cover Title ( < 12 characters )"
        maxLength={12}
        value={coverInput}
        onChange={(e) =>
          setCoverInput(e.target.value.toUpperCase().slice(0, 12))
        }
        spellCheck={false}
        autoComplete="off"
      />

      {/* SVG grid */}
      <div className={styles.svgWrap}>
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible' }}
        >
          {/* Filled polygon connecting visible dots */}
          {allVisibleDots.length >= 3 && (
            <polygon
              points={allVisibleDots.map((p) => `${p.x},${p.y}`).join(' ')}
              fill={fillColor}
              stroke="none"
            />
          )}
          {allVisibleDots.length === 2 && (
            <line
              x1={allVisibleDots[0].x} y1={allVisibleDots[0].y}
              x2={allVisibleDots[1].x} y2={allVisibleDots[1].y}
              stroke={fillColor}
              strokeWidth="2"
            />
          )}

          {/* Per-level: dots and letters */}
          {layout.map((lvl, li) => {
            const y = LEVEL_YS[li]
            return (
              <g key={li}>
                {/* Visible dots — small, same as logo's dotR */}
                {lvl.dots.map((d) => (
                  <circle
                    key={`dot-${li}-${d.col}`}
                    cx={colX(d.col)}
                    cy={y}
                    r={DOT_R}
                    fill={dotColor}
                  />
                ))}

                {/* Letter nodes — letter replaces the dot entirely, no circle underneath */}
                {lvl.letters.map((l) => {
                  const x = colX(l.col)
                  return (
                    <text
                      key={`letter-${li}-${l.col}`}
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="30"
                      fontFamily="'Neue Haas Grotesk Display Pro','NeueHaasDisplayRoman','Helvetica Neue',Helvetica,Arial,sans-serif"
                      fontWeight="400"
                      fill={dotColor}
                      letterSpacing="0.05em"
                    >
                      {l.ch}
                    </text>
                  )
                })}

                {/* Empty row: show all 4 dots when no letters assigned */}
                {lvl.letters.length === 0 &&
                  [0, 1, 2, 3].map((col) => (
                    <circle
                      key={`empty-${li}-${col}`}
                      cx={colX(col)}
                      cy={y}
                      r={DOT_R}
                      fill={dotColor}
                    />
                  ))}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Gradient color picker */}
      <div
        ref={gradientBarRef}
        className={styles.gradientBar}
        onMouseDown={handleGradientMouseDown}
        onTouchStart={handleGradientTouchStart}
        onTouchMove={handleGradientTouchMove}
      >
        <div
          className={styles.gradientThumb}
          style={{ left: `${gradientT * 100}%` }}
        />
      </div>
    </div>
  )
}
