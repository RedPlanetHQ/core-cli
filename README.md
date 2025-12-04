# Core CLI - AI-Powered Task Management That Never Forgets

An intelligent task management system that remembers your entire world - your meetings, your tasks, your team discussions, your commitments - and seamlessly integrates with all your tools.

Unlike traditional task managers or coding-focused CLIs like claude-code, Core CLI is built for task management with a persistent knowledge graph that connects your calendar, GitHub issues, Linear tickets, Slack messages, and conversations into one intelligent context.

**The Problem**: Tasks scattered across GitHub, Linear, Slack, and your notes. No single view. No context. No memory.

**Core CLI**: One unified task hub. All integrations. Forever remembered.

[![npm version](https://badge.fury.io/js/%40redplanethq%2Fcore-cli.svg)](https://www.npmjs.com/package/@redplanethq/core-cli)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

## What Makes Core Different

Core CLI is an AI-powered task management system with a beautiful GUI interface (similar to claude-code), built specifically for developers who want intelligent task organization without leaving the terminal.

## What Can You Do?

### Task Management

```bash
# View your current tasks
/tasks

# Quick task entry mode
--
# → Enter task mode for rapid task creation

# Natural language task updates
"Mark the Linear sync task as complete"
"Move the GitHub PR review to next week"
"Update the API design task to high priority"
```

### Integration-Powered Task Sync

```bash
# Smart routine to sync across all your tools
@sync
# → Checks GitHub, Linear, Slack for updates
# → Creates tasks for items needing attention
# → Updates existing tasks with changes
# → Helps you prioritize what matters

# Task queries with context
"What should I focus on this week?"
# → Analyzes your calendar, sprint commitments, GitHub PRs, Linear tickets

# Meeting prep with task context
"Prep me for standup"
# → Summarizes tasks completed, blockers, references team discussions
```

### Document-Aware Task Management

```bash
# Reference documents created in Core
"@linear-product-doc write the following features as tasks"
"@meeting-notes create tasks from action items"
"@sprint-planning-doc add these to my weekly tasks"

# Context-aware queries
"What did we decide about the API redesign last week?"
"Find all tasks related to the authentication feature"
"What commitments did I make in Monday's meeting?"
```

### Intelligent Task Organization

```bash
# Automatic weekly organization
# Tasks stored in weekly files: 2025-W48.md
# Incomplete tasks automatically roll over to next week

# Time-aware prioritization
"I have 3 hours before my 2pm meeting, what tasks should I tackle?"
# → Considers your calendar, task priorities, and past completion patterns
```

## How It Works

```
Your World                Knowledge Graph              Your AI Tools
───────────              ────────────────────              ─────────────
Gmail          ─────▶                            ─────▶    CLI
Calendar       ─────▶    Temporal Memory         ─────▶    IDE Extensions
GitHub         ─────▶    88% Recall Accuracy     ─────▶    Browser
Slack          ─────▶    Cross-Domain Links      ─────▶    Mobile
Linear         ─────▶    Entity Relationships    ─────▶    Any LLM
Google Docs    ─────▶    Event Timelines         ─────▶    API
Sheets         ─────▶    Smart Clustering        ─────▶    Everywhere
```

One memory layer. All your context. Every AI tool.

## Key Features

- **AI-Powered Task Management** - Update and manage tasks using natural language
- **Persistent Memory** - Temporal knowledge graph that remembers all context and conversations
- **Weekly Task Files** - Automatic markdown files (2025-W48 format) organized by week
- **Smart Task Rollover** - Incomplete tasks automatically move to next week
- **Quick Task Mode** - Use `--` to instantly enter rapid task creation mode
- **Integration Hub** - Native GitHub, Linear, and Slack integrations for unified task management
- **Smart Sync Routines** - Built-in routines check integrations, create tasks, and help prioritize
- **Document References** - Use `@` command to reference and work with Core documents
- **Conversation Linking** - All tasks automatically linked to conversations for full context
- **CLI-First Design** - Fast, efficient task management directly from your terminal
- **Data Ownership** - You own your task history and knowledge graph

## Installation

### Quick Start

```bash
# Install globally
pnpm install -g @redplanethq/core-cli

# Start the CLI
core-cli
```

Or use directly with pnpm:

```bash
pnpm dlx @redplanethq/core-cli
```

### First Run Setup

On first run, the configuration wizard will guide you through:

1. **Choose your AI provider** - OpenAI, Anthropic, or other supported models
2. **Configure API keys** - Set up your preferred LLM
3. **Connect integrations** - Link Gmail, Calendar, GitHub, Linear, etc.
4. **Build your knowledge graph** - Core ingests your past conversations and data
5. **Customize preferences** - Set your assistant name, theme, and defaults

Configuration files are stored in your system's standard config directory.

### Environment Variables

Set your AI provider API keys as environment variables:

```bash
# For OpenAI
export OPENAI_API_KEY=your_openai_key_here

# For Anthropic
export ANTHROPIC_API_KEY=your_anthropic_key_here

# For Core Memory (if using hosted Core)
export CORE_API_KEY=your_core_api_key_here
```

## Requirements

- Node.js >= 20
- Active internet connection for AI provider access
- (Optional) Core account for hosted knowledge graph

## Features

### Interactive Chat Interface

Conversational AI assistant directly in your terminal with real-time streaming responses.

### Multiple AI Providers

Support for various AI models:

- OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- More providers coming soon

### MCP (Model Context Protocol) Integration

Enhanced capabilities through MCP servers:

- Integrate with external systems and APIs
- Extend functionality with custom MCP servers
- Connect to GitHub, Linear, Slack, and more

### Token Usage Tracking

Monitor your token consumption across conversations and sessions.

## Commands

| Command     | Description                                           |
| ----------- | ----------------------------------------------------- |
| `/help`     | Display help information and available commands       |
| `/tasks`    | View your current tasks                               |
| `--`        | Enter quick task mode for rapid task creation         |
| `sync`      | Run smart routine to sync integrations and prioritize |
| `/clear`    | Clear conversation history (memory persists)          |
| `/model`    | Select a different AI model                           |
| `/provider` | Change AI provider                                    |
| `/mcp`      | Manage MCP (Model Context Protocol) servers           |
| `/usage`    | View token usage statistics                           |
| `/set-name` | Customize your assistant's name                       |

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

## Architecture

Core CLI is built on three key components:

1. **CLI Interface** - React + Ink for beautiful terminal UI
2. **Core Memory API** - Temporal knowledge graph with 88% recall accuracy
3. **MCP Integration Layer** - Model Context Protocol for tool execution

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
│     MCP Servers (Integrations)          │
│  Gmail • Calendar • GitHub • Linear     │
│  Docs • Sheets • Slack • File System    │
└─────────────────────────────────────────┘
```

## Use Cases

### For Individual Developers

- **Never Lose Context** - All your tasks, conversations, and decisions remembered across sessions
- **Unified Task Hub** - Manage GitHub issues, Linear tickets, and personal tasks in one place
- **Smart Prioritization** - AI helps you decide what to work on based on deadlines and context
- **Automatic Organization** - Weekly task files with smart rollover keep you organized without effort
- **Integration Magic** - Sync routine pulls updates from all your tools and creates actionable tasks
- **Document-Linked Tasks** - Reference meeting notes, design docs, and specifications directly in tasks
- **CLI Speed** - Beautiful GUI interface without leaving the terminal
- **Your Data** - Complete ownership and control of your task history and knowledge graph

## Roadmap

- [ ] Advanced task analytics and insights
- [ ] More integration connectors (Jira, Asana, Trello)
- [ ] Custom routine builder
- [ ] Task templates and recurring tasks
- [ ] Self-hosted Core memory option
- [ ] Mobile companion app
- [ ] Advanced memory visualization
- [ ] Custom MCP server marketplace

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
- **Documentation**: [Full docs](https://docs.core.ai)
- **Twitter**: [@RedPlanetHQ](https://twitter.com/RedPlanetHQ)
- **Discord**: [Join our community](https://discord.gg/redplanethq)

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
