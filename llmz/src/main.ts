import * as readline from "readline";
import { execute } from "llmz";
import { Client } from "@botpress/client";
import dotenv from "dotenv";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletion,
} from "openai/resources/chat/completions";
import { convertOpenAIToolToLLMzTool } from "./utils/convert-tool";
import type { ExecutionResult } from "llmz";
import type { Tool as LLMzTool } from "llmz";
import * as fs from "fs";

dotenv.config();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  let inputText = "";

  for await (const line of rl) {
    inputText += line + "\n";
  }

  // Parse the input text as JSON
  let requestData: ChatCompletionCreateParamsNonStreaming;
  let sessionId: string;
  try {
    const parsedInput = JSON.parse(inputText.trim());
    requestData = parsedInput as ChatCompletionCreateParamsNonStreaming;

    // CRITICAL: Extract and validate session_id
    sessionId = (parsedInput as any).session_id || process.env.SESSION_ID || "";
    if (!sessionId) {
      console.error(
        "FATAL: No session_id provided in request or SESSION_ID env",
      );
      process.exit(1);
    }

    console.log(`[LLMZ] Session ID: ${sessionId}`);
  } catch (error) {
    console.error("Failed to parse input as JSON:", error);
    process.exit(1);
  }

  // const chat = new CLIChat();
  let instructions = "";
  for (const message of requestData.messages) {
    instructions += `${message.content} \n\n`;
    // chat.transcript.push({
    //   role: "user",
    //   content: message.content as string,
    // });
  }

  instructions +=
    `\n\n` + `The allowed working directory IS the test directory.`;
  instructions += `\n\n` + `Check the return type of every tool call. Do not assume the return type of a tool call.`;

  const client = new Client({
    token: process.env.BOTPRESS_TOKEN,
    workspaceId: process.env.BOTPRESS_WORKSPACE_ID,
    botId: process.env.BOTPRESS_BOT_ID,
  });

  const tools: LLMzTool[] = [];
  for (const tool of requestData.tools ?? []) {
    tools.push(await convertOpenAIToolToLLMzTool(client, tool, sessionId));
  }

  let result: ExecutionResult | undefined;
  result = await execute({
    client,
    instructions,
    tools,
    options: {
      loop: 10,
      timeout: 100000000,
    },
    onIterationEnd: async (iteration) => {
      console.log("===========ITERATION CODE START=============");
      console.log(iteration.code);
      console.log("===========ITERATION CODE END=============");
    },
    onExit: async (result) => {
      console.log("RESULT:", result);
      if (result.result.success === false && result.result.error) {
        console.log("Throwing error on exit:", result.result.error);
        throw new Error(result.result.error);
      }
    },
    model: "openai:gpt-5-2025-08-07",
  });

  const status = result.status;
  console.log("Execution status:", status);

  console.log("===========FINAL RESULT START=============");
  console.log(JSON.stringify(result.output, null, 2));
  console.log("===========FINAL RESULT END=============");

  // save the result to a file
  const runId = `run_${Date.now()}`;
  if (!fs.existsSync("./results")) {
    fs.mkdirSync("./results");
  }
  fs.writeFileSync(`./results/${runId}.json`, JSON.stringify(result, null, 2));

  // Clean up old iteration_*.json files
  const oldFiles = fs
    .readdirSync(".")
    .filter((f) => f.startsWith("iteration_"));
  oldFiles.forEach((f) => fs.unlinkSync(f));

  console.log("sending final response");

  // Create ChatCompletion response
  const response: ChatCompletion = {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: requestData.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content:
            result && result.isSuccess()
              ? "Task completed successfully"
              : "Task failed",
          refusal: null,
        },
        logprobs: null,
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens:
        result?.iterations
          .map((iteration) => iteration.llm?.tokens ?? 0)
          .reduce((a, b) => a + b, 0) ?? 0,
    },
  };

  // Send ChatCompletion to middleman with session_id
  await fetch("http://localhost:3000/tool-calls", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...response,
      session_id: sessionId,
    }),
  });
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
