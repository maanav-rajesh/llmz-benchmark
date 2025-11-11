import express, { Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletion,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { runLLMz } from "./run-llmz";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: "1gb" }));

// Session-based queues for bidirectional communication
class AsyncQueue<T> {
  private queue: T[] = [];
  private waitingConsumers: Array<(value: T) => void> = [];

  publish(value: T): void {
    if (this.waitingConsumers.length > 0) {
      const resolve = this.waitingConsumers.shift()!;
      resolve(value);
    } else {
      this.queue.push(value);
    }
  }

  consume(): Promise<T> {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift()!);
    }
    return new Promise<T>((resolve) => {
      this.waitingConsumers.push(resolve);
    });
  }
}

interface SessionQueues {
  responses: AsyncQueue<ChatCompletion>;
  toolResults: AsyncQueue<ChatCompletionCreateParamsNonStreaming>;
  spawnedAt: number;
}

// Session-based queue management
const sessionQueues = new Map<string, SessionQueues>();

export function getOrCreateSessionQueues(sessionId: string): SessionQueues {
  if (!sessionQueues.has(sessionId)) {
    console.log(`[MIDDLEMAN] Creating new session: ${sessionId}`);
    sessionQueues.set(sessionId, {
      responses: new AsyncQueue<ChatCompletion>(),
      toolResults: new AsyncQueue<ChatCompletionCreateParamsNonStreaming>(),
      spawnedAt: Date.now(),
    });
  }
  return sessionQueues.get(sessionId)!;
}

function cleanupSession(sessionId: string): void {
  if (sessionQueues.has(sessionId)) {
    console.log(`[MIDDLEMAN] Cleaning up session: ${sessionId}`);
    sessionQueues.delete(sessionId);
  }
}

// Cleanup stale sessions (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 60 * 60 * 1000; // 1 hour

  for (const [sessionId, queues] of sessionQueues.entries()) {
    if (now - queues.spawnedAt > staleThreshold) {
      console.log(`[MIDDLEMAN] Cleaning up stale session: ${sessionId}`);
      sessionQueues.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Helper to check if message contains tool calls
function hasToolCalls(message: ChatCompletionMessageParam): boolean {
  return (
    "tool_calls" in message || ("role" in message && message.role === "tool")
  );
}

// Helper to check if any messages contain tool calls or tool results
function containsToolMessages(messages: ChatCompletionMessageParam[]): boolean {
  return messages.some((msg) => hasToolCalls(msg));
}

// Spawn llmz process and pass request via stdin
async function spawnLLMz(
  request: ChatCompletionCreateParamsNonStreaming,
  sessionId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const llmzProcess = spawn("pnpm", ["dev"], {
      cwd: path.resolve(__dirname, "../../llmz"),
      env: {
        ...process.env,
        SESSION_ID: sessionId,
      },
    });

    // Redirect child process output to parent
    llmzProcess.stdout.pipe(process.stdout);
    llmzProcess.stderr.pipe(process.stderr);

    // Include session_id in the request
    const requestWithSession = {
      ...request,
      session_id: sessionId,
    };
    const requestString = JSON.stringify(requestWithSession);

    llmzProcess.stdin.write(requestString);
    llmzProcess.stdin.end();

    llmzProcess.on("close", (code) => {
      // Cleanup session when process completes
      setTimeout(() => cleanupSession(sessionId), 5000); // Wait 5s for final messages

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`llmz process exited with code ${code}`));
      }
    });

    llmzProcess.on("error", (error) => {
      cleanupSession(sessionId);
      reject(error);
    });
  });
}

const handleChatCompletion = async (
  req: Request<{}, {}, ChatCompletionCreateParamsNonStreaming>,
  res: Response<ChatCompletion>
) => {
  const requestBody = req.body;

  // CRITICAL: Extract session_id
  const sessionId = (requestBody as any).session_id;
  if (!sessionId) {
    console.error("[MIDDLEMAN] ERROR: Request missing session_id");
    console.error("Request body:", JSON.stringify(requestBody, null, 2));
    return res.status(400).json({
      error: "Missing session_id - parallelism requires session isolation",
    } as any);
  }

  // Get session-specific queues
  const queues = getOrCreateSessionQueues(sessionId);

  // Check if any messages contain tool calls or tool results
  const hasToolMessages = containsToolMessages(requestBody.messages);

  if (!hasToolMessages) {
    try {
      runLLMz(requestBody, sessionId);
    } catch (error) {
      console.error(`[${sessionId}] Error spawning llmz:`, error);
    }
  } else {
    queues.toolResults.publish(requestBody);
  }

  // Block and consume from THIS session's response queue
  const response = await queues.responses.consume();
  // Block and wait for tool results from THIS session's toolResultsQueue (client → llmz)
  if (response.choices[0].finish_reason === "stop") {
    setTimeout(() => cleanupSession(sessionId), 5000);
  }
  // Return response to caller
  res.json(response);
};

app.post("/chat/completions", handleChatCompletion);
app.post("/v1/chat/completions", handleChatCompletion);

// API endpoints for viewer
app.get("/api/runs", (req: Request, res: Response) => {
  const resultsDir = path.resolve(__dirname, "../../llmz/results");

  try {
    if (!fs.existsSync(resultsDir)) {
      return res.json({ runs: [] });
    }

    const files = fs.readdirSync(resultsDir);
    const runs = files
      .filter((file) => file.startsWith("run_") && file.endsWith(".json"))
      .sort()
      .reverse(); // Most recent first

    res.json({ runs });
  } catch (error) {
    console.error("Error listing runs:", error);
    res.status(500).json({ error: "Failed to list runs" });
  }
});

app.get("/api/runs/:runId", (req: Request, res: Response) => {
  const { runId } = req.params;
  const resultsDir = path.resolve(__dirname, "../../llmz/results");
  const filePath = path.join(resultsDir, runId);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Run not found" });
    }

    const data = fs.readFileSync(filePath, "utf-8");
    const runData = JSON.parse(data);

    res.json(runData);
  } catch (error) {
    console.error("Error reading run:", error);
    res.status(500).json({ error: "Failed to read run" });
  }
});

// Debug endpoint to inspect active sessions
app.get("/api/sessions", (req: Request, res: Response) => {
  const sessions = Array.from(sessionQueues.entries()).map(([id, queues]) => ({
    sessionId: id,
    age: Date.now() - queues.spawnedAt,
    ageMinutes: ((Date.now() - queues.spawnedAt) / 60000).toFixed(2),
  }));
  res.json({ sessions, total: sessions.length });
});

app.listen(PORT, () => {
  console.log(`Middleman server is running on http://localhost:${PORT}`);
  console.log(`Session debug endpoint: http://localhost:${PORT}/api/sessions`);
});
