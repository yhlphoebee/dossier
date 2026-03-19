import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import styles from './DossiBoard.module.css'

type FolderTab = 'images' | 'typefaces' | 'websites'

interface DossiBoardItem {
  id: string
  project_id: string
  folder: string
  file_path: string
  filename: string
  label: string | null
  source_url: string | null
  created_at: string
}

type AgentKey = 'strategy' | 'research' | 'concept' | 'present'

const AGENT_TABS: { key: AgentKey; label: string }[] = [
  { key: 'strategy', label: 'Strategist' },
  { key: 'research', label: 'Researcher' },
  { key: 'concept', label: 'Director' },
  { key: 'present', label: 'Presenter' },
]

export interface DossiBoardHandle {
  refreshItems: () => void
  switchToWebsites: () => void
}

interface DossiBoardProps {
  projectId: string
  onCollapse: () => void
  activeAgent: AgentKey
  onAgentChange: (agent: AgentKey) => void
}

const FOLDER_TABS: { key: FolderTab; label: string }[] = [
  { key: 'images', label: 'Images' },
  { key: 'typefaces', label: 'Typefaces' },
  { key: 'websites', label: 'Websites' },
]

const DossiBoard = forwardRef<DossiBoardHandle, DossiBoardProps>(function DossiBoard(
  { projectId, onCollapse, activeAgent, onAgentChange },
  ref,
) {
  const [activeTab, setActiveTab] = useState<FolderTab>('images')
  const [items, setItems] = useState<DossiBoardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/dossi-board`)
      if (res.ok) {
        const data: DossiBoardItem[] = await res.json()
        setItems(data)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useImperativeHandle(ref, () => ({
    refreshItems: fetchItems,
    switchToWebsites: () => {
      setActiveTab('websites')
      fetchItems()
    },
  }), [fetchItems])

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    setUploading(true)
    try {
      await Promise.all(
        fileArray.map(async (file) => {
          const form = new FormData()
          form.append('folder', activeTab)
          form.append('file', file)
          await fetch(`/api/projects/${projectId}/dossi-board`, {
            method: 'POST',
            body: form,
          })
        })
      )
      await fetchItems()
    } finally {
      setUploading(false)
    }
  }

  const deleteItem = async (itemId: string) => {
    await fetch(`/api/projects/${projectId}/dossi-board/${itemId}`, {
      method: 'DELETE',
    })
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the drop zone entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files)
      e.target.value = ''
    }
  }

  const tabItems = items.filter((i) => i.folder === activeTab)
  const countsByFolder = FOLDER_TABS.reduce<Record<FolderTab, number>>(
    (acc, t) => ({ ...acc, [t.key]: items.filter((i) => i.folder === t.key).length }),
    { images: 0, typefaces: 0, websites: 0 }
  )

  const isWebsitesTab = activeTab === 'websites'

  return (
    <div className={styles.container}>
      {/* Tab bar */}
      <div className={styles.tabBar}>
        {FOLDER_TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`${styles.tab} ${activeTab === key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <span className={styles.tabLabel}>{label}</span>
            <span className={styles.tabCountNum}>
              {countsByFolder[key] > 0
                ? `  ${String(countsByFolder[key]).padStart(2, '0')} element${countsByFolder[key] !== 1 ? 's' : ''}`
                : '  0 element'}
            </span>
          </button>
        ))}
      </div>

      {/* Drop zone + content */}
      <div
        className={`${styles.content} ${dragOver ? styles.contentDragOver : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {loading && tabItems.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Loading…</p>
          </div>
        ) : tabItems.length === 0 ? (
          <div
            className={styles.emptyState}
            onClick={isWebsitesTab ? undefined : () => fileInputRef.current?.click()}
            role={isWebsitesTab ? undefined : 'button'}
            tabIndex={isWebsitesTab ? undefined : 0}
            onKeyDown={isWebsitesTab ? undefined : (e) => e.key === 'Enter' && fileInputRef.current?.click()}
            style={isWebsitesTab ? { cursor: 'default' } : undefined}
          >
            <div className={styles.dropHint}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="1" y="1" width="38" height="38" rx="8" stroke="#d0d0d0" strokeWidth="1.5" strokeDasharray="5 4" />
                <path d="M20 13v14M13 20h14" stroke="#c0c0c0" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className={styles.dropHintText}>
                {isWebsitesTab
                  ? 'References from the Researcher will appear here'
                  : dragOver ? 'Drop to add' : 'Drag & drop files here'}
              </p>
              {!isWebsitesTab && <p className={styles.dropHintSub}>or click to browse</p>}
            </div>
          </div>
        ) : (
          <MasonryGrid
            items={tabItems}
            onDelete={deleteItem}
            onAddMore={isWebsitesTab ? undefined : () => fileInputRef.current?.click()}
          />
        )}

        {uploading && (
          <div className={styles.uploadingOverlay}>
            <span className={styles.uploadingText}>Uploading…</span>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handleFileInput}
      />

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomLeft}>
          <span className={styles.bottomTitle}>Dossi Board</span>
        </div>
        <div className={styles.bottomAgents}>
          {AGENT_TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.agentTab} ${activeAgent === key ? styles.agentTabActive : ''}`}
              onClick={() => onAgentChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.bottomRight}>
          <button
            className={styles.collapseBtn}
            onClick={onCollapse}
            aria-label="Collapse Dossi Board"
          >
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
              <line x1="110" y1="10" x2="10" y2="110" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
              <polyline points="118,110 10,110 10,2" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
})

