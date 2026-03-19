import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import styles from './LandingPage.module.css'

const ROTATING_PHRASES = [
  'Organize Research',
  'Analyze Evidence',
  'Build Confidence',
  'Clarify Decisions',
]

/** How long each phrase stays visible before animating to the next (milliseconds). */
const MS_UNTIL_NEXT_WORD = 4200

function pickNext(current: number) {
  const next = Math.floor(Math.random() * (ROTATING_PHRASES.length - 1))
  return next >= current ? next + 1 : next
}

// phase: 'idle' | 'out' | 'in'
type Phase = 'idle' | 'out' | 'in'

export default function LandingPage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(() => Math.floor(Math.random() * ROTATING_PHRASES.length))
  const [phase, setPhase] = useState<Phase>('idle')
  /** Bumps on each new phrase so the divider dot replays its left→right sweep. */
  const [dividerAnimKey, setDividerAnimKey] = useState(0)
  const nextIndex = useRef<number>(index)

  useEffect(() => {
    const interval = setInterval(() => {
      nextIndex.current = pickNext(index)
      setPhase('out')
    }, MS_UNTIL_NEXT_WORD)
    return () => clearInterval(interval)
  }, [index])

  function handleAnimationEnd() {
    if (phase === 'out') {
      setIndex(nextIndex.current)
      setPhase('in')
      setDividerAnimKey((k) => k + 1)
    } else if (phase === 'in') {
      setPhase('idle')
    }
  }

  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <span className={styles.wordmark}>DOSSIER</span>
        <div className={styles.navLinks}>
          <a className={styles.navLinkOutline}>ABOUT</a>
          <a className={styles.navLinkOutline}>EXPLORE</a>
          <button className={styles.navLinkFilled} onClick={() => navigate('/login')}>
            SIGN IN
          </button>
        </div>
      </nav>

      {/* Hero text + divider (grouped so divider sits below text, no overlap) */}
      <div className={styles.heroText}>
        <p className={styles.heroLine1}>{'Design Investigation \nPlatform \nHelps Designers'}</p>
        <div className={styles.heroLine2Wrap}>
          <p
            className={`${styles.heroLine2} ${phase === 'out' ? styles.heroLine2Out : ''} ${phase === 'in' ? styles.heroLine2In : ''}`}
            onAnimationEnd={handleAnimationEnd}
          >
            {ROTATING_PHRASES[index]}
          </p>
        </div>
        <div className={styles.dividerWrap}>
          <div
            key={dividerAnimKey}
            className={`${styles.dividerLine} ${dividerAnimKey > 0 ? styles.dividerLineSweep : ''}`}
          />
          {dividerAnimKey === 0 ? (
            <div className={`${styles.dividerDot} ${styles.dividerDotRest}`} aria-hidden />
          ) : (
            <div
              key={`dot-${dividerAnimKey}`}
              className={`${styles.dividerDot} ${styles.dividerDotSweep}`}
              aria-hidden
            />
          )}
        </div>
      </div>

      {/* Animated 3D Logo */}
      <div className={styles.logoWrap}>
        <iframe
          className={styles.logoFrame}
          src="/dossier_logo_embed.html"
          title="Dossier 3D Logo"
          scrolling="no"
          allowTransparency={true}
        />
      </div>
    </div>
  )
}
