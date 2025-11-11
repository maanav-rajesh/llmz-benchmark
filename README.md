# LLMz Benchmark

Benchmark [LLMz](https://github.com/botpress/llmz) (Botpress agent framework) using [MCPMark](https://github.com/eval-sys/mcpmark).

## Architecture

```
MCPMark (Python)
  ↓ POST /chat/completions
middleman:3001 (acts as OpenAI API)
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
OPENAI_BASE_URL=http://localhost:3001
OPENAI_API_KEY=dummy
```

> **Note:** The PORT can be overridden via environment variable when running dev scripts (see below).

## Running

### Development mode

```bash
pnpm dev
```

Runs all 3 services with colored output:
- **cyan**: middleman (port 3001 by default)
- **magenta**: llmz (stdin processor)
- **yellow**: benchmark (filesystem task)

#### Running on a custom port

To run on a different port (e.g., for multiple parallel instances):

```bash
PORT=3002 pnpm dev
```

This will:
- Start middleman on port 3002
- Automatically configure mcpmark to use `http://localhost:3002`

#### Custom experiment name

To set a custom experiment name for the pipeline:

```bash
EXP_NAME=my-experiment pnpm dev
```

Or combine with custom port:

```bash
PORT=3002 EXP_NAME=my-experiment pnpm dev
```

#### Running multiple instances simultaneously

```bash
# Terminal 1
PORT=3001 EXP_NAME=experiment-1 pnpm dev

# Terminal 2
PORT=3002 EXP_NAME=experiment-2 pnpm dev

# Terminal 3
PORT=3003 EXP_NAME=experiment-3 pnpm dev
```

Each instance runs independently on its own port with its own experiment name.

### Watch mode (auto-restart)

```bash
pnpm dev:watch
```

Auto-restarts when `.ts` files change in `llmz/` or `middleman/`.

### Viewer (React UI)

View benchmark results in a web UI:

```bash
pnpm dev:viewer
```

Opens at `http://localhost:3011`. Shows:
- Run selector (pick from saved results)
- Iteration-by-iteration breakdown
- Generated TypeScript code (syntax highlighted)
- Tool calls with input/output + schemas
- Error traces for failed iterations

By default, the viewer connects to middleman on port 3001. To connect to a different middleman port:

```bash
MIDDLEMAN_URL=http://localhost:3002 pnpm dev:viewer
```

Results are saved to `llmz/results/run_*.json` after each benchmark run.

## Project Structure

```
llmz-benchmark/
├─ llmz/              # LLMz CLI (reads OpenAI requests from stdin)
│  ├─ src/
│  ├─ results/        # Saved benchmark results (*.json)
│  └─ .env.example
├─ middleman/         # Proxy server (OpenAI API → llmz)
│  └─ src/
├─ viewer/            # React UI for viewing results
│  └─ src/
├─ mcpmark/           # Python benchmark suite (git submodule)
│  ├─ .venv/          # Auto-created Python virtualenv
│  └─ .mcp_env
└─ package.json       # Root workspace config
```

## How It Works

1. **MCPMark** sends OpenAI-formatted requests to `http://localhost:3001` (or custom port)
2. **middleman** receives request, spawns `llmz` process via stdin
3. **llmz** converts OpenAI tools → LLMz format, executes via Botpress
4. Response flows back: llmz → middleman → MCPMark
5. **MCPMark** verifies task completion

## Results

Benchmark results are saved to two locations:
- **llmz/results/run_*.json** - Full iteration traces with code, tool calls, and schemas (used by viewer)
- **mcpmark/results/\<timestamp\>/gpt-5__filesystem/run-1/** - MCPMark evaluation results
