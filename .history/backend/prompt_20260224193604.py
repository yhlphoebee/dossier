import logging
from models import Project, ChatMessage

logger = logging.getLogger("dossier.prompt")

base_prompt = """
<ROLE>
You are a highly experienced Design Director with 20+ years of experience in branding, packaging, digital systems, exhibition design, and strategic storytelling. You have led global creative teams and mentored emerging designers.

You do not act as a decorator or idea generator alone. You act as an investigative partner. Your role is to guide designers through structured creative reasoning using evidence, references, cultural context, and strategic thinking. You approach every project like a case file.

You help the user:
- Clarify the problem before jumping to solutions
- Form hypotheses about direction
- Identify relevant precedents (design history, studios, movements, contemporary examples)
- Evaluate decisions using reasoning rather than taste
- Strengthen hierarchy, clarity, and intentional reduction
- Build stronger presentations grounded in logic and narrative

You operate using an investigative framework:
- Observation – What do we actually see? What is the context?
- Hypothesis – What might this direction communicate?
- Evidence – What references, research, or precedents support this?
- Testing – What works? What feels weak? Why?
- Narrative – How can this be presented clearly and convincingly?
</ROLE>

<INSTRUCTIONS>
You do not flatter the user. You give thoughtful, constructive, and sometimes critical feedback. You explain why something works or does not.

You:
- Ask clarifying questions when necessary
- Push for specificity
- Challenge vague reasoning
- Encourage strategic clarity
- Help translate design thinking into presentation language

You prioritize:
- Structure over decoration
- Clarity over trend
- Intentional decisions over aesthetics alone
- Evidence-based storytelling

When giving feedback:
- Separate surface comments from structural issues
- Suggest concrete next steps
- Offer reference directions (studios, movements, methodologies)
- Help rewrite weak presentation scripts into strong strategic narratives

You are calm, precise, analytical, and insightful.

Your goal is not to design for the user. Your goal is to strengthen the user's thinking and articulation.
</INSTRUCTIONS>
"""


def build_system_prompt(project: Project) -> str:
    """
    System prompt = generic role description + project context (title & description).
    Injected once as the system message so the model treats it as persistent memory.
    """
    base = base_prompt.strip()

    context_lines: list[str] = []
    title = (project.title or "").strip()
    description = (project.description or "").strip()

    if title and title.lower() != "untitled":
        context_lines.append(f"Project title: {title}")
    if description:
        context_lines.append(f"Project description: {description}")

    if context_lines:
        context_block = "\n\nProject context:\n" + "\n".join(context_lines)
        return base + context_block

    return base


# ── Per-agent summarization prompts ────────────────────────────────────────────

STRATEGY_SUMMARY_PROMPT = """
You are summarizing the STRATEGY agent's conversation.

Focus on:
- Business / brand goals and constraints
- Who this is for and why it matters
- What success would look like

Write a concise, practical summary that a strategic design director would use to steer the project.
""".strip()


RESEARCH_SUMMARY_PROMPT = """
You are summarizing the RESEARCH agent's conversation.

Focus on:
- Observations, user insights, and audience behaviors
- Cultural and contextual references
- Precedent work, studios, movements, and key references

Write a clear summary of what we learned and what evidence we have.
""".strip()


CONCEPT_SUMMARY_PROMPT = """
You are summarizing the CONCEPT agent's conversation.

Focus on:
- Core conceptual directions and hypotheses
- How form, typography, imagery, and system logic express the idea
- Variants or branches of the concept worth remembering

Write a summary that captures the main directions, not every detail.
""".strip()


PRESENT_SUMMARY_PROMPT = """
You are summarizing the PRESENT agent's conversation.

Focus on:
- How to narrate the work to a client or audience
- Structure of the story (opening, middle, closing)
- Key phrases, framing, and rationales that make the work defensible

Write a presentation-facing summary that is ready to adapt into slides or a script.
""".strip()


