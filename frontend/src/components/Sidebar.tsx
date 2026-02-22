import { useState } from 'react'
import styles from './Sidebar.module.css'

type SortOption = 'Relevant' | 'Latest' | 'Oldest' | 'Popular'

const SORT_OPTIONS: SortOption[] = ['Relevant', 'Latest', 'Oldest', 'Popular']

interface FilterCategory {
  label: string
  enabled: boolean
}

export default function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSort, setActiveSort] = useState<SortOption>('Relevant')
  const [filters, setFilters] = useState<FilterCategory[]>([
    { label: 'Visual Exploration', enabled: false },
    { label: 'Typeface', enabled: false },
  ])

  const toggleFilter = (index: number) => {
    setFilters((prev) =>
      prev.map((f, i) => (i === index ? { ...f, enabled: !f.enabled } : f))
    )
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.top}>
        {/* Logo */}
        <h1 className={styles.logo}>Dossier</h1>

        <div className={styles.divider} />

        {/* Search */}
        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                  onClick={() => toggleFilter(index)}
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

      {/* Footer: user info */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <div className={styles.avatar}>
            <span className={styles.avatarInitials}>LC</span>
          </div>
          <span className={styles.userName}>Lauren Chen</span>
        </div>
        <div className={styles.footerAccent} />
      </div>
    </aside>
  )
}
