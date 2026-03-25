import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DossiBoard, { DossiBoardHandle } from '../components/DossiBoard'
import DossiBoardPreview from '../components/DossiBoardPreview'
import type { CoverLogoConfig } from '../utils/coverLogo'
import { coverLogoHasLetters, lerpGradientColor, rgbToRgba } from '../utils/coverLogo'
import StrategistIdle from '../components/StrategistIdle'
import ResearcherIdle from '../components/ResearcherIdle'
import DirectorIdle from '../components/DirectorIdle'
import PresenterIdle from '../components/PresenterIdle'
import styles from './ProjectPage.module.css'

interface Project {
  id: string
  title: string
  description?: string
  updated_at: string
  archived: boolean
  thumbnail_index: number
  cover_logo?: CoverLogoConfig | null
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

interface Citation {
  url: string
  title?: string
  start_index?: number
  end_index?: number
}

interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
  image_url?: string
  image_src?: string  // client-only alias; populated from image_url on load
  citations?: Citation[]  // web search sources (Research agent); only on newly received messages
  web_search_used?: boolean  // true when this reply used the web-search model
  bodyContent?: string  // content with the References block stripped out
}

/**
 * Splits a stored research-agent message into the main body and a citations array.
 * Looks for a trailing "\n\nReferences:\n1. [title](url)" block.
 */
function parseReferencesFromContent(content: string): { body: string; citations: Citation[] } {
  // Find the LAST occurrence of a standalone "References:" line followed by numbered links.
  // We look for "\n\nReferences:\n1. [" so we don't accidentally match "Confirmed References:" in the body.
  const marker = '\n\nReferences:\n'
  const markerIdx = content.lastIndexOf(marker)
  if (markerIdx === -1) return { body: content, citations: [] }

  const refBlock = content.slice(markerIdx + marker.length)
  const citations: Citation[] = []

  for (const line of refBlock.split('\n')) {
    // Match: "1. [title](url)" or "1. [title](url) – note"
    const m = line.match(/^\d+\.\s+\[([^\]]*)\]\(([^)]+)\)/)
    if (m) citations.push({ title: m[1] || m[2], url: m[2] })
  }

  if (citations.length === 0) return { body: content, citations: [] }

  return { body: content.slice(0, markerIdx).trim(), citations }
}

type AgentKey = 'strategy' | 'research' | 'concept' | 'present'

const TABS = ['Strategist', 'Researcher', 'Director', 'Presenter'] as const
const TAB_KEYS: AgentKey[] = ['strategy', 'research', 'concept', 'present']
const CLARITY_DOTS = 8

interface AgentConfig {
  clarityLabel: string
  summaryLabel: string
  summaryPlaceholder: string
  field2Label: string
  field2Placeholder: string
  field3Label: string
  field3Placeholder: string
}

const AGENT_CONFIG: Record<AgentKey, AgentConfig> = {
  strategy: {
    clarityLabel: 'Strategic Clarity',
    summaryLabel: 'Core Hypothesis',
    summaryPlaceholder: 'What is the core hypothesis driving this strategy?',
    field2Label: 'Problem',
    field2Placeholder: 'What problem does this project address?',
    field3Label: 'Assumptions',
    field3Placeholder: 'List the key assumptions for this strategy…',
  },
  research: {
    clarityLabel: 'Evidence Strength',
    summaryLabel: 'Key Insight',
    summaryPlaceholder: 'What is the key insight from your research?',
    field2Label: 'References',
    field2Placeholder: 'List key references and sources…',
    field3Label: 'Gaps',
    field3Placeholder: 'What gaps remain in the research?',
  },
  concept: {
    clarityLabel: 'System Coherence',
    summaryLabel: 'Core Visual Rule',
    summaryPlaceholder: 'Elements connect through directional flow to represent pairing',
    field2Label: 'Key Moves',
    field2Placeholder: 'What are the key design moves?',
    field3Label: 'Risks',
    field3Placeholder: 'What are the risks in this direction?',
  },
  present: {
    clarityLabel: 'Narrative Clarity',
    summaryLabel: 'Core Thesis',
    summaryPlaceholder: '1 sentence',
    field2Label: '3 Arguments',
    field2Placeholder: 'List the 3 main arguments…',
    field3Label: 'Weak Points',
    field3Placeholder: 'What are the weak points in this narrative?',
  },
}

