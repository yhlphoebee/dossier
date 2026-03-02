import { useState } from 'react'
import styles from './VisualExplorationBoard.module.css'

// Folder tabs — "Related" searches across all folders, others search within their folder
const TABS = ['Related', 'Graphic Design', 'UI/UX', 'Branding', 'Motion', 'Technology']

interface VisualExplorationBoardProps {
  searchQuery: string
}

export default function VisualExplorationBoard({ searchQuery: _searchQuery }: VisualExplorationBoardProps) {
  const [activeTab, setActiveTab] = useState('Related')

  return (
    <div className={styles.board}>
      {/* Tab bar */}
      <div className={styles.tabBar}>
        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <div key={tab} className={styles.tabWrapper}>
              <button
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : styles.tabInactive}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
              <div
                className={`${styles.tabIndicator} ${activeTab === tab ? styles.tabIndicatorActive : ''}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      {/* Masonry grid — images will be added later */}
      <div className={styles.masonryGrid}>
        <div className={styles.masonryColumn}>
          <div className={styles.imagePlaceholder} style={{ height: 280 }} />
          <div className={styles.imagePlaceholder} style={{ height: 380 }} />
          <div className={styles.imagePlaceholder} style={{ height: 320 }} />
        </div>
        <div className={styles.masonryColumn}>
          <div className={styles.imagePlaceholder} style={{ height: 360 }} />
          <div className={styles.imagePlaceholder} style={{ height: 260 }} />
          <div className={styles.imagePlaceholder} style={{ height: 340 }} />
        </div>
        <div className={styles.masonryColumn}>
          <div className={styles.imagePlaceholder} style={{ height: 240 }} />
          <div className={styles.imagePlaceholder} style={{ height: 400 }} />
          <div className={styles.imagePlaceholder} style={{ height: 300 }} />
        </div>
      </div>
    </div>
  )
}
