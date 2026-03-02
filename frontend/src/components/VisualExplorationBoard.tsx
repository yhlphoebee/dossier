import { useState } from 'react'
import styles from './VisualExplorationBoard.module.css'

// ─── Image loading via Vite glob ─────────────────────────────────────────────
// To add images: drop files into src/assets/visual-exploration/<folder-name>/
// Supported formats: jpg, jpeg, png, gif, webp, avif, svg
// Changes take effect after saving this file or restarting the dev server.

const allGlobs: Record<string, Record<string, { default: string }>> = {
  'graphic-design': import.meta.glob('../assets/visual-exploration/graphic-design/*.(png|jpg|jpeg|gif|webp|avif|svg)', { eager: true }),
  'ui-ux':          import.meta.glob('../assets/visual-exploration/ui-ux/*.(png|jpg|jpeg|gif|webp|avif|svg)', { eager: true }),
  branding:         import.meta.glob('../assets/visual-exploration/branding/*.(png|jpg|jpeg|gif|webp|avif|svg)', { eager: true }),
  motion:           import.meta.glob('../assets/visual-exploration/motion/*.(png|jpg|jpeg|gif|webp|avif|svg)', { eager: true }),
  technology:       import.meta.glob('../assets/visual-exploration/technology/*.(png|jpg|jpeg|gif|webp|avif|svg)', { eager: true }),
}

// Returns { src, filename } so we can match on the filename for search
function getImageEntries(folderKey: string): { src: string; filename: string }[] {
  const glob = allGlobs[folderKey] ?? {}
  return Object.entries(glob).map(([path, m]) => ({
    src: m.default,
    filename: path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '',
  }))
}

function getAllImageEntries(): { src: string; filename: string }[] {
  return Object.keys(allGlobs).flatMap(getImageEntries)
}

function filterBySearch(
  entries: { src: string; filename: string }[],
  query: string,
): { src: string; filename: string }[] {
  const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (keywords.length === 0) return entries
  return entries.filter(({ filename }) =>
    keywords.every((kw) => filename.toLowerCase().includes(kw)),
  )
}

// ─── Tab definition ───────────────────────────────────────────────────────────
// Each non-Related tab maps to a folder key in src/assets/visual-exploration/

const TABS: { label: string; folderKey: string | null }[] = [
  { label: 'Related',       folderKey: null },           // searches across all folders
  { label: 'Graphic Design', folderKey: 'graphic-design' },
  { label: 'UI/UX',         folderKey: 'ui-ux' },
  { label: 'Branding',      folderKey: 'branding' },
  { label: 'Motion',        folderKey: 'motion' },
  { label: 'Technology',    folderKey: 'technology' },
]

// ─── Masonry helpers ──────────────────────────────────────────────────────────

function distributeIntoColumns(srcs: string[], numCols: number): string[][] {
  const cols: string[][] = Array.from({ length: numCols }, () => [])
  srcs.forEach((src, i) => cols[i % numCols].push(src))
  return cols
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface VisualExplorationBoardProps {
  searchQuery: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function VisualExplorationBoard({ searchQuery }: VisualExplorationBoardProps) {
  const [activeTab, setActiveTab] = useState('Related')

  const activeFolder = TABS.find((t) => t.label === activeTab)?.folderKey ?? null

  // Gather entries for the active scope, then filter by search query
  const rawEntries = activeFolder === null ? getAllImageEntries() : getImageEntries(activeFolder)
  const entries = filterBySearch(rawEntries, searchQuery)
  const columns = distributeIntoColumns(entries.map((e) => e.src), 3)

  const isSearching = searchQuery.trim().length > 0

  return (
    <div className={styles.board}>
      {/* Tab bar */}
      <div className={styles.tabBar}>
        <div className={styles.tabs}>
          {TABS.map(({ label }) => (
            <div key={label} className={styles.tabWrapper}>
              <button
                className={`${styles.tab} ${activeTab === label ? styles.tabActive : styles.tabInactive}`}
                onClick={() => setActiveTab(label)}
              >
                {label}
              </button>
              <div
                className={`${styles.tabIndicator} ${activeTab === label ? styles.tabIndicatorActive : ''}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      {/* Masonry grid */}
      {entries.length === 0 ? (
        <div className={styles.empty}>
          {isSearching
            ? `No images match "${searchQuery}"`
            : <>No images yet — drop files into <code>src/assets/visual-exploration/{activeFolder ?? '<folder>'}/</code></>
          }
        </div>
      ) : (
        <div className={styles.masonryGrid}>
          {columns.map((col, ci) => (
            <div key={ci} className={styles.masonryColumn}>
              {col.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  className={styles.image}
                  draggable={false}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
