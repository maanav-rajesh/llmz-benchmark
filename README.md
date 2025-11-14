# LLMz Benchmark

Evaluate [LLMz](https://github.com/botpress/llmz) agents using [MCPMark](https://github.com/eval-sys/mcpmark) benchmarks through an OpenAI-compatible proxy server.

## How It Works

```
MCPMark → HTTP → llmz-server (OpenAI API) → LLMz npm package → Botpress → Results
```

The `llmz-server` acts as an OpenAI-compatible endpoint that translates requests to LLMz format and executes them via the Botpress agent framework using the `llmz` npm package.

## Quick Start

```bash
# Install dependencies (auto-configures mcpmark submodule + venv)
pnpm install

# Configure Botpress credentials in llmz-server/.env
cp llmz-server/.env.example llmz-server/.env

# Run benchmark
pnpm dev
```

## Prerequisites

- Node.js 18+ with pnpm
- Python 3.11+
- Botpress account with API credentials

## Configuration

**llmz-server/.env**:
```bash
OPENAI_API_KEY=your_openai_key
BOTPRESS_TOKEN=your_botpress_token
BOTPRESS_WORKSPACE_ID=your_workspace_id
BOTPRESS_BOT_ID=your_bot_id
```

**mcpmark/.mcp_env** (auto-configured):
```bash
OPENAI_BASE_URL=http://localhost:3001
OPENAI_API_KEY=dummy
```

## Usage

### Basic Commands

```bash
# Run single benchmark (music_report task)
pnpm dev

# Run all benchmarks
pnpm dev:benchmark

# Auto-restart on code changes
pnpm dev:watch

# View results in browser UI
pnpm dev:viewer
```

### Advanced Options

**Custom port** (for parallel instances):
```bash
PORT=3002 pnpm dev
```

**Custom model**:
```bash
MODEL=gpt-4-turbo pnpm dev:benchmark
```

**Parallel execution**:
```bash
# Terminal 1
PORT=3001 MODEL=gpt-4 pnpm dev:benchmark

# Terminal 2
PORT=3002 MODEL=claude-3-opus pnpm dev:benchmark
```

### Results Viewer

The viewer (`http://localhost:3011`) displays:
- Iteration-by-iteration traces
- Generated TypeScript code (syntax highlighted)
- Tool call inputs/outputs with schemas
- Error traces

Results are saved to `llmz-server/results/run_*.json`.

## Project Structure

```
llmz-benchmark/
├─ llmz-server/       # Express server (OpenAI-compatible API)
│  ├─ src/
│  │  ├─ server.ts           # HTTP server + request handling
│  │  ├─ run-llmz.ts         # LLMz execution via npm package
│  │  └─ convert-tool.ts     # OpenAI → LLMz tool conversion
│  └─ results/        # Benchmark results (*.json)
├─ viewer/            # React UI for visualizing results
├─ mcpmark/           # MCPMark benchmark suite (submodule)
└─ package.json       # Workspace config
```

## Example

Running a simple filesystem task:

```bash
$ pnpm dev

# MCPMark sends task: "Create a music report"
# → llmz-server receives OpenAI chat request
# → Converts tools to LLMz format
# → Calls llmz.execute() with Botpress client
# → Agent generates code and calls tools iteratively
# → Returns results to MCPMark
# → Task verified and scored

✓ Task completed successfully
```

View detailed traces at `http://localhost:3011` after running the viewer.

## License

See individual component licenses:
- LLMz: [License](https://github.com/botpress/llmz)
- MCPMark: [License](https://github.com/eval-sys/mcpmark)