def _select_summary_prompt(agent: str) -> str:
    agent = (agent or "").lower()
    if agent == "strategy":
        return STRATEGY_SUMMARY_PROMPT
    if agent == "research":
        return RESEARCH_SUMMARY_PROMPT
    if agent == "concept":
        return CONCEPT_SUMMARY_PROMPT
    if agent == "present":
        return PRESENT_SUMMARY_PROMPT
    return STRATEGY_SUMMARY_PROMPT


def build_summary_prompt(
    agent: str,
    project: Project,
    agent_history: list[ChatMessage],
    all_detail_summaries: dict[str, str],
) -> str:
    """Build a single user prompt string for the summarization call.

    The model must return **only** JSON with the following exact shape:

    {
      "summary": string,
      "problem_statment": string,
      "assumptions": string,
      "detail_summary": string
    }
    """

    header = _select_summary_prompt(agent)

    title = (project.title or "").strip()
    description = (project.description or "").strip()

    project_block_lines: list[str] = []
    if title and title.lower() != "untitled":
        project_block_lines.append(f"Project title: {title}")
    if description:
        project_block_lines.append(f"Project description: {description}")
    project_block = "\n".join(project_block_lines) if project_block_lines else "(no additional project context)"

    # Other agents' detail summaries for cross-agent awareness
    other_blocks: list[str] = []
    for key, detail in all_detail_summaries.items():
        if not detail:
            continue
        other_blocks.append(f"[{key.upper()} DETAIL]\n{detail}\n")
    other_summary_block = "\n".join(other_blocks) if other_blocks else "(no detail summaries from other agents yet)"

    # Serialize the current agent's history as a simple transcript
    history_lines: list[str] = []
    for msg in agent_history:
        role = msg.role.upper()
        history_lines.append(f"[{role}] {msg.content}")
    history_block = "\n".join(history_lines) if history_lines else "(no prior conversation for this agent)"

    instructions = """
You are going to summarize the conversation for this one agent.

1. Read the project context.
2. Read the current agent's conversation transcript.
3. Consider any detail summaries from the other agents as additional context.
4. Produce a **compact but information-dense** JSON object capturing the essentials.

CRITICAL:
- Respond with **only valid JSON**.
- Do not wrap in markdown.
- Do not add comments or extra keys.

JSON shape (keys must match exactly):
{
  "summary": string,
  "problem_statment": string,
  "assumptions": string,
  "detail_summary": string
}

Keep `summary`, `problem_statment`, and `assumptions` short enough for UI fields.
Use `detail_summary` for a fuller, cross-agent readable description.
""".strip()

    full_prompt = (
        f"{header}\n\n"
        f"Project context:\n{project_block}\n\n"
        f"Other agents' detail summaries (may be empty):\n{other_summary_block}\n\n"
        f"Current agent conversation transcript (most recent last):\n{history_block}\n\n"
        f"{instructions}\n"
    )

    return full_prompt


def build_messages(
    new_message: str,
    project: Project,
    history: list[ChatMessage],
) -> list[dict]:
    """
    Build the full OpenAI messages array:
      - system: role + project context
      - user/assistant: real alternating turns from DB history
      - user: the new message
    Logs the full payload for debugging.
    """
    system_prompt = build_system_prompt(project)

    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": new_message})

    # ── Debug log ──────────────────────────────────────────────────────────────
    history_log = "\n".join(
        f"  [{m['role'].upper()}] {m['content'][:120]}{'…' if len(m['content']) > 120 else ''}"
        for m in messages
    )
    logger.debug(
        "\n"
        "╔══════════════════════════════════════════════════════╗\n"
        "║              MESSAGES SENT TO LLM                   ║\n"
        "╚══════════════════════════════════════════════════════╝\n"
        "%s\n"
        "══════════════════════════════════════════════════════",
        history_log,
    )

    return messages
