# LLMz Benchmark - Developer Guide

This document provides technical details for understanding and extending the LLMz benchmark system.

## Architecture Overview

### Request Flow

```
┌─────────┐    HTTP POST      ┌──────────────┐  llmz.execute()  ┌──────────┐
│ MCPMark │ ───────────────▶  │ llmz-server  │ ───────────────▶ │ Botpress │
│ (Python)│  /chat/completions │ (Express.js) │   npm package    │   API    │
└─────────┘                    └──────────────┘                   └──────────┘
     │                               │                                  │
     │                               ▼                                  │
     │                        Tool Conversion                           │
     │                        OpenAI → LLMz                             │
     │                               │                                  │
     │                               ▼                                  │
     │                     execute({ client, tools })                   │
     │                               │                                  │
     └───────────────────────────────┴──────────────────────────────────┘
                            Results & Verification
```

### Components

#### 1. llmz-server (Express.js)

The core proxy server that bridges MCPMark and LLMz.

**Key files:**
- `server.ts:1-200` - HTTP server, session management, request routing
- `run-llmz.ts:1-143` - LLMz npm package integration and execution
- `convert-tool.ts:1-100` - OpenAI tool format → LLMz tool format conversion

**How it works:**
1. Receives OpenAI-formatted chat completion requests
2. Converts tool definitions from OpenAI schema to LLMz format
3. Calls `llmz.execute()` with Botpress client and converted tools
4. Returns execution results to MCPMark

**Session Management:**
- Uses AsyncQueue for bidirectional communication
- Maintains separate queues per session ID
- Handles streaming responses

#### 2. LLMz Package Integration

The server integrates with LLMz via the npm package:

```typescript
// Simplified flow from run-llmz.ts
import { execute, ObjectInstance } from "llmz";
import { Client } from "@botpress/client";

const client = new Client({
  token: process.env.BOTPRESS_TOKEN,
  workspaceId: process.env.BOTPRESS_WORKSPACE_ID,
  botId: process.env.BOTPRESS_BOT_ID,
});

const tools: LLMzTool[] = request.tools.map(convertOpenAIToolToLLMzTool);

const FS = new ObjectInstance({
  name: "FS",
  description: "File system operations",
  tools: tools,
});

const result = await execute({
  client,
  instructions: request.messages.map(m => m.content).join('\n'),
  objects: [FS],
  options: { loop: 100, timeout: 100000000 },
  model: "claude-3-5-sonnet-20241022",
});
```

#### 3. Tool Conversion

OpenAI tools use JSON Schema format. LLMz uses a custom Zod-like schema format.

**Example conversion:**

```javascript
// OpenAI format
{
  "type": "function",
  "function": {
    "name": "read_file",
    "parameters": {
      "type": "object",
      "properties": {
        "path": { "type": "string" }
      }
    }
  }
}

// LLMz format (Zod schema)
{
  "name": "read_file",
  "input": {
    "schema": {
      "type": "object",
      "properties": {
        "path": { "type": "string" }
      }
    }
  }
}
```

See `convert-tool.ts` for full implementation.

#### 4. MCPMark Integration

MCPMark is a git submodule that provides:
- Pre-defined benchmark tasks (filesystem, notion, github, etc.)
- Automated verification of task completion
- Metrics collection and reporting

**Configuration:**
- `.mcp_env` - Points MCPMark to llmz-server URL
- `pipeline` module - Orchestrates benchmark execution

#### 5. Results Viewer

React-based UI for visualizing benchmark runs.

**Features:**
- Load historical results from `llmz-server/results/`
- View iteration traces with code highlighting
- Inspect tool calls with input/output
- Debug failed iterations with error traces

## Development Workflow

### Adding a New Benchmark Task

1. Add task to MCPMark (in submodule):
   ```python
   # mcpmark/tasks/my_task.py
   def my_task():
       return {
           "name": "my_task",
           "description": "Do something",
           "verify": lambda result: check_result(result)
       }
   ```

2. Update pipeline config:
   ```bash
   cd mcpmark
   .venv/bin/python -m pipeline --tasks my_task
   ```

