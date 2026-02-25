import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getGraphicElement } from '../utils/assets'
import styles from './ProjectPage.module.css'

interface Project {
  id: string
  title: string
  description?: string
  updated_at: string
  archived: boolean
  thumbnail_index: number
  strategy_summary?: string
  strategy_problem_statement?: string
  strategy_assumptions?: string
  strategy_detail_summary?: string
  research_summary?: string
  research_problem_statement?: string
  research_assumptions?: string
  research_detail_summary?: string
  concept_summary?: string
  concept_problem_statement?: string
  concept_assumptions?: string
  concept_detail_summary?: string
  present_summary?: string
  present_problem_statement?: string
  present_assumptions?: string
  present_detail_summary?: string
}

interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

type AgentKey = 'strategy' | 'research' | 'concept' | 'present'

const TABS = ['Strategy', 'Research', 'Concept', 'Present'] as const
const TAB_KEYS: AgentKey[] = ['strategy', 'research', 'concept', 'present']
const CLARITY_DOTS = 8

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [clarityLevel] = useState(2)
  const [summaryByAgent, setSummaryByAgent] = useState<Record<AgentKey, string>>({
    strategy: '',
    research: '',
    concept: '',
    present: '',
  })
  const [problemByAgent, setProblemByAgent] = useState<Record<AgentKey, string>>({
    strategy: '',
    research: '',
    concept: '',
    present: '',
  })
  const [assumptionsByAgent, setAssumptionsByAgent] = useState<Record<AgentKey, string>>({
    strategy: '',
    research: '',
    concept: '',
    present: '',
  })
  const [problemOpen, setProblemOpen] = useState(false)
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)

  const [messagesByAgent, setMessagesByAgent] = useState<Record<AgentKey, ChatMessage[]>>({
    strategy: [],
    research: [],
    concept: [],
    present: [],
  })
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const titleSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const summarySaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const problemSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const assumptionsSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const LINE_HEIGHT_PX = 18 * 1.4 // font-size * line-height
  const MAX_LINES = 8
  const MAX_INPUT_HEIGHT_PX = LINE_HEIGHT_PX * MAX_LINES

  function resizeChatInput() {
    const el = chatInputRef.current
    if (!el) return
    el.style.height = 'auto'
    const h = Math.min(el.scrollHeight, MAX_INPUT_HEIGHT_PX)
    el.style.height = `${Math.max(LINE_HEIGHT_PX, h)}px`
  }

  useEffect(() => {
    resizeChatInput()
  }, [input])

  // Load project + per-agent chat history in parallel
  useEffect(() => {
    if (!id) return

    fetch(`/api/projects/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json() as Promise<Project>
      })
      .then(async (projectData) => {
        setProject(projectData)
        setTitle(projectData.title === 'Untitled' ? '' : projectData.title)
        setDescription(projectData.description ?? '')

        // Seed per-agent summaries from project fields
        setSummaryByAgent({
          strategy: projectData.strategy_summary ?? '',
          research: projectData.research_summary ?? '',
          concept: projectData.concept_summary ?? '',
          present: projectData.present_summary ?? '',
        })
        setProblemByAgent({
          strategy: projectData.strategy_problem_statement ?? '',
          research: projectData.research_problem_statement ?? '',
          concept: projectData.concept_problem_statement ?? '',
          present: projectData.present_problem_statement ?? '',
        })
        setAssumptionsByAgent({
          strategy: projectData.strategy_assumptions ?? '',
          research: projectData.research_assumptions ?? '',
          concept: projectData.concept_assumptions ?? '',
          present: projectData.present_assumptions ?? '',
        })

        // Load per-agent chat history
        const agents: AgentKey[] = ['strategy', 'research', 'concept', 'present']
        const histories = await Promise.all(
          agents.map((agent) =>
            fetch(`/api/projects/${id}/messages?agent=${agent}`).then((r) =>
              r.ok ? (r.json() as Promise<ChatMessage[]>) : []
            )
          )
        )

        setMessagesByAgent({
          strategy: histories[0] ?? [],
          research: histories[1] ?? [],
          concept: histories[2] ?? [],
          present: histories[3] ?? [],
        })
      })
      .catch(() => navigate('/'))
  }, [id, navigate])

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesByAgent, activeTab])

  // Auto-save summary when user stops typing (debounced)
  useEffect(() => {
    if (!id || project === null) return
    const currentAgent = TAB_KEYS[activeTab]
    const valueToSave = summaryByAgent[currentAgent]

    if (summarySaveTimeoutRef.current) clearTimeout(summarySaveTimeoutRef.current)
    summarySaveTimeoutRef.current = setTimeout(async () => {
      summarySaveTimeoutRef.current = null
      try {
        await fetch(`/api/projects/${id}/agent-summary`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: currentAgent,
            summary: valueToSave,
          }),
        })
        // No feedback for summary saves, to avoid noise
      } catch {
        // Silent fail for now
      }
    }, 800)  // Slightly longer debounce for summary

    return () => {
      if (summarySaveTimeoutRef.current) clearTimeout(summarySaveTimeoutRef.current)
    }
  }, [summaryByAgent, activeTab, id, project])

  // Auto-save problem statement when user stops typing (debounced)
  useEffect(() => {
    if (!id || project === null) return
    const currentAgent = TAB_KEYS[activeTab]
    const valueToSave = problemByAgent[currentAgent]

    if (problemSaveTimeoutRef.current) clearTimeout(problemSaveTimeoutRef.current)
    problemSaveTimeoutRef.current = setTimeout(async () => {
      problemSaveTimeoutRef.current = null
      try {
        await fetch(`/api/projects/${id}/agent-summary`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: currentAgent,
            problem_statement: valueToSave,
          }),
        })
        // No feedback for saves, to avoid noise
      } catch {
        // Silent fail for now
      }
    }, 800)

    return () => {
      if (problemSaveTimeoutRef.current) clearTimeout(problemSaveTimeoutRef.current)
    }
  }, [problemByAgent, activeTab, id, project])

  // Auto-save assumptions when user stops typing (debounced)
  useEffect(() => {
    if (!id || project === null) return
    const currentAgent = TAB_KEYS[activeTab]
    const valueToSave = assumptionsByAgent[currentAgent]

    if (assumptionsSaveTimeoutRef.current) clearTimeout(assumptionsSaveTimeoutRef.current)
    assumptionsSaveTimeoutRef.current = setTimeout(async () => {
      assumptionsSaveTimeoutRef.current = null
      try {
        await fetch(`/api/projects/${id}/agent-summary`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: currentAgent,
            assumptions: valueToSave,
          }),
        })
        // No feedback for saves, to avoid noise
      } catch {
        // Silent fail for now
      }
    }, 800)

    return () => {
      if (assumptionsSaveTimeoutRef.current) clearTimeout(assumptionsSaveTimeoutRef.current)
    }
  }, [assumptionsByAgent, activeTab, id, project])

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const agent = TAB_KEYS[activeTab]
      const res = await fetch(`/api/projects/${id}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent }),
      })
      if (!res.ok) throw new Error('Summary failed')
      const data: {
        summary: string
        problem_statment: string
        assumptions: string
        detail_summary: string
      } = await res.json()

      setSummaryByAgent((prev) => ({ ...prev, [agent]: data.summary }))
      setProblemByAgent((prev) => ({ ...prev, [agent]: data.problem_statment }))
      setAssumptionsByAgent((prev) => ({ ...prev, [agent]: data.assumptions }))

      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || chatLoading) return

    const agent = TAB_KEYS[activeTab]

    // Optimistically show the user message immediately
    const optimisticUser: ChatMessage = { role: 'user', content: text }
    setMessagesByAgent((prev) => ({
      ...prev,
      [agent]: [...prev[agent], optimisticUser],
    }))
    setInput('')
    setChatLoading(true)

    try {
      const res = await fetch(`/api/projects/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, agent }),
      })
      if (!res.ok) throw new Error('Chat failed')
      const data = await res.json()
      // Replace the optimistic user message with the persisted one, then add assistant reply
      setMessagesByAgent((prev) => ({
        ...prev,
        [agent]: [
          ...prev[agent].slice(0, -1),
          data.user_message,
          data.assistant_message,
        ],
      }))
    } catch {
      setMessagesByAgent((prev) => ({
        ...prev,
        [agent]: [
          ...prev[agent],
          { role: 'assistant' as const, content: 'Sorry, something went wrong. Please try again.' },
        ],
      }))
    } finally {
      setChatLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const displayTitle = title.trim() || 'Untitled'
  const currentAgent: AgentKey = TAB_KEYS[activeTab]
  const messages = messagesByAgent[currentAgent]
  const problemStatement = problemByAgent[currentAgent]
  const assumptions = assumptionsByAgent[currentAgent]
   const summary = summaryByAgent[currentAgent]

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
          {/* Tab bar */}
          <nav className={styles.tabBar}>
            {TABS.map((tab, i) => (
              <button
                key={tab}
                className={`${styles.tab} ${i === activeTab ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {tab}
                {i === activeTab && <span className={styles.tabIndicator} />}
              </button>
            ))}
          </nav>

          {/* Main case file card */}
          <div className={styles.caseCard}>
            {/* Top row: date + UPDATE button */}
            <div className={styles.cardTopRow}>
              <span className={styles.cardDate}>
                {project
                  ? new Date(project.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      year: 'numeric',
                    })
                  : '—'}
              </span>
              <button
                className={`${styles.updateBtn} ${savedFeedback ? styles.updateBtnSaved : ''}`}
                onClick={handleSave}
                disabled={saving}
              >
                {savedFeedback ? 'SAVED' : 'UPDATE'}
              </button>
            </div>

            <div className={styles.cardDivider} />

            {/* Strategic Clarity row */}
            <div className={styles.clarityRow}>
              <span className={styles.clarityLabel}>Strategic Clarity</span>
              <div className={styles.clarityDots}>
                {Array.from({ length: CLARITY_DOTS }).map((_, i) => (
                  <span
                    key={i}
                    className={`${styles.clarityDot} ${i < clarityLevel ? styles.clarityDotActive : ''}`}
                  />
                ))}
              </div>
            </div>

            <div className={styles.cardDivider} />

            {/* Key statement block */}
            <div className={styles.statementBlock}>
              <textarea
                className={styles.statementInput}
                placeholder="Enter your key strategic statement here…"
                value={summary}
                onChange={(e) =>
                  setSummaryByAgent((prev) => ({ ...prev, [currentAgent]: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className={styles.cardDivider} />

            {/* Accordion: Problem Statement */}
            <div className={styles.accordionRow}>
              <button
                className={styles.accordionHeader}
                onClick={() => setProblemOpen((v) => !v)}
              >
                <span className={styles.accordionLabel}>Problem Statement</span>
                <svg
                  className={`${styles.chevron} ${problemOpen ? styles.chevronOpen : ''}`}
                  width="12" height="8" viewBox="0 0 12 8" fill="none"
                >
                  <path d="M1 1L6 6L11 1" stroke="#999" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              {problemOpen && (
                <textarea
                  className={styles.accordionTextarea}
                  placeholder="Describe the problem this project addresses…"
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  rows={4}
                />
              )}
            </div>

            <div className={styles.cardDivider} />

            {/* Accordion: Assumptions */}
            <div className={styles.accordionRow}>
              <button
                className={styles.accordionHeader}
                onClick={() => setAssumptionsOpen((v) => !v)}
              >
                <span className={styles.accordionLabel}>Assumptions</span>
                <svg
                  className={`${styles.chevron} ${assumptionsOpen ? styles.chevronOpen : ''}`}
                  width="12" height="8" viewBox="0 0 12 8" fill="none"
                >
                  <path d="M1 1L6 6L11 1" stroke="#999" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              {assumptionsOpen && (
                <textarea
                  className={styles.accordionTextarea}
                  placeholder="List the key assumptions for this project…"
                  value={assumptions}
                  onChange={(e) => setAssumptions(e.target.value)}
                  rows={4}
                />
              )}
            </div>
          </div>

          {/* Dossi Board preview */}
          <div className={styles.dossiBoard}>
            <div className={styles.dossiBoardLeft}>
              <span className={styles.dossiBoardTitle}>Dossi Board</span>
              <svg className={styles.dossiBoardArrow} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="10" y1="110" x2="110" y2="10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <polyline points="2,10 110,10 110,118" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
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
                {msg.role === 'assistant' ? (
                  <div className={styles.chatMarkdown}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
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
            <textarea
              ref={chatInputRef}
              className={styles.chatInput}
              placeholder="Ask anything"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatLoading}
              rows={1}
              aria-label="Chat message"
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
