import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ProjectCard from '../components/ProjectCard'
import styles from './HomePage.module.css'

type TabOption = 'My Project' | 'Archive'

export interface Project {
  id: string
  title: string
  updated_at: string   // ISO 8601 datetime string from the API
  archived: boolean
  thumbnail_index: number
}

export default function HomePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabOption>('My Project')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

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

  useEffect(() => {
    const archived = activeTab === 'Archive'
    setLoading(true)
    fetch(`/api/projects?archived=${archived}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data: Project[]) => setProjects(data))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [activeTab])

  return (
    <div className={styles.layout}>
      <Sidebar />

      <main className={styles.main}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.tabs}>
            {(['My Project', 'Archive'] as TabOption[]).map((tab) => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : styles.tabInactive}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
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

        {/* Active tab indicator */}
        <div className={styles.tabIndicatorRow}>
          <div
            className={styles.tabIndicator}
            style={{ marginLeft: activeTab === 'My Project' ? 0 : '152px' }}
          />
        </div>

        <div className={styles.divider} />

        {/* Project grid */}
        {loading ? (
          <div className={styles.loading}>Loading…</div>
        ) : projects.length === 0 ? (
          <div className={styles.emptyState}>
            Click New Project to Start Discovering…
          </div>
        ) : (
          <div className={styles.projectGrid}>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => navigate(`/project/${project.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