type AgentIdleMode = 'full' | 'compact'

/** `full` = empty-state hero only. `compact` = character-only square crop (typing row + thread avatar). */
function AgentCharacterIdle({ agent, mode = 'full' }: { agent: AgentKey; mode?: AgentIdleMode }) {
  const variant = mode === 'compact' ? 'loading' : 'full'
  switch (agent) {
    case 'strategy':
      return <StrategistIdle variant={variant} />
    case 'research':
      return <ResearcherIdle variant={variant} />
    case 'concept':
      return <DirectorIdle variant={variant} />
    case 'present':
      return <PresenterIdle variant={variant} />
  }
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [project, setProject] = useState<Project | null>(null)
  const [title, setTitle] = useState('')
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
  // Color picked from the gradient bar in DossiBoardPreview
  const [dossiBoardColor, setDossiBoardColor] = useState('#93ccff')
  const handleDossiBoardColor = useCallback((color: string) => setDossiBoardColor(color), [])

  const handleCoverLogoSaved = useCallback((logo: CoverLogoConfig | null) => {
    setProject((p) => (p ? { ...p, cover_logo: logo } : null))
  }, [])

  // 'closed' | 'opening' | 'open' | 'closing'
  const [dossiBoardState, setDossiBoardState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed')
  const [dossiBoardWidth, setDossiBoardWidth] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const dossiBoardRef = useRef<DossiBoardHandle>(null)

  const openDossiBoard = () => {
    setDossiBoardState('opening')
    requestAnimationFrame(() => requestAnimationFrame(() => setDossiBoardState('open')))
  }

  const closeDossiBoard = () => {
    setDossiBoardState('closing')
    setDossiBoardWidth(null)
    setTimeout(() => setDossiBoardState('closed'), 420)
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.clientX
    const startWidth = bodyRef.current
      ? (dossiBoardWidth ?? bodyRef.current.offsetWidth * 0.62)
      : (dossiBoardWidth ?? window.innerWidth * 0.62)

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent) => {
      const bodyWidth = bodyRef.current?.offsetWidth ?? window.innerWidth
      const newWidth = Math.min(
        Math.max(startWidth + (ev.clientX - startX), 720),
        bodyWidth - 550,
      )
      setDossiBoardWidth(newWidth)
    }

    const onMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Panel is wide during opening + open; starts collapsing the moment closing begins
  const dossiBoardExpanded = dossiBoardState === 'opening' || dossiBoardState === 'open'
  // DossiBoard div stays mounted during closing so it can animate out
  const dossiBoardMounted = dossiBoardState !== 'closed'
  // Only 'open' gets the visible class — 'opening' is the initial mounted-but-invisible frame
  const dossiBoardVisible = dossiBoardState === 'open'

  const [messagesByAgent, setMessagesByAgent] = useState<Record<AgentKey, ChatMessage[]>>({
    strategy: [],
    research: [],
    concept: [],
    present: [],
  })
  // Set of source_urls already saved to the dossi board websites folder
  const [savedBoardUrls, setSavedBoardUrls] = useState<Set<string>>(new Set())
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [droppedImage, setDroppedImage] = useState<{ src: string; name: string } | null>(null)
  const [chatInputDragOver, setChatInputDragOver] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const titleSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const summarySaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const problemSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const assumptionsSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Local state for textareas to prevent cursor jumping
  const [localSummary, setLocalSummary] = useState('')
  const [localProblem, setLocalProblem] = useState('')
  const [localAssumptions, setLocalAssumptions] = useState('')

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

  // Sync local textarea state with global state when agent changes
  useEffect(() => {
    const currentAgent = TAB_KEYS[activeTab]
    setLocalSummary(summaryByAgent[currentAgent])
    setLocalProblem(problemByAgent[currentAgent])
    setLocalAssumptions(assumptionsByAgent[currentAgent])
  }, [activeTab, summaryByAgent, problemByAgent, assumptionsByAgent])

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
        if (projectData.cover_logo && coverLogoHasLetters(projectData.cover_logo)) {
          const c = lerpGradientColor(projectData.cover_logo.gradient_t)
          setDossiBoardColor(rgbToRgba(c, 1))
        } else {
          setDossiBoardColor('#93ccff')
        }

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

        // Load per-agent chat history + saved board URLs in parallel
        const agents: AgentKey[] = ['strategy', 'research', 'concept', 'present']
        const [histories, boardItems] = await Promise.all([
          Promise.all(
            agents.map((agent) =>
              fetch(`/api/projects/${id}/messages?agent=${agent}`).then((r) =>
                r.ok ? (r.json() as Promise<ChatMessage[]>) : []
              )
            )
          ),
          fetch(`/api/projects/${id}/dossi-board?folder=websites`).then((r) =>
            r.ok ? (r.json() as Promise<{ source_url: string | null }[]>) : []
          ),
        ])

        // Build the set of already-saved URLs
        const savedUrls = new Set<string>(
          boardItems.flatMap((item) => (item.source_url ? [item.source_url] : []))
        )
        setSavedBoardUrls(savedUrls)

        const hydrate = (msgs: ChatMessage[], agent: AgentKey) =>
          msgs.map((m) => {
            const base = { ...m, image_src: m.image_url ?? m.image_src }
            if (agent === 'research' && m.role === 'assistant') {
              const { body, citations } = parseReferencesFromContent(m.content)
              return { ...base, bodyContent: body, citations: citations.length > 0 ? citations : undefined }
            }
            return base
          })

        setMessagesByAgent({
          strategy: hydrate(histories[0] ?? [], 'strategy'),
          research: hydrate(histories[1] ?? [], 'research'),
          concept: hydrate(histories[2] ?? [], 'concept'),
          present: hydrate(histories[3] ?? [], 'present'),
        })
      })
      .catch(() => navigate('/'))
  }, [id, navigate])

  // Open Dossi Board when navigating from sidebar "Visual Exploration" project list
  useEffect(() => {
    if (!id || (location.state as { openDossiBoard?: boolean } | null)?.openDossiBoard !== true) return
    setDossiBoardState('opening')
    requestAnimationFrame(() => requestAnimationFrame(() => setDossiBoardState('open')))
    navigate(location.pathname, { replace: true, state: {} })
  }, [id, location.state, location.pathname, navigate])

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesByAgent, activeTab])

  // Auto-save summary when user stops typing (debounced)
  useEffect(() => {
    const currentAgent = TAB_KEYS[activeTab]

    if (summarySaveTimeoutRef.current) clearTimeout(summarySaveTimeoutRef.current)
    summarySaveTimeoutRef.current = setTimeout(async () => {
      summarySaveTimeoutRef.current = null
      setSummaryByAgent((prev) => ({ ...prev, [currentAgent]: localSummary }))
      try {
        await fetch(`/api/projects/${id}/agent-summary`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: currentAgent,
            summary: localSummary,
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
  }, [localSummary, activeTab, id])

  // Auto-save problem statement when user stops typing (debounced)
  useEffect(() => {
    const currentAgent = TAB_KEYS[activeTab]

    if (problemSaveTimeoutRef.current) clearTimeout(problemSaveTimeoutRef.current)
    problemSaveTimeoutRef.current = setTimeout(async () => {
      problemSaveTimeoutRef.current = null
      setProblemByAgent((prev) => ({ ...prev, [currentAgent]: localProblem }))
      try {
        await fetch(`/api/projects/${id}/agent-summary`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: currentAgent,
            problem_statement: localProblem,
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
  }, [localProblem, activeTab, id])

  // Auto-save assumptions when user stops typing (debounced)
  useEffect(() => {
    const currentAgent = TAB_KEYS[activeTab]

    if (assumptionsSaveTimeoutRef.current) clearTimeout(assumptionsSaveTimeoutRef.current)
    assumptionsSaveTimeoutRef.current = setTimeout(async () => {
      assumptionsSaveTimeoutRef.current = null
      setAssumptionsByAgent((prev) => ({ ...prev, [currentAgent]: localAssumptions }))
      try {
        await fetch(`/api/projects/${id}/agent-summary`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: currentAgent,
            assumptions: localAssumptions,
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
  }, [localAssumptions, activeTab, id])

  // Auto-save title when user stops typing (debounced)
  useEffect(() => {
    if (!id || project === null) return
    const valueToSave = title.trim() || 'Untitled'
    if (valueToSave === project.title) return

    if (titleSaveTimeoutRef.current) clearTimeout(titleSaveTimeoutRef.current)
    titleSaveTimeoutRef.current = setTimeout(async () => {
      titleSaveTimeoutRef.current = null
      setSaving(true)
      try {
        await fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: valueToSave }),
        })
        setProject((prev) => (prev ? { ...prev, title: valueToSave } : null))
        setSavedFeedback(true)
        setTimeout(() => setSavedFeedback(false), 2000)
      } finally {
        setSaving(false)
      }
    }, 600)

    return () => {
      if (titleSaveTimeoutRef.current) clearTimeout(titleSaveTimeoutRef.current)
    }
  }, [title, id, project])

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
    if ((!text && !droppedImage) || chatLoading) return

    const agent = TAB_KEYS[activeTab]
    const imageToSend = droppedImage

    // Convert dropped image to base64 if present
    let imageBase64: string | null = null
    if (imageToSend) {
      try {
        const imgRes = await fetch(imageToSend.src)
        const blob = await imgRes.blob()
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      } catch {
        // If image fetch fails, proceed without it
      }
    }

    const displayContent = text || ''

    // Optimistically show the user message immediately
    const optimisticUser: ChatMessage = {
      role: 'user',
      content: displayContent,
      ...(imageToSend ? { image_src: imageToSend.src } : {}),
    }
    setMessagesByAgent((prev) => ({
      ...prev,
      [agent]: [...prev[agent], optimisticUser],
    }))
    setInput('')
    setDroppedImage(null)
    setChatLoading(true)

    try {
      const res = await fetch(`/api/projects/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text || ' ',
          agent,
          ...(imageBase64 ? { image_url: imageBase64 } : {}),
        }),
      })
      if (!res.ok) throw new Error('Chat failed')
      const data = await res.json()
      // Replace the optimistic user message with the persisted one, then add assistant reply (with citations if any)
      const assistantMsg: ChatMessage = { ...data.assistant_message, citations: data.citations ?? undefined, web_search_used: data.web_search_used }
      if (agent === 'research' && assistantMsg.role === 'assistant') {
        const { body } = parseReferencesFromContent(assistantMsg.content)
        assistantMsg.bodyContent = body
      }
      setMessagesByAgent((prev) => ({
        ...prev,
        [agent]: [
          ...prev[agent].slice(0, -1),
          { ...data.user_message, image_src: data.user_message.image_url ?? undefined },
          assistantMsg,
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

  const handleChatInputDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setChatInputDragOver(false)
    const src = e.dataTransfer.getData('application/dossiboard-image-src')
    const name = e.dataTransfer.getData('application/dossiboard-image-name')
    if (src) {
      setDroppedImage({ src, name: name || 'image' })
    }
  }

  const handleChatInputDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/dossiboard-image-src')) {
      e.preventDefault()
      setChatInputDragOver(true)
    }
  }

  const handleChatInputDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setChatInputDragOver(false)
    }
  }

  const currentAgent: AgentKey = TAB_KEYS[activeTab]
  const messages = messagesByAgent[currentAgent]

  let lastAssistantIndex = -1
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    if (messages[idx].role === 'assistant') {
      lastAssistantIndex = idx
      break
    }
  }

  const renderComposer = (variant: 'idle' | 'thread') => {
    const idle = variant === 'idle'
    return (
      <div className={idle ? `${styles.chatInputWrap} ${styles.chatInputWrapUnderHero}` : styles.chatInputWrap}>
        <div
          className={`${styles.chatInputBar} ${chatInputDragOver ? styles.chatInputBarDragOver : ''} ${idle ? styles.chatInputBarHero : ''} ${idle && input.trim() ? styles.chatInputBarHeroExpanded : ''}`}
          onDrop={handleChatInputDrop}
          onDragOver={handleChatInputDragOver}
          onDragLeave={handleChatInputDragLeave}
        >
          {droppedImage && (
            <div className={styles.imagePreviewRow}>
              <div className={styles.imagePreviewWrap}>
                <img src={droppedImage.src} alt={droppedImage.name} className={styles.imagePreview} />
                <button
                  className={styles.imagePreviewRemove}
                  onClick={() => setDroppedImage(null)}
                  aria-label="Remove image"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1l8 8M9 1L1 9" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          {chatInputDragOver && !droppedImage && (
            <div className={styles.chatDropHint}>Drop image here</div>
          )}
          <div className={styles.chatInputRow}>
            <textarea
              ref={chatInputRef}
              className={styles.chatInput}
              placeholder={droppedImage ? 'Add a message (optional)…' : 'Ask anything'}
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
              disabled={chatLoading || (!input.trim() && !droppedImage)}
              aria-label="Send"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 17V3M10 3L4 9M10 3L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      {/* Top bar */}
      <header className={styles.header}>
        <button className={styles.logoLink} onClick={() => navigate('/home')}>
          DOSSIER
        </button>
        <input
          className={`${styles.projectTitle} ${styles.projectTitleInput}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          size={Math.max(8, (title || 'Untitled').length + 1)}
          aria-label="Project title"
        />
      </header>

      <div className={styles.divider} />

      <div className={styles.body} ref={bodyRef} style={{ '--accent': dossiBoardColor } as React.CSSProperties}>
        {/* ── Left panel ── */}
        <aside
          className={`${styles.leftPanel} ${dossiBoardExpanded ? styles.leftPanelExpanded : ''} ${dossiBoardState === 'open' ? styles.leftPanelOpen : ''} ${isResizing ? styles.leftPanelResizing : ''}`}
          style={dossiBoardExpanded && dossiBoardWidth !== null ? { width: dossiBoardWidth, minWidth: dossiBoardWidth } : undefined}
        >
          {/* Normal content — fades out as board opens */}
          <div className={`${styles.panelNormal} ${dossiBoardState === 'open' || dossiBoardState === 'opening' ? styles.panelNormalHidden : ''}`}>
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

            {/* Clarity row — label changes per agent */}
            <div className={styles.clarityRow}>
              <span className={styles.clarityLabel}>{AGENT_CONFIG[currentAgent].clarityLabel}</span>
              <div className={`${styles.clarityDots} ${saving ? styles.clarityDotsLoading : ''}`}>
                {Array.from({ length: CLARITY_DOTS }).map((_, i) => (
                  <span
                    key={i}
                    className={`${styles.clarityDot} ${!saving && i < clarityLevel ? styles.clarityDotActive : ''}`}
                    style={saving ? { animationDelay: `${i * 0.1}s` } : undefined}
                  />
                ))}
              </div>
            </div>

            <div className={styles.cardDivider} />

            {/* Summary / core statement block */}
            <div className={styles.sectionBlock}>
              <span className={styles.sectionLabel}>{AGENT_CONFIG[currentAgent].summaryLabel}</span>
              {currentAgent === 'present' && (
                <span className={styles.sectionHint}>→ (1 sentence)</span>
              )}
              <p className={`${styles.sectionText} ${styles.sectionTextStatement}${!localSummary ? ` ${styles.sectionTextEmpty}` : ''}`}>
                {localSummary || AGENT_CONFIG[currentAgent].summaryPlaceholder}
              </p>
            </div>

            <div className={styles.cardDivider} />

            {/* Field 2 — always open */}
            <div className={styles.sectionBlock}>
              <span className={styles.sectionLabel}>{AGENT_CONFIG[currentAgent].field2Label}</span>
              <p className={`${styles.sectionText}${!localProblem ? ` ${styles.sectionTextEmpty}` : ''}`}>
                {localProblem || AGENT_CONFIG[currentAgent].field2Placeholder}
              </p>
            </div>

            <div className={styles.cardDivider} />

            {/* Field 3 — always open */}
            <div className={styles.sectionBlock}>
              <span className={styles.sectionLabel}>{AGENT_CONFIG[currentAgent].field3Label}</span>
              <p className={`${styles.sectionText}${!localAssumptions ? ` ${styles.sectionTextEmpty}` : ''}`}>
                {localAssumptions || AGENT_CONFIG[currentAgent].field3Placeholder}
              </p>
            </div>
          </div>

          {/* Dossi Board preview (collapsed) */}
          <div className={styles.dossiBoard}>
            <div className={styles.dossiBoardLeft}>
              <span className={styles.dossiBoardTitle}>Dossi Board</span>
              <button
                className={styles.dossiBoardArrowBtn}
                onClick={openDossiBoard}
                aria-label="Expand Dossi Board"
              >
                <svg className={styles.dossiBoardArrow} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="10" y1="110" x2="110" y2="10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  <polyline points="2,10 110,10 110,118" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
            </div>
            <div className={styles.dossiBoardRight}>
              <DossiBoardPreview
                projectId={id!}
                initialCoverLogo={
                  project?.cover_logo && coverLogoHasLetters(project.cover_logo) ? project.cover_logo : null
                }
                onColorChange={handleDossiBoardColor}
                onCoverLogoSaved={handleCoverLogoSaved}
              />
            </div>
          </div>
          </div>{/* end panelNormal */}

          {/* Dossi Board overlay — stays mounted during closing so it can animate out */}
          {dossiBoardMounted && (
            <div className={`${styles.dossiBoardExpanded} ${dossiBoardVisible ? styles.dossiBoardExpandedVisible : ''}`}>
              <DossiBoard
                ref={dossiBoardRef}
                projectId={id!}
                onCollapse={closeDossiBoard}
                activeAgent={currentAgent}
                onAgentChange={(agent) => setActiveTab(TAB_KEYS.indexOf(agent))}
              />
            </div>
          )}

          {/* Resize handle — only visible when board is open */}
          {dossiBoardState === 'open' && (
            <div
              className={`${styles.resizeHandle} ${isResizing ? styles.resizeHandleActive : ''}`}
              onMouseDown={handleResizeMouseDown}
              aria-label="Resize Dossi Board"
            />
          )}
        </aside>

        {/* ── Right panel: AI Chat ── */}
        <main className={styles.chatPanel}>
          <div className={styles.chatScroll}>
            <div className={styles.chatMessages}>
            {messages.length === 0 ? (
              <div className={styles.chatIdleStack}>
                <div className={styles.chatIdleArt}>
                  {currentAgent === 'strategy' && <StrategistIdle />}
                  {currentAgent === 'research' && <ResearcherIdle />}
                  {currentAgent === 'concept' && <DirectorIdle />}
                  {currentAgent === 'present' && <PresenterIdle />}
                </div>
                {renderComposer('idle')}
              </div>
            ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.chatMessageRow} ${msg.role === 'user' ? styles.chatMessageRowUser : styles.chatMessageRowAssistant}`}
              >
                {/* Avatar — only beside the latest assistant turn (hidden while a new reply is loading) */}
                {msg.role === 'assistant' && (
                  <div
                    className={`${styles.agentAvatar} ${i === lastAssistantIndex && !chatLoading ? '' : styles.agentAvatarHidden}`}
                  >
                    <div className={styles.agentAvatarLoadingFace}>
                      <AgentCharacterIdle agent={currentAgent} mode="compact" />
                    </div>
                  </div>
                )}
                <div className={`${styles.chatMessageGroup} ${msg.role === 'user' ? styles.chatMessageGroupUser : styles.chatMessageGroupAssistant}`}>
                  {msg.role === 'user' && msg.image_src && (
                    <img src={msg.image_src} alt="attached" className={styles.chatBubbleImage} />
                  )}
                  {(msg.role === 'assistant' || msg.content) &&
                    (msg.role === 'assistant' ? (
                      <div className={styles.assistantMessage}>
                        <div className={styles.chatMarkdown}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.bodyContent ?? msg.content}</ReactMarkdown>
                        </div>
                        {msg.citations && msg.citations.length > 0 && (
                          <div className={styles.chatCitations}>
                            <ul className={styles.chatCitationsList}>
                              {msg.citations.map((c, j) => (
                                <li key={j} className={styles.chatCitationItem}>
                                  <a href={c.url} target="_blank" rel="noopener noreferrer" className={styles.chatCitationLink}>
                                    {c.title || c.url}
                                  </a>
                                  <AddToBoardButton
                                    url={c.url}
                                    title={c.title}
                                    projectId={id!}
                                    isSaved={savedBoardUrls.has(c.url)}
                                    onSaved={(url) => {
                                      setSavedBoardUrls((prev) => new Set([...prev, url]))
                                      dossiBoardRef.current?.switchToWebsites()
                                    }}
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`${styles.chatBubble} ${styles.chatBubbleUser}`}>{msg.content}</div>
                    ))}
                </div>
              </div>
            ))
            )}
            {messages.length > 0 && chatLoading && (
              <div
                className={`${styles.chatMessageRow} ${styles.chatMessageRowAssistant} ${styles.chatMessageRowTyping}`}
              >
                <div className={styles.agentAvatar}>
                  <div className={styles.agentAvatarLoadingFace}>
                    <AgentCharacterIdle agent={currentAgent} mode="compact" />
                  </div>
                </div>
                <div className={styles.chatLoading}>
                  <div className={styles.chatLoadingDots}>
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
            </div>
          </div>

          {messages.length > 0 && renderComposer('thread')}
        </main>
      </div>
    </div>
  )
}

// ── Add-to-board button ───────────────────────────────────────────────────────

interface AddToBoardButtonProps {
  url: string
  title?: string
  projectId: string
  isSaved: boolean
  onSaved: (url: string) => void
}

function AddToBoardButton({ url, title, projectId, isSaved, onSaved }: AddToBoardButtonProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isSaved || saving) return
    setSaving(true)
    setError(false)
    try {
      const res = await fetch(`/api/projects/${projectId}/dossi-board/from-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title: title || url }),
      })
      if (res.ok) {
        onSaved(url)
      } else {
        setError(true)
        setTimeout(() => setError(false), 2500)
      }
    } catch {
      setError(true)
      setTimeout(() => setError(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const label = isSaved ? 'Already in Dossi Board' : error ? 'Error — try again' : 'Save to Dossi Board'

  return (
    <button
      className={`${styles.addToBoardBtn} ${isSaved ? styles.addToBoardBtnSaved : error ? styles.addToBoardBtnError : ''}`}
      onClick={handleClick}
      title={label}
      aria-label={label}
      disabled={isSaved || saving}
    >
      {saving ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={styles.addToBoardSpinner}>
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14 8" />
        </svg>
      ) : isSaved ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : error ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
