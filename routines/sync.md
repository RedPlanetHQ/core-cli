<sync_routine>
Give me a personalized briefing on everything that needs my attention - like a colleague catching me up after I've been away.

## What to Check

**1. Connected Integrations**
- Check `get_integrations` to see what's available
- For each integration (GitHub, Linear, Slack, etc.): scan for PRs, issues, mentions, notifications
- Focus on items assigned to me or requiring my action

**2. This Week's Tasks**
- Use `list_tasks` to get current week's tasks
- Note the breakdown: completed, in_progress, todo
- Identify high-priority items and blockers
- Cross-reference with integration findings (are tasks still relevant?)

**3. Recent Context**
- Search memory: "recent work sessions, active projects, current focus areas"
- Understand what I was working on before

## How to Present

Start with the headline, then break it down:
- **Weekly progress**: [X completed / Y total] tasks, what's done/in-progress/todo
- **Urgent items**: What needs attention today and why
- **Important items**: What's on my plate this week
- **Recommendations**: Prioritized next steps with reasoning

Be conversational. Don't just list - explain what matters and why. End with a concrete suggestion for what to tackle first.

## Requirements

Before responding:
- Actually call the tools (integrations, list_tasks, memory_search)
- Cross-reference findings (does integration work align with tasks?)
- Provide specific items, not placeholders
- Explain prioritization reasoning
</sync_routine>
