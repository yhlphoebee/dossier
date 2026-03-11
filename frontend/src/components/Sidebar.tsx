import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Sidebar.module.css'

function ChevronDoubleLeft() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10 1L4 7L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 1L10 7L16 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ChevronDoubleRight() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 1L10 7L4 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 1L16 7L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

type SortOption = 'Relevant' | 'Latest' | 'Oldest' | 'Popular'

const SORT_OPTIONS: SortOption[] = ['Relevant', 'Latest', 'Oldest', 'Popular']

export interface FilterCategory {
  label: string
  enabled: boolean
}

interface SidebarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  filters: FilterCategory[]
  onToggleFilter: (index: number) => void
  collapsible?: boolean
}

export default function Sidebar({ searchQuery, onSearchChange, filters, onToggleFilter, collapsible = false }: SidebarProps) {
  const [activeSort, setActiveSort] = useState<SortOption>('Relevant')
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  if (collapsible && collapsed) {
    return (
      <aside className={styles.sidebarCollapsed}>
        <div className={styles.collapsedLogo}>D</div>
        <button
          className={styles.expandBtn}
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
        >
          <ChevronDoubleRight />
        </button>
      </aside>
    )
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.top}>
        {/* Logo */}
        <h1 className={styles.logo}>DOSSIER</h1>

        <div className={styles.divider} />

        {/* Search */}
        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className={styles.divider} />

        {/* Sort options */}
        <div className={styles.sortRow}>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option}
              className={`${styles.sortBtn} ${activeSort === option ? styles.sortActive : styles.sortInactive}`}
              onClick={() => setActiveSort(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <div className={styles.divider} />

        {/* Filter toggles */}
        <div className={styles.filterList}>
          {filters.map((filter, index) => (
            <div key={filter.label}>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>{filter.label}</span>
                <button
                  className={`${styles.toggle} ${filter.enabled ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() => onToggleFilter(index)}
                  aria-label={`Toggle ${filter.label}`}
                  role="switch"
                  aria-checked={filter.enabled}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
              <div className={styles.divider} />
            </div>
          ))}
        </div>
      </div>

      {/* Footer: user info + collapse button in cyan square */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <div className={styles.avatar}>
            <span className={styles.avatarInitials}>LC</span>
          </div>
          <span className={styles.userName}>Lauren Chen</span>
        </div>
        <button
          className={styles.footerLogoBtn}
          onClick={() => navigate('/logo')}
          aria-label="Open interactive logo"
        >
          <iframe
            src="/dossier_logo_sidebar.html"
            title="Dossier Logo"
            className={styles.footerLogoFrame}
            scrolling="no"
            tabIndex={-1}
          />
          {collapsible && (
            <div className={styles.collapseOverlay} onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}>
              <ChevronDoubleLeft />
            </div>
          )}
        </button>
      </div>
    </aside>
  )
}
