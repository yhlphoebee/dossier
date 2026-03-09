import { useEffect, useRef, useState } from 'react'
import styles from './AddToProjectPicker.module.css'

interface Project {
  id: string
  title: string
  element_count: number
  thumbnail_index: number
}

interface AddToProjectPickerProps {
  imageSrc: string
  imageFilename: string
  onClose: () => void
}

export default function AddToProjectPicker({ imageSrc, imageFilename, onClose }: AddToProjectPickerProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [adding, setAdding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const assetKey = `asset:${imageSrc}`

    fetch('/api/projects?archived=false')
      .then((r) => r.json())
      .then((data) => {
        setProjects(
          data.map((p: { id: string; title: string; thumbnail_index: number }) => ({
            ...p,
            element_count: 0,
          }))
        )
        // Fetch each project's board items: count them AND check if this image is already there
        data.forEach((p: { id: string }) => {
          fetch(`/api/projects/${p.id}/dossi-board`)
            .then((r) => r.json())
            .then((items: { file_path: string }[]) => {
              const alreadyAdded = items.some((item) => item.file_path === assetKey)
              if (alreadyAdded) {
                setAdded((prev) => new Set(prev).add(p.id))
              }
              setProjects((prev) =>
                prev.map((proj) =>
                  proj.id === p.id ? { ...proj, element_count: items.length } : proj
                )
              )
            })
            .catch(() => {})
        })
      })
      .catch(() => {})
  }, [imageSrc])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleToggle = async (projectId: string) => {
    if (adding === projectId || removing === projectId) return

    if (added.has(projectId)) {
      setRemoving(projectId)
      try {
        await fetch(
          `/api/projects/${projectId}/dossi-board/from-asset?src_path=${encodeURIComponent(imageSrc)}`,
          { method: 'DELETE' },
        )
        setAdded((prev) => { const next = new Set(prev); next.delete(projectId); return next })
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, element_count: Math.max(0, p.element_count - 1) } : p
          )
        )
      } catch {
        // silently fail
      } finally {
        setRemoving(null)
      }
    } else {
      setAdding(projectId)
      try {
        const filename = imageFilename || imageSrc.split('/').pop() || 'image.png'
        await fetch(`/api/projects/${projectId}/dossi-board/from-asset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ src_path: imageSrc, filename, folder: 'images' }),
        })
        setAdded((prev) => new Set(prev).add(projectId))
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, element_count: p.element_count + 1 } : p
          )
        )
      } catch {
        // silently fail
      } finally {
        setAdding(null)
      }
    }
  }

  return (
    <div className={styles.panel} ref={ref}>
      {projects.length === 0 ? (
        <div className={styles.empty}>No projects yet</div>
      ) : (
        projects.map((project) => {
          const isAdded = added.has(project.id)
          const isLoading = adding === project.id || removing === project.id
          return (
            <div key={project.id} className={`${styles.row} ${isAdded ? styles.rowAdded : ''}`} onClick={() => handleToggle(project.id)}>
              {/* Thumbnail */}
              <div className={styles.thumb} />

              {/* Info */}
              <div className={styles.info}>
                <span className={styles.projectTitle}>
                  {project.title || 'Untitled'}
                </span>
                <span className={styles.elementCount}>
                  {String(project.element_count).padStart(2, '0')} element{project.element_count !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Add / remove button — visual only, row handles the click */}
              <div
                className={`${styles.addBtn} ${isAdded ? styles.addBtnAdded : ''}`}
                aria-label={isAdded ? `Remove from ${project.title}` : `Add to ${project.title}`}
              >
                {isLoading ? (
                  <span className={styles.spinner} />
                ) : isAdded ? (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5L4.5 8.5L11 1" stroke="#8deaff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v10M1 6h10" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
