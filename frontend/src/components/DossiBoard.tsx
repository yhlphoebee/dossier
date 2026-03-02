import { useState } from 'react'
import styles from './DossiBoard.module.css'

type FolderTab = 'Images' | 'Typefaces' | 'Websites'

interface DossiBoardProps {
  onCollapse: () => void
}

const FOLDER_TABS: FolderTab[] = ['Images', 'Typefaces', 'Websites']

export default function DossiBoard({ onCollapse }: DossiBoardProps) {
  const [activeTab, setActiveTab] = useState<FolderTab>('Images')

  return (
    <div className={styles.container}>
      {/* Tab bar */}
      <div className={styles.tabBar}>
        {FOLDER_TABS.map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className={styles.tabLabel}>{tab}</span>
            <span className={styles.tabCountNum}>{'  '}0 element</span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className={styles.content}>
        {activeTab === 'Images' && <ImagesTab />}
        {activeTab === 'Typefaces' && <TypefacesTab />}
        {activeTab === 'Websites' && <WebsitesTab />}
      </div>

      {/* Bottom bar: Dossi Board label + collapse arrow */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomLeft}>
          <span className={styles.bottomTitle}>Dossi Board</span>
        </div>
        <div className={styles.bottomRight}>
          <button className={styles.collapseBtn} onClick={onCollapse} aria-label="Collapse Dossi Board">
            <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
              <circle cx="18" cy="18" r="17.5" stroke="#d0d0d0" />
              <line x1="10" y1="26" x2="26" y2="10" stroke="#222" strokeWidth="1.8" strokeLinecap="round" />
              <polyline points="10,10 26,10 26,26" stroke="#222" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function ImagesTab() {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyText}>No images yet</p>
    </div>
  )
}

function TypefacesTab() {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyText}>No typefaces yet</p>
    </div>
  )
}

function WebsitesTab() {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyText}>No websites yet</p>
    </div>
  )
}
