<implement_routine>
Launch a coding agent session to work on implementation tasks.

## Trigger

This routine is triggered by `@implement` prefix:
- `@implement 42` - Implement task #42
- `@implement task 16` - Implement task #16
- `@implement 5 with cursor` - Use specific agent

## When to Use

Use this routine when the user wants to:
- Implement a new feature
- Fix a bug
- Refactor code
- Work on any coding/implementation task

The user will explicitly call `@implement` to trigger this workflow.

## Input Expected

The user will provide:
- Task number (e.g., "@implement 42" or "@implement task 42")
- Optionally, specify which coding agent to use (e.g., "@implement 42 with cursor")

## What to Do

**1. Parse the Request**
- Extract task number from the input (e.g., "@implement 42" → task number is 42)
- Check for agent specification (e.g., "with cursor", "using aider")
- Handle variations: "@implement task 16", "@implement 5", etc.

**2. Get Task Details**
- Use `list_tasks` to get all current tasks
- Find the task with the matching task number
- Verify the task exists and get its description, tags, and current state
- If task not found, inform the user

**3. Gather Context (REQUIRED - Don't Skip!)**
- Use `memory_search` to find relevant context about the task:
  - Search for related work, decisions, or discussions
  - Look for relevant code patterns or architecture decisions
  - Find related bugs, features, or technical debt
- Use `get_integrations` to see what's connected
- Use `execute_integration_action` to gather:
  - Related GitHub PRs or issues
  - Related Linear tickets
  - Relevant Slack discussions or technical decisions

**4. Prepare Context Summary**
- Build a comprehensive context prompt including:
  - Task description and requirements
  - Related architecture decisions
  - Relevant code patterns or style guidelines
  - Known issues or constraints
  - Links to related PRs, issues, or documentation
  - Recent conversations or decisions about this task

**5. Launch Coding Session**
- Call `launch_coding_session` tool with:
  - `taskNumber`: The task number from step 1
  - `taskDescription`: The task's description from step 2
  - `agentName`: The agent specified by user, or omit to use default
  - `contextPrompt`: The comprehensive context summary from step 4

**6. Confirm Launch**
- After successful launch, show the user:
  - Which agent was launched
  - How to attach to the session (the exact command)
  - Brief summary of context provided to the agent
  - Any relevant next steps

## How to Present

Present the output from the `launch_coding_session` tool directly to the user, along with:
- Brief summary of context gathered
- The attach command to connect to the session
- Reminder about how to detach (Ctrl+B then D)

Example:
```
✓ Gathered context for Task #42: Add authentication to API

**Context Found**:
- Related architecture: JWT with RS256
- Related PRs: #123, #145
- Memory: Previous auth discussion from 2 weeks ago

⚡ Launched Claude Code in background
   Session: core-coding-task-42-a1b2

   To connect, run: core-cli attach task-42

   Context provided to agent:
   - Full task requirements
   - Related PRs and architecture decisions
   - Code style guidelines from memory

   Press Ctrl+B then D to detach when done.
```

## Requirements

- Always gather context before launching (don't skip memory and integration searches)
- Provide meaningful context to the coding agent via `contextPrompt`
- Handle cases where:
  - Task doesn't exist (offer to create it)
  - tmux is not installed (provide installation instructions)
  - Specified agent is not installed (list available agents)
- Use the default coding agent if none is specified
- Be explicit about what context was provided to the agent
- Always provide clear attach instructions

## Error Handling

If launch fails:
- Check if tmux is installed: "tmux is required. Install with: brew install tmux"
- Check if agent is installed: "Claude Code not found. Install from: https://..."
- If session creation fails: "Failed to create session. Check tmux is running correctly."
</implement_routine>
