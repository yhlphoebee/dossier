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

  const handleAdd = async (projectId: string) => {
    if (adding || added.has(projectId)) return
    setAdding(projectId)
    try {
      const filename = imageFilename || imageSrc.split('/').pop() || 'image.png'
      await fetch(`/api/projects/${projectId}/dossi-board/from-asset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          src_path: imageSrc,
          filename,
          folder: 'images',
        }),
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

  return (
    <div className={styles.panel} ref={ref}>
      {projects.length === 0 ? (
        <div className={styles.empty}>No projects yet</div>
      ) : (
        projects.map((project) => {
          const isAdded = added.has(project.id)
          const isLoading = adding === project.id
          return (
            <div key={project.id} className={`${styles.row} ${isAdded ? styles.rowAdded : ''}`}>
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

              {/* Add button */}
              <button
                className={`${styles.addBtn} ${isAdded ? styles.addBtnAdded : ''}`}
                onClick={() => handleAdd(project.id)}
                disabled={isLoading || isAdded}
                aria-label={isAdded ? 'Added' : `Add to ${project.title}`}
              >
                {isLoading ? (
                  <span className={styles.spinner} />
                ) : isAdded ? (
                  <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                    <path d="M1 5.5L5.5 10L13 1" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v12M1 7h12" stroke="#888" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}
