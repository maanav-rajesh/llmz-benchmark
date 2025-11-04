# LLMz Benchmark

Benchmark [LLMz](https://github.com/botpress/llmz) (Botpress agent framework) using [MCPMark](https://github.com/eval-sys/mcpmark).

## Architecture

```
MCPMark (Python)
  ↓ POST /chat/completions
middleman:3000 (acts as OpenAI API)
  ↓ spawns via stdin
llmz (TypeScript)
  ↓ converts OpenAI → LLMz tools
Botpress API
  ↓ executes agent code
Results → MCPMark
```

## Prerequisites

- **Node.js** 18+ with pnpm
- **Python** 3.11+
- **Botpress account** with API credentials

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd llmz-benchmark
pnpm install
```

This automatically:
- Initializes the `mcpmark` git submodule
- Installs Node packages (middleman, llmz)
- Creates Python virtualenv and installs mcpmark dependencies

### 2. Configure environment variables

**llmz/.env** (Botpress credentials):
```bash
OPENAI_API_KEY=your_openai_key
BOTPRESS_TOKEN=your_botpress_token
BOTPRESS_WORKSPACE_ID=your_workspace_id
BOTPRESS_BOT_ID=your_bot_id
```

**mcpmark/.mcp_env** (points to middleman):
```bash
OPENAI_BASE_URL=http://localhost:3000
OPENAI_API_KEY=dummy
```

## Running

### Development mode

```bash
pnpm dev
```

Runs all 3 services with colored output:
- **cyan**: middleman (port 3000)
- **magenta**: llmz (stdin processor)
- **yellow**: benchmark (filesystem task)

### Watch mode (auto-restart)

```bash
pnpm dev:watch
```

Auto-restarts when `.ts` files change in `llmz/` or `middleman/`.

## Project Structure

```
llmz-benchmark/
├─ llmz/              # LLMz CLI (reads OpenAI requests from stdin)
│  ├─ src/
│  └─ .env.example
├─ middleman/         # Proxy server (OpenAI API → llmz)
│  └─ src/
├─ mcpmark/           # Python benchmark suite (git submodule)
│  ├─ .venv/          # Auto-created Python virtualenv
│  └─ .mcp_env
└─ package.json       # Root workspace config
```

## How It Works

1. **MCPMark** sends OpenAI-formatted requests to `http://localhost:3000`
2. **middleman** receives request, spawns `llmz` process via stdin
3. **llmz** converts OpenAI tools → LLMz format, executes via Botpress
4. Response flows back: llmz → middleman → MCPMark
5. **MCPMark** verifies task completion

## Results

Results saved to `mcpmark/results/<timestamp>/gpt-5__filesystem/run-1/`
