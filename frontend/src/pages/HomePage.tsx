import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar, { type FilterCategory } from '../components/Sidebar'
import ProjectCard from '../components/ProjectCard'
import DeleteModal from '../components/DeleteModal'
import styles from './HomePage.module.css'

type TabOption = 'My Project' | 'Archived'

export interface Project {
  id: string
  title: string
  updated_at: string   // ISO 8601 datetime string from the API
  archived: boolean
  thumbnail_index: number
}

const INITIAL_FILTERS: FilterCategory[] = [
  { label: 'Visual Exploration', enabled: false },
  { label: 'Typeface', enabled: false },
]

function titleMatchesSearch(title: string, searchQuery: string): boolean {
  const normalizedTitle = (title || 'Untitled').toLowerCase()
  const keywords = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (keywords.length === 0) return true
  return keywords.every((kw) => normalizedTitle.includes(kw))
}

export default function HomePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabOption>('My Project')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterCategory[]>(INITIAL_FILTERS)

  const toggleFilter = (index: number) => {
    setFilters((prev) =>
      prev.map((f, i) => (i === index ? { ...f, enabled: !f.enabled } : f))
    )
  }

  // When both toggles are off: filter by project title (keyword search). Otherwise show all.
  const filteredProjects = useMemo(() => {
    const bothOff = filters.every((f) => !f.enabled)
    if (!bothOff) return projects
    if (!searchQuery.trim()) return projects
    return projects.filter((p) => titleMatchesSearch(p.title, searchQuery))
  }, [projects, searchQuery, filters])

  const handleNewProject = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled' }),
      })
      if (!res.ok) throw new Error('Failed to create project')
      const project: Project = await res.json()
      navigate(`/project/${project.id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const fetchProjects = () => {
    const archived = activeTab === 'Archived'
    setLoading(true)
    fetch(`/api/projects?archived=${archived}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data: Project[]) => setProjects(data))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchProjects()
  }, [activeTab])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    } catch (err) {
      console.error(err)
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleArchive = async (project: Project) => {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })
      if (!res.ok) throw new Error('Failed to archive')
      setProjects((prev) => prev.filter((p) => p.id !== project.id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleRestore = async (project: Project) => {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      })
      if (!res.ok) throw new Error('Failed to restore')
      setProjects((prev) => prev.filter((p) => p.id !== project.id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className={styles.layout}>
      <Sidebar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onToggleFilter={toggleFilter}
      />

      <main className={styles.main}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.tabs}>
            {(['My Project', 'Archived'] as TabOption[]).map((tab) => (
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
          <button
            className={styles.newProjectBtn}
            onClick={handleNewProject}
            disabled={creating}
          >
            {creating ? 'Creating…' : '+ New Project'}
          </button>
        </div>

        <div className={styles.divider} />

        {/* Project grid */}
        {loading ? (
          <div className={styles.loading}>Loading…</div>
        ) : projects.length === 0 ? (
          <div className={styles.emptyState}>
            {activeTab === 'Archived'
              ? 'No archived projects.'
              : 'Click New Project to Start Discovering…'}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className={styles.emptyState}>
            No projects match your search.
          </div>
        ) : (
          <div className={styles.projectGrid}>
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => navigate(`/project/${project.id}`)}
                onDelete={() => setDeleteTarget(project)}
                onArchive={activeTab === 'My Project' ? () => handleArchive(project) : undefined}
                onRestore={activeTab === 'Archived' ? () => handleRestore(project) : undefined}
              />
            ))}
          </div>
        )}
      </main>

      {deleteTarget && (
        <DeleteModal
          projectTitle={deleteTarget.title}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
