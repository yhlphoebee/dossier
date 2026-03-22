/** Shared Dossi cover mark: grid layout, colors, and API shape. */

export type CoverLogoConfig = {
  title: string
  gradient_t: number
  layout_seed: number
}

export const COVER_LOGO_COLS = 4
export const COVER_LOGO_LEVELS = 3

const GRADIENT_STOPS = [
  { pos: 0, r: 255, g: 200, b: 252 },
  { pos: 0.33, r: 205, g: 184, b: 255 },
  { pos: 0.66, r: 147, g: 204, b: 255 },
  { pos: 1, r: 119, g: 230, b: 255 },
]

export type Rgb = { r: number; g: number; b: number }

export function lerpGradientColor(t: number): Rgb {
  const x = Math.max(0, Math.min(1, t))
  let i = 0
  while (i < GRADIENT_STOPS.length - 2 && x > GRADIENT_STOPS[i + 1].pos) i++
  const a = GRADIENT_STOPS[i]
  const b = GRADIENT_STOPS[i + 1]
  const range = b.pos - a.pos
  const local = range === 0 ? 0 : (x - a.pos) / range
  return {
    r: Math.round(a.r + (b.r - a.r) * local),
    g: Math.round(a.g + (b.g - a.g) * local),
    b: Math.round(a.b + (b.b - a.b) * local),
  }
}

export function rgbToRgba(c: Rgb, alpha: number): string {
  return `rgba(${c.r},${c.g},${c.b},${alpha})`
}

/** Deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleSeeded<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export type LevelLayout = {
  letters: Array<{ ch: string; col: number }>
  dots: Array<{ col: number }>
}

export function normalizeCoverLetters(raw: string): string[] {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12).split('')
}

export function buildCoverLayout(letters: string[], layoutSeed: number): LevelLayout[] {
  const n = letters.length
  const rng = mulberry32(layoutSeed)

  const allCells: Array<{ row: number; col: number }> = []
  for (let row = 0; row < COVER_LOGO_LEVELS; row++)
    for (let col = 0; col < COVER_LOGO_COLS; col++) allCells.push({ row, col })

  const shuffled = shuffleSeeded(allCells, rng)

  const letterCells = shuffled
    .slice(0, n)
    .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col))

  const dotCells = shuffled.slice(n)

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

export const COVER_SVG_SIZE = 220
const PAD = 32
const GRID = COVER_SVG_SIZE - PAD * 2
const COL_STEP = GRID / (COVER_LOGO_COLS - 1)
const ROW_STEP = GRID / (COVER_LOGO_LEVELS - 1)

export const COVER_LEVEL_YS = [PAD, PAD + ROW_STEP, PAD + ROW_STEP * 2]

export function coverColX(col: number): number {
  return PAD + col * COL_STEP
}

export function randomLayoutSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] >>> 0
  }
  return Math.floor(Math.random() * 4294967295)
}

export function coverLogoHasLetters(config: CoverLogoConfig | null | undefined): boolean {
  if (!config) return false
  return normalizeCoverLetters(config.title).length > 0
}
