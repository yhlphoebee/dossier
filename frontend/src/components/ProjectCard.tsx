import { useRef, useState } from 'react'
import type { Project } from '../pages/HomePage'
import { getGraphicElement } from '../utils/assets'
import styles from './ProjectCard.module.css'
import { EllipsisOutlined, DeleteOutlined, InboxOutlined, UndoOutlined } from '@ant-design/icons'

interface ProjectCardProps {
  project: Project
  onClick: () => void
  onDelete: () => void
  onArchive?: () => void
  onRestore?: () => void
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'today' /* updated_at in future (e.g. timezone) */
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return '1 month ago'
  return `${Math.floor(diffDays / 30)} months ago`
}

export default function ProjectCard({ project, onClick, onDelete, onArchive, onRestore }: ProjectCardProps) {
  const graphicSrc = getGraphicElement(project.thumbnail_index)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen((prev) => !prev)
  }

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    setMenuOpen(false)
    action()
  }

  return (
    <div
      className={styles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onBlur={(e) => {
        if (!menuRef.current?.contains(e.relatedTarget as Node)) {
          setMenuOpen(false)
        }
      }}
    >
      <div className={styles.thumbnail}>
        {/* Full-bleed layer: circle + graphic sized to full thumbnail (Figma: 400/432, 280/432) */}
        <div className={styles.thumbnailFill}>
          <div className={styles.circle} />
          <img
            src={graphicSrc}
            alt={project.title}
            className={styles.thumbnailImg}
          />
        </div>

        {/* Top bar markers */}
        <div className={styles.topMarkers}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.markerTop} />
          ))}
        </div>

        {/* Bottom bar markers */}
        <div className={styles.bottomMarkers}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.markerBottom} />
          ))}
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.titleRow}>
          <p className={styles.title}>{project.title}</p>

          {/* More button + dropdown */}
          <div className={styles.moreWrapper} ref={menuRef}>
            <button
              className={styles.moreBtn}
              onClick={handleMoreClick}
              aria-label="More options"
              tabIndex={0}
            >
              <EllipsisOutlined />
            </button>

            {menuOpen && (
              <div className={styles.dropdown}>
                <button
                  className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                  onClick={(e) => handleMenuAction(e, onDelete)}
                >
                  <DeleteOutlined className={styles.dropdownIcon} />
                  <span>Delete</span>
                </button>

                {onArchive && (
                  <button
                    className={styles.dropdownItem}
                    onClick={(e) => handleMenuAction(e, onArchive)}
                  >
                    <InboxOutlined className={styles.dropdownIcon} />
                    <span>Archive</span>
                  </button>
                )}

                {onRestore && (
                  <button
                    className={styles.dropdownItem}
                    onClick={(e) => handleMenuAction(e, onRestore)}
                  >
                    <UndoOutlined className={styles.dropdownIcon} />
                    <span>Restore</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className={styles.date}>{formatRelativeDate(project.updated_at)}</p>
      </div>
    </div>
  )
}
