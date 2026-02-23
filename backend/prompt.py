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
