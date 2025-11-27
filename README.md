# Core CLI

An AI-powered command-line interface built with React and Ink, providing an interactive conversational experience with advanced AI capabilities directly in your terminal.

## Features

- **Interactive Chat Interface** - Conversational AI assistant in your terminal
- **Multiple AI Providers** - Support for various AI models and providers (OpenAI, Anthropic, and more)
- **Theme Customization** - Multiple color themes for personalized experience
- **MCP Integration** - Model Context Protocol support for enhanced capabilities
- **Tool Execution** - Execute bash commands and other tools through natural conversation
- **Configuration Wizard** - Easy setup with guided configuration on first run
- **Real-time Streaming** - Stream AI responses in real-time for faster interaction
- **Token Usage Tracking** - Monitor your token consumption across conversations

## Installation

Install globally via npm:

```bash
npm install -g @redplanethq/core-cli
```

Or use directly with npx:

```bash
npx @redplanethq/core-cli
```

## Quick Start

1. Start the CLI:
```bash
core-cli
```

2. On first run, follow the configuration wizard to set up your AI provider and preferences.

3. Start chatting with your AI assistant!

## Available Commands

- `/help` - Display help information
- `/clear` - Clear conversation history
- `/theme` - Change the color theme
- `/model` - Select a different AI model
- `/provider` - Change AI provider
- `/mcp` - Manage MCP (Model Context Protocol) servers
- `/usage` - View token usage statistics
- `/set-name` - Customize your assistant's name

## Configuration

### Initial Setup

On first run, the configuration wizard will guide you through:
- Setting up your AI provider
- Configuring API keys
- Choosing your preferred model
- Customizing the assistant name
- Selecting a theme

Configuration files are stored in your system's standard config directory.

### Environment Variables

Set your AI provider API keys as environment variables:

```bash
# For OpenAI
export OPENAI_API_KEY=your_openai_key_here

# For Anthropic
export ANTHROPIC_API_KEY=your_anthropic_key_here
```

## Development

### Prerequisites

- Node.js >= 20

### Setup

```bash
# Clone the repository
git clone https://github.com/RedPlanetHQ/core-cli.git
cd core-cli

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

### Testing

```bash
# Run all tests
npm run test:all

# Run unit tests
npm run test:ava

# Run tests with coverage
npm run test:ava:coverage

# Type checking
npm run test:types

# Linting
npm run test:lint

# Auto-fix linting issues
npm run test:lint:fix
```

## Attribution

This project is based on [**Nanocoder**](https://github.com/Nano-Collective/nanocoder) by **Nano Collective and contributors**.

We are deeply grateful to the Nano Collective team for creating the foundation and inspiration for this CLI tool. Their work has been instrumental in making this project possible.

## License

This project is licensed under the **GNU Affero General Public License v3.0 with Commons Clause**.

See the [LICENSE](LICENSE) file for full details.

**Note:** The Commons Clause means you can use, modify, and distribute this software freely, but you cannot sell the software or services whose value derives primarily from the functionality of this software.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Issues:** Report bugs or request features at [GitHub Issues](https://github.com/RedPlanetHQ/core-cli/issues)
- **Repository:** [https://github.com/RedPlanetHQ/core-cli](https://github.com/RedPlanetHQ/core-cli)

## Acknowledgments

Special thanks to:
- [Nano Collective](https://github.com/Nano-Collective) for the original Nanocoder project
- All contributors to the Nanocoder project
- The open-source community

---

Built with d by RedPlanetHQ
