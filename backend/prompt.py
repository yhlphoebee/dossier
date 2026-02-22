import logging
from models import Project, ChatMessage

logger = logging.getLogger("dossier.prompt")


def build_system_prompt(project: Project) -> str:
    """
    System prompt = generic role description + project context (title & description).
    Injected once as the system message so the model treats it as persistent memory.
    """
    base = (
        "You are Dossier AI, a creative design assistant for graphic designers and design students.\n"
        "Help users develop, research, and refine their design projects.\n"
        "Be concise, thoughtful, and encouraging. Ask clarifying questions when needed.\n"
        "Focus on design thinking, visual communication, typography, branding, and creative process."
    )

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