export default DossiBoard

// ── Masonry grid ─────────────────────────────────────────────────────────────

const MIN_COLS = 3
const MAX_COLS = 5
const MIN_COL_WIDTH = 220

function distributeColumns(items: DossiBoardItem[], numCols: number): DossiBoardItem[][] {
  const cols: DossiBoardItem[][] = Array.from({ length: numCols }, () => [])
  items.forEach((item, i) => cols[i % numCols].push(item))
  return cols
}

function columnCountForWidth(width: number): number {
  const cols = Math.floor(width / MIN_COL_WIDTH)
  return Math.min(MAX_COLS, Math.max(MIN_COLS, cols))
}

interface MasonryGridProps {
  items: DossiBoardItem[]
  onDelete: (id: string) => void
  onAddMore?: () => void
}

function MasonryGrid({ items, onDelete, onAddMore }: MasonryGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [numCols, setNumCols] = useState(MIN_COLS)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      setNumCols(columnCountForWidth(width))
    })
    ro.observe(el)
    setNumCols(columnCountForWidth(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])

  const columns = distributeColumns(items, numCols)

  return (
    <div ref={gridRef} className={styles.masonryGrid}>
      {columns.map((col, ci) => (
        <div key={ci} className={styles.masonryColumn}>
          {col.map((item) =>
            item.folder === 'websites' ? (
              <WebsiteTile
                key={item.id}
                item={item}
                onDelete={() => onDelete(item.id)}
              />
            ) : (
              <ImageTile
                key={item.id}
                item={item}
                onDelete={() => onDelete(item.id)}
              />
            )
          )}
          {/* Add more tile sits at the bottom of the first column */}
          {ci === 0 && onAddMore && (
            <button
              className={styles.addTile}
              onClick={onAddMore}
              aria-label="Add more files"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 4v16M4 12h16" stroke="#c0c0c0" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Image tile ────────────────────────────────────────────────────────────────

interface ImageTileProps {
  item: DossiBoardItem
  onDelete: () => void
}

function ImageTile({ item, onDelete }: ImageTileProps) {
  const [hovered, setHovered] = useState(false)
  // asset: prefix = Vite-bundled local asset (from VisualExplorationBoard "add to project")
  // anything else = file uploaded directly to the backend's /uploads/dossi_board/
  const src = item.file_path.startsWith('asset:')
    ? item.file_path.slice('asset:'.length)
    : `/uploads/dossi_board/${item.file_path}`

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('application/dossiboard-image-src', src)
    e.dataTransfer.setData('application/dossiboard-image-name', item.filename)
  }

  return (
    <div
      className={styles.tile}
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img src={src} alt={item.filename} className={styles.tileImg} draggable={false} />
      {hovered && <div className={styles.tileOverlay} />}
      {hovered && (
        <button
          className={styles.deleteBtn}
          onClick={onDelete}
          aria-label={`Remove ${item.filename}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {item.label && <span className={styles.tileLabel}>{item.label}</span>}
    </div>
  )
}

// ── Website tile ──────────────────────────────────────────────────────────────

interface WebsiteTileProps {
  item: DossiBoardItem
  onDelete: () => void
}

function WebsiteTile({ item, onDelete }: WebsiteTileProps) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)

  // file_path is "url:<screenshot-url>" for website items
  const thumbnailSrc = item.file_path.startsWith('url:')
    ? item.file_path.slice('url:'.length)
    : null

  const href = item.source_url || thumbnailSrc || '#'
  const domain = (() => {
    try { return new URL(href).hostname.replace(/^www\./, '') } catch { return href }
  })()

  return (
    <div
      className={`${styles.tile} ${styles.websiteTile}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.websiteTileLink}
        tabIndex={0}
      >
        {thumbnailSrc && !imgError ? (
          <img
            src={thumbnailSrc}
            alt={item.label || domain}
            className={styles.tileImg}
            draggable={false}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.websiteFallback}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#c0c0c0" strokeWidth="1.5" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#c0c0c0" strokeWidth="1.5" />
            </svg>
            <span className={styles.websiteFallbackDomain}>{domain}</span>
          </div>
        )}
        {hovered && <div className={styles.tileOverlay} />}
        <div className={styles.websiteLabel}>
          <span className={styles.websiteLabelTitle}>{item.label || domain}</span>
          <span className={styles.websiteLabelDomain}>{domain}</span>
        </div>
      </a>
      {hovered && (
        <button
          className={styles.deleteBtn}
          onClick={(e) => { e.preventDefault(); onDelete() }}
          aria-label={`Remove ${item.filename}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
