import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getGraphicElement } from '../utils/assets'
import styles from './ProjectPage.module.css'

interface Project {
  id: string
  title: string
  description?: string
  updated_at: string
  archived: boolean
  thumbnail_index: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const STEPS = ['Brief', 'Research', 'Concept', 'Develop', 'Deliver']

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load project
  useEffect(() => {
    if (!id) return
    fetch(`/api/projects/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((data: Project) => {
        setProject(data)
        setTitle(data.title === 'Untitled' ? '' : data.title)
        setDescription(data.description ?? '')
      })
      .catch(() => navigate('/'))
  }, [id, navigate])

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Untitled',
          description,
        }),
      })
      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || chatLoading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setChatLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: id,
          messages: [...messages, userMsg],
        }),
      })
      if (!res.ok) throw new Error('Chat failed')
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const displayTitle = title.trim() || 'Untitled'

  return (
    <div className={styles.layout}>
      {/* Top bar */}
      <header className={styles.header}>
        <button className={styles.logoLink} onClick={() => navigate('/')}>
          Dossier
        </button>
        <span className={styles.projectTitle}>{displayTitle}</span>
      </header>

      <div className={styles.divider} />

      <div className={styles.body}>
        {/* ── Left panel ── */}
        <aside className={styles.leftPanel}>
          {/* Title input */}
          <div className={styles.inputCard}>
            <input
              className={styles.titleInput}
              type="text"
              placeholder="Title of Project"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description input */}
          <div className={styles.textareaCard}>
            <textarea
              className={styles.descriptionInput}
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button
              className={`${styles.saveBtn} ${savedFeedback ? styles.saveBtnSaved : ''}`}
              onClick={handleSave}
              disabled={saving}
            >
              {savedFeedback ? 'SAVED' : 'SAVE'}
            </button>
          </div>

          {/* Step progress dots */}
          <div className={styles.stepsRow}>
            {STEPS.map((step, i) => (
              <div key={step} className={styles.stepItem}>
                <button
                  className={`${styles.stepDot} ${i === activeStep ? styles.stepDotActive : styles.stepDotInactive}`}
                  onClick={() => setActiveStep(i)}
                  aria-label={step}
                />
                {i < STEPS.length - 1 && <div className={styles.stepLine} />}
              </div>
            ))}
          </div>
          <div className={styles.stepLabels}>
            {STEPS.map((step, i) => (
              <span
                key={step}
                className={`${styles.stepLabel} ${i === activeStep ? styles.stepLabelActive : ''}`}
              >
                {step}
              </span>
            ))}
          </div>

          {/* Dossi Board preview */}
          <div className={styles.dossiBoard}>
            <div className={styles.dossiBoardLeft}>
              <span className={styles.dossiBoardTitle}>Dossi Board</span>
            </div>
            <div className={styles.dossiBoardRight}>
              {project && (
                <img
                  src={getGraphicElement(project.thumbnail_index)}
                  alt="Project graphic"
                  className={styles.dossiBoardImg}
                />
              )}
            </div>
          </div>
        </aside>

        {/* ── Right panel: AI Chat ── */}
        <main className={styles.chatPanel}>
          <div className={styles.chatMessages}>
            {messages.length === 0 && (
              <p className={styles.chatPrompt}>
                Start by telling me what you're trying to design, even if it's unclear!
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.chatBubble} ${msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant}`}
              >
                {msg.content}
              </div>
            ))}
            {chatLoading && (
              <div className={`${styles.chatBubble} ${styles.chatBubbleAssistant} ${styles.chatLoading}`}>
                <span />
                <span />
                <span />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input bar */}
          <div className={styles.chatInputBar}>
            <input
              className={styles.chatInput}
              type="text"
              placeholder="Ask anything"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatLoading}
            />
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={chatLoading || !input.trim()}
              aria-label="Send"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 17V3M10 3L4 9M10 3L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
