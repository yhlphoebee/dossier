import { useMemo } from 'react'
import {
  buildCoverLayout,
  COVER_LEVEL_YS,
  COVER_SVG_SIZE,
  coverColX,
  lerpGradientColor,
  normalizeCoverLetters,
  rgbToRgba,
} from '../utils/coverLogo'
import styles from './ProjectCoverMark.module.css'

const DOT_R = 3.5
const DOT_COLOR = '#111010'

export interface ProjectCoverMarkProps {
  title: string
  gradientT: number
  layoutSeed: number
  className?: string
}

export default function ProjectCoverMark({ title, gradientT, layoutSeed, className }: ProjectCoverMarkProps) {
  const letters = useMemo(() => normalizeCoverLetters(title), [title])
  const layout = useMemo(() => buildCoverLayout(letters, layoutSeed), [letters, layoutSeed])
  const picked = useMemo(() => lerpGradientColor(gradientT), [gradientT])
  const fillColor = rgbToRgba(picked, 0.82)

  const allVisibleDots: Array<{ x: number; y: number }> = []
  layout.forEach((lvl, li) => {
    const y = COVER_LEVEL_YS[li]
    lvl.dots.forEach((d) => allVisibleDots.push({ x: coverColX(d.col), y }))
  })
  allVisibleDots.sort((a, b) => {
    const dy = a.y - b.y
    if (Math.abs(dy) > 0.5) return dy
    return a.x - b.x
  })

  return (
    <div className={`${styles.root} ${className ?? ''}`}>
      <svg
        viewBox={`0 0 ${COVER_SVG_SIZE} ${COVER_SVG_SIZE}`}
        xmlns="http://www.w3.org/2000/svg"
        className={styles.svg}
        aria-hidden
      >
        {allVisibleDots.length >= 3 && (
          <polygon
            points={allVisibleDots.map((p) => `${p.x},${p.y}`).join(' ')}
            fill={fillColor}
            stroke="none"
          />
        )}
        {allVisibleDots.length === 2 && (
          <line
            x1={allVisibleDots[0].x}
            y1={allVisibleDots[0].y}
            x2={allVisibleDots[1].x}
            y2={allVisibleDots[1].y}
            stroke={fillColor}
            strokeWidth="2"
          />
        )}

        {layout.map((lvl, li) => {
          const y = COVER_LEVEL_YS[li]
          return (
            <g key={li}>
              {lvl.dots.map((d) => (
                <circle
                  key={`dot-${li}-${d.col}`}
                  cx={coverColX(d.col)}
                  cy={y}
                  r={DOT_R}
                  fill={DOT_COLOR}
                />
              ))}
              {lvl.letters.map((l) => (
                <text
                  key={`letter-${li}-${l.col}`}
                  x={coverColX(l.col)}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="38"
                  fontFamily="'Neue Haas Grotesk Display Pro','NeueHaasDisplayRoman','Helvetica Neue',Helvetica,Arial,sans-serif"
                  fontWeight="400"
                  fill={DOT_COLOR}
                  letterSpacing="0.05em"
                >
                  {l.ch}
                </text>
              ))}
              {lvl.letters.length === 0 &&
                [0, 1, 2, 3].map((col) => (
                  <circle
                    key={`empty-${li}-${col}`}
                    cx={coverColX(col)}
                    cy={y}
                    r={DOT_R}
                    fill={DOT_COLOR}
                  />
                ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
