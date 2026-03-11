import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import styles from './LandingPage.module.css'

const ROTATING_PHRASES = [
  'Organize research',
  'Analyze evidence',
  'Build confidence',
  'Clarify decisions',
]

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
  const nextIndex = useRef<number>(index)

  useEffect(() => {
    const interval = setInterval(() => {
      nextIndex.current = pickNext(index)
      setPhase('out')
    }, 5000)
    return () => clearInterval(interval)
  }, [index])

  function handleAnimationEnd() {
    if (phase === 'out') {
      setIndex(nextIndex.current)
      setPhase('in')
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

      {/* Hero text */}
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
      </div>

      {/* Cyan divider line */}
      <div className={styles.dividerWrap}>
        <div className={styles.dividerLine}>
          <div className={styles.dividerDot} />
        </div>
      </div>

      {/* Animated 3D Logo */}
      <div className={styles.logoWrap}>
        <iframe
          className={styles.logoFrame}
          src="/dossier_logo_embed.html"
          title="Dossier 3D Logo"
          scrolling="no"
        />
      </div>
    </div>
  )
}