3. Run via root workspace:
   ```bash
   pnpm dev  # Will use new task
   ```

### Modifying Tool Conversion

To support new tool formats:

1. Edit `llmz-server/src/convert-tool.ts`
2. Add conversion logic for new schema types
3. Test with example OpenAI tool definition
4. Rebuild: `cd llmz-server && pnpm build`

### Debugging

**Enable verbose logging:**
```bash
DEBUG=llmz:* pnpm dev
```

**View iteration output:**
The server logs all LLMz execution details to console:
- Iteration code (cyan)
- Tool inputs/outputs (magenta)
- Final results (yellow)

## Testing

### Manual Testing

```bash
# Start server
pnpm dev:llmz-server

# Send test request (different terminal)
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "test"}],
    "tools": []
  }'
```

### Running Full Benchmark

```bash
# Single task (fast)
pnpm dev

# All tasks (slow)
pnpm dev:benchmark
```

## Configuration Reference

### Environment Variables

**llmz-server/.env:**
- `OPENAI_API_KEY` - Used by LLMz for actual LLM calls
- `BOTPRESS_TOKEN` - Botpress API authentication
- `BOTPRESS_WORKSPACE_ID` - Workspace identifier
- `BOTPRESS_BOT_ID` - Bot/agent identifier
- `PORT` - Server port (default: 3001)

**mcpmark/.mcp_env:**
- `OPENAI_BASE_URL` - Points to llmz-server
- `OPENAI_API_KEY` - Dummy key (required by MCPMark)

### Script Arguments

**pnpm dev:**
- `PORT=3002` - Custom port
- `MODEL=gpt-4` - Model name (passed to LLMz)

**pnpm dev:benchmark:**
- All above, plus runs all MCPMark tasks

## Common Issues

### Issue: "Cannot connect to llmz-server"

**Solution:** Ensure server is running and PORT matches in `.mcp_env`:
```bash
# Check server status
lsof -i :3001

# Verify .mcp_env
cat mcpmark/.mcp_env
```

### Issue: "Botpress authentication failed"

**Solution:** Verify credentials in `llmz-server/.env`:
```bash
# Test credentials
curl -H "Authorization: Bearer $BOTPRESS_TOKEN" \
  https://api.botpress.cloud/v1/workspaces/$BOTPRESS_WORKSPACE_ID
```

### Issue: "Tool conversion error"

**Solution:** Check tool schema format in server logs. May need to update `convert-tool.ts` for new schema features.

## Performance Optimization

### Parallel Execution

Run multiple benchmarks simultaneously:

```bash
# Terminal 1
PORT=3001 MODEL=gpt-4 pnpm dev:benchmark &

# Terminal 2
PORT=3002 MODEL=claude-3-opus pnpm dev:benchmark &

# Terminal 3
PORT=3003 MODEL=gpt-3.5-turbo pnpm dev:benchmark &

wait
```

### Result Analysis

Use the provided analysis script:

```bash
./analyze-logs.sh
```

This aggregates results across all runs and generates comparative metrics.

## Contributing

### Code Style

- TypeScript with strict mode enabled
- Use async/await for asynchronous operations
- Prefer functional patterns where applicable
- Add JSDoc comments for public APIs

### Pull Request Process

1. Create feature branch from `main`
2. Test changes with `pnpm dev`
3. Update relevant documentation
4. Submit PR with clear description

## Resources

- **LLMz Documentation:** https://github.com/botpress/llmz
- **MCPMark Documentation:** https://mcpmark.ai/docs
- **Botpress API:** https://botpress.com/docs
- **OpenAI API Reference:** https://platform.openai.com/docs/api-reference

## Project Status

This is an active development project for benchmarking LLMz agents. Expect frequent updates to:
- Tool conversion logic (as OpenAI/LLMz schemas evolve)
- Benchmark tasks (as MCPMark adds new scenarios)
- Viewer features (improved visualization and debugging)

Check git history for recent changes:
```bash
git log --oneline -10
```
