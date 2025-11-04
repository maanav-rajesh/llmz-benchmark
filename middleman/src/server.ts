import express, { Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletion,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "1gb" }));

// Global queues for bidirectional communication
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

// Queue for responses from llmz to client
const responseQueue = new AsyncQueue<ChatCompletion>();

// Queue for tool results from client to llmz
const toolResultsQueue =
  new AsyncQueue<ChatCompletionCreateParamsNonStreaming>();

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
): Promise<void> {
  return new Promise((resolve, reject) => {
    const llmzProcess = spawn("pnpm", ["dev"], {
      cwd: path.resolve(__dirname, "../../llmz"),
    });

    // Redirect child process output to parent
    llmzProcess.stdout.pipe(process.stdout);
    llmzProcess.stderr.pipe(process.stderr);

    const requestString = JSON.stringify(request);

    llmzProcess.stdin.write(requestString);
    llmzProcess.stdin.end();

    llmzProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`llmz process exited with code ${code}`));
      }
    });

    llmzProcess.on("error", (error) => {
      reject(error);
    });
  });
}

const handleChatCompletion = async (
  req: Request<{}, {}, ChatCompletionCreateParamsNonStreaming>,
  res: Response<ChatCompletion>,
) => {
  const requestBody = req.body;

  // Check if any messages contain tool calls or tool results
  const hasToolMessages = containsToolMessages(requestBody.messages);

  if (!hasToolMessages) {
    // Initial request - spawn llmz process
    console.log("[MIDDLEMAN] MCPMARK→LLMZ: Initial instruction");
    console.log(JSON.stringify(requestBody, null, 2));
    try {
      spawnLLMz(requestBody);
    } catch (error) {
      console.error("Error spawning llmz:", error);
    }
  } else {
    // Tool results received - publish to toolResultsQueue for llmz to consume
    console.log("[MIDDLEMAN] MCPMARK→LLMZ: Tool results");
    console.log(
      JSON.stringify(
        requestBody.messages[requestBody.messages.length - 1],
        null,
        2,
      ),
    );
    toolResultsQueue.publish(requestBody);
  }

  // Block and consume from response queue
  const response = await responseQueue.consume();

  // Return response to caller
  res.json(response);
};

app.post("/chat/completions", handleChatCompletion);
app.post("/v1/chat/completions", handleChatCompletion);

// Tool calls endpoint - publishes response and waits for tool results
const handleToolCalls = async (
  req: Request<{}, {}, ChatCompletion>,
  res: Response<ChatCompletionCreateParamsNonStreaming>,
) => {
  const completion = req.body;

  // Publish ChatCompletion to responseQueue (llmz → client)
  responseQueue.publish(completion);

  // Block and wait for tool results from toolResultsQueue (client → llmz)
  if (completion.choices[0].finish_reason === "stop") {
    console.log("[MIDDLEMAN] LLMZ→MCPMARK: Final response");
    console.log(JSON.stringify(completion.choices[0].message, null, 2));
    return res.json();
  }

  console.log("[MIDDLEMAN] LLMZ→MCPMARK: Tool call request");
  console.log(JSON.stringify(completion.choices[0].message, null, 2));
  const toolResults = await toolResultsQueue.consume();

  // Return tool results back to llmz
  res.json(toolResults);
};

app.post("/tool-calls", handleToolCalls);
app.post("/v1/tool-calls", handleToolCalls);

app.listen(PORT, () => {
  console.log(`Middleman server is running on http://localhost:${PORT}`);
});
