import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

export default function LandingPage() {
  const navigate = useNavigate()

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

      {/* Hero text left */}
      <div className={styles.heroText}>
        <p className={styles.heroLine1}>Design Investigation Platform Helps Designers</p>
      </div>

      {/* Hero text right */}
      <div className={styles.heroRight}>
        <p className={styles.heroLine2}>Clarify Decisions</p>
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
