# Core CLI - Your AI task manager that never forgets.

[![npm version](https://badge.fury.io/js/%40redplanethq%2Fcore-cli.svg)](https://www.npmjs.com/package/@redplanethq/core-cli)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)


A terminal-first task manager powered by AI, with persistent memory across sessions. Built on [CORE](https://github.com/RedPlanetHQ/core) - so it actually remembers your projects, preferences, and past decisions.

![core-cli-intro](https://github.com/user-attachments/assets/34033c0d-5d30-4897-89c1-3a13e46845b1)



## The Problem

You're juggling tasks across GitHub, Linear, Slack, and your notes. Every AI tool you use starts fresh - no memory of what you discussed yesterday, no context about your priorities, no understanding of your workflow.
Core CLI changes that. One unified task hub. All your integrations. Memory that persists.


## What Can You Do?

### Unified Task Hub in Terminal

```bash
# Quick task entry mode
--
> Fix the auth bug in user service
> Review PR #234
> Write tests for payment flow
# Press enter to save all

# Create tasks naturally
"Add a task to review the API docs by Friday"
"Create a high priority task for the security audit"

# Talk to your tasks
"What should I focus on today?"
"Show me all tasks related to authentication"
"Mark task 5 as done and move task 8 to in progress"
"What's blocking me this week?"
```

![Sync-Core-cli](https://github.com/user-attachments/assets/221103aa-d6d5-4dc8-afc1-90ca4e1d7a8f)

### Sync with Your Task Assistant

```bash
@sync
```
Like a morning standup with your AI assistant. It:

1. Checks integrations - Checks what all apps are connected with CORE
2. Scans for new work - If something popped up from recent activity in Github, Linear, Slack, Calendar, Gmail (bug assigned, PR review requested, Slack mention, new email), it searches for relevant context
3. Reviews your task list - Analyzes your current tasks for any updates or priority changes
4. Tells you what to focus on - Summarizes what's happening and recommends what needs your attention now




### Delegate Tasks to Coding Agents

```bash
# Natural language delegation
"Implement task 42"
"Start working on the auth refactor using Cursor"
"Delegate the API tests to Aider"

# Or use the routine
@implement 42
@implement 15 cursor
```

Launches your preferred coding agent (Claude Code, Cursor, Aider) in an isolated environment:

- Creates a new git branch (task-42-abc123)
- Spins up a separate worktree (no conflicts with your main work)
- Runs in a tmux session (continues in background)
- Passes full task context to the agent

Work on multiple tasks in parallel. Switch between them freely.

## Quick Start

```bash
# Install globally
pnpm install -g @redplanethq/core-cli

# Start the CLI
core-cli
```

On first run, you'll:

1. Connect your AI provider (OpenAI, Anthropic)
2. Link your CORE account (for memory + integrations)
3. Optionally connect GitHub, Linear, Slack

That's it. Start talking to your tasks.


## How It Works

```
┌─────────────────────────────────────────┐
│           Core CLI (You)                │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│        AI Provider (LLM)                │
│    OpenAI / Anthropic / Custom          │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      Core Memory (Knowledge Graph)       │
│  • Temporal relationships                │
│  • Cross-domain links                    │
│  • Entity extraction                     │
│  • Smart clustering                      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     MCP Servers (Via CORE)              │
│  Gmail • Calendar • GitHub • Linear     │
│  Docs • Sheets • Slack • File System    │
└─────────────────────────────────────────┘
```

### Why CORE? 

CORE is your second brain - a temporal knowledge graph that remembers what you're working on, what decisions you made, when and why you made them, and how your thinking evolved.

Core CLI uses CORE for two things:

**Persistent Memory**

- Every task you create and every conversation you have is automatically stored in CORE
- When you chat in Core CLI, it searches your memory first for relevant context
- Store knowledge about your projects, codebase, and preferences - the task manager pulls it on-demand

Example: You're brainstorming "Add user authentication API". Core CLI auto-searches your memory for past auth discussions, your preferred patterns, related decisions - context that actually helps.

**Access to Integrations**

- CORE connects to apps like Gmail, Linear, GitHub via MCP
- Connect once to CORE → Core CLI can read and act in all of them
- Pull tasks from these apps into your CLI task list automatically
- Take actions: send emails, close issues, create tickets - offload the grunt work


## Commands

### Chat Commands

| Command     | Description                                           |
| ----------- | ----------------------------------------------------- |
| `/tasks`    | View your current tasks                               |
| `--`        | Enter quick task mode for rapid task creation         |
| `@sync`     | Run smart routine to sync integrations and prioritize |
| `/sessions` | View all active coding agent sessions                 |
| `/clear`    | Clear conversation history (memory persists)          |
| `/model`    | Select a different AI model                           |
| `/provider` | Change AI provider                                    |
| `/set-name` | Customize your assistant's name                       |

### CLI Commands

#### Task Management

```bash
core-cli tasks list          # List all tasks
core-cli tasks add "..."     # Add task
core-cli sessions list       # Show coding sessions
core-cli sessions attach 42  # Attach to task session
```



## Coding Agents & Task Delegation

Core CLI can delegate implementation work to AI coding agents like Claude Code, Cursor, Aider, and others. These agents run in isolated tmux sessions with their own git worktrees, allowing you to work on multiple tasks in parallel without conflicts.

```bash
# In core-cli chat
"Implement task 5"

# Output:
# ⚡ Launched Claude Code in session "task-5-xfgpq"
# Attach: core-cli sessions attach task-5-xfgpq

# Work on it
core-cli sessions attach task-5-xfgpq

# When done: Ctrl+B, D to detach
```

Supported agents:

- Claude Code (npm install -g @anthropic/claude-code)
- Cursor AI
- Aider (pip install aider-chat)
- Codex CLI

Requirements: tmux, git

### Setting Default Coding Agent

You can set your preferred coding agent in the CLI:

```bash
# Inside core-cli chat
/set-coding-agent

# Or ask naturally
"Set my default coding agent to Claude Code"
```

### Delegating Tasks with Specific Agents

You can specify which coding agent to use for any task, overriding your default:
```
# Specify agent when delegating
"Implement task 5 using Cursor"
"Use Aider to fix task 3"
"Launch Claude Code for task 7"
```

This is useful when:
- Different tasks suit different agents
- You want to test agents side-by-side
- A specific agent has features you need for this task


### Example Workflow

Here's a complete example of delegating tasks:

```bash
# 1. Start core-cli
core-cli

# 2. View your tasks
/tasks

# 3a. Delegate to your default agent
"Implement task 5"

# 3b. Delegate to a specific agent
"Implement task 5 using Cursor"
"Use Aider for task 5"

# Output:
# ⚡ launch_coding_session
# └ Task: #5
#   Description: Add user authentication API
#   Agent: claude-code
#
# SUCCESS: Launched Claude Code in background session "task-5-xfgpq"
#
# To attach to this session, run: core-cli sessions attach task-5-xfgpq

# 4. Check active sessions
/sessions

# Output shows:
# 💻 Active Coding Sessions
#
# 1. [claude-code] task-5-xfgpq
#    Task: #5 - Add user authentication API
#    Status: detached | Started: 2m ago
#    Worktree: /Users/you/worktrees/task-5-xfgpq
#    Branch: task-5-xfgpq
#    Attach: core-cli sessions attach task-5-xfgpq

# 5. Attach to the session
core-cli sessions attach task-5-xfgpq

# 6. Work with Claude Code in the tmux session
# When done, press Ctrl+B then D to detach

# 7. Later, delete the session
core-cli sessions delete task-5-xfgpq
```

### Advanced Configuration

#### Custom Agent Paths

If your coding agent is installed in a non-standard location, configure it in Core:

```json
// In your Core CLI config
{
  "codingAgents": {
    "claude-code": {
      "path": "/custom/path/to/claude"
    }
  }
}
```

#### Requirements

- **tmux** must be installed (`brew install tmux` on macOS)
- **git** must be installed and the directory must be a git repository
- The selected coding agent must be installed and available in PATH

### Troubleshooting

**"tmux is not installed"**
```bash
# macOS
brew install tmux

# Ubuntu/Debian
apt-get install tmux
```

**"Agent not found"**
- Ensure the coding agent is installed
- Check that it's in your PATH: `which claude` or `which cursor`
- Configure custom path if needed

**"Not a git repository"**
- Initialize git: `git init`
- Or run Core CLI from within a git repository

**"Multiple sessions found for task"**
- Use the full session name: `core-cli sessions attach task-42-abcde`
- Or delete old sessions first: `core-cli sessions delete task-42-xxxxx`

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/RedPlanetHQ/core-cli.git
cd core-cli

# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run in development mode
pnpm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Community & Support

- **Issues**: [Report bugs or request features](https://github.com/RedPlanetHQ/core-cli/issues)
- **Discussions**: [Join the conversation](https://github.com/RedPlanetHQ/core-cli/discussions)
- **Discord**: [Join our community](https://discord.gg/YGUZcvDjUa)

## License

This project is licensed under the GNU Affero General Public License v3.0 with Commons Clause.

See the [LICENSE](LICENSE) file for full details.

**Note**: The Commons Clause means you can use, modify, and distribute this software freely, but you cannot sell the software or services whose value derives primarily from the functionality of this software.

## Acknowledgments

This project is based on [Nanocoder](https://github.com/Nano-Collective/nanocoder) by Nano Collective and contributors.

We are deeply grateful to the Nano Collective team for creating the foundation and inspiration for this CLI tool. Their work has been instrumental in making this project possible.

Special thanks to:

- [Nano Collective](https://github.com/Nano-Collective) for the original Nanocoder project
- All contributors to the Nanocoder project
- The open-source community
- Early Core users and beta testers

---

Built with ❤️ by [RedPlanetHQ](https://getcore.me)

**Core CLI - The AI that never forgets.**
