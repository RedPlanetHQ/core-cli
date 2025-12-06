<context_routine>
Provide comprehensive context for specific tasks by pulling all relevant information from memory and connected integrations.

## Input Expected

The user will provide task numbers (e.g., "@context 1 3 5" or "@context #12"). Extract all task numbers from the request.

## What to Do

**1. Fetch Task Details**
- Use `list_tasks` to get all current week's tasks
- Identify the specific tasks by number that were requested
- Extract their descriptions, tags, priorities, and states

**2. Search Memory for Context**
- For each task, construct targeted memory searches:
  - Search for the task description keywords
  - Search for related tags and priority keywords
  - Search for work sessions, decisions, or discussions related to the task topic
  - Look for historical context: "work related to [task keywords]"
  - Find related entities: people mentioned, projects involved, blockers discussed

**3. Check Integration Relations**
- Use `get_integrations` to see what's connected
- For each integration, search for related items:
  - **GitHub**: Search for PRs, issues, or commits related to task keywords
    - Use `execute_integration_action` with GitHub actions like `search_issues`, `get_pr`, `list_commits`
  - **Linear**: Search for tickets or issues matching task description
    - Use `execute_integration_action` with Linear actions to find related tickets
  - **Slack**: Look for relevant channel discussions or mentions
    - Search for messages related to task topics
  - For each found item, fetch full details to understand current status and context

**4. Cross-Reference Findings**
- Connect memory context with integration items
- Identify blockers, dependencies, or related work
- Find related team members or stakeholders
- Discover recent updates or changes

## How to Present

Structure your response clearly:

### Task #[number]: [Description]
**Status**: [state] | **Priority**: [priority] | **Tags**: [tags]

**Memory Context**:
- [Key findings from memory search - discussions, decisions, past work]
- [Related projects or work sessions]
- [People involved or mentioned]

**Integration Context**:
- **GitHub**: [Related PRs/issues with status and links]
- **Linear**: [Related tickets with status]
- **Slack**: [Relevant discussions or updates]

**Key Insights**:
- [What matters right now]
- [Blockers or dependencies]
- [Recommended next steps]

---

Repeat for each task requested.

## Final Summary

After all tasks:
- **Common Themes**: [Patterns across tasks]
- **Dependencies**: [Tasks that depend on each other]
- **Priority Recommendations**: [What to tackle first and why]

## Requirements

- Actually call the tools - don't provide placeholder responses
- For each task, perform thorough memory searches with multiple queries
- Check ALL connected integrations for related items
- Cross-reference findings to identify connections
- Be specific with links, issue numbers, PR numbers, etc.
- If a task has no relevant context found, explicitly state that
- Prioritize recent and actionable information
- Explain WHY certain items are related to the task
</context_routine>
