import { execute } from "llmz";
import { Client } from "@botpress/client";
import dotenv from "dotenv";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletion,
} from "openai/resources/chat/completions";
import { convertOpenAIToolToLLMzTool } from "./convert-tool";
import type { ExecutionResult } from "llmz";
import type { Tool as LLMzTool } from "llmz";
import * as fs from "fs";
import { getOrCreateSessionQueues } from "./server";

dotenv.config();

export async function runLLMz(request: ChatCompletionCreateParamsNonStreaming, sessionId: string) {
  let instructions = "";
  for (const message of request.messages) {
    instructions += `${message.content} \n\n`;
  }
  instructions +=
    `\n\n` +
    `Always UNDERSTAND ALL THE TOOLS at your disposal. THINK about what valid input arguments each tool might take. If the code you generated is not working, consider WHY, and consider which tool you might use to make progress.`;
  instructions +=
    `\n\n` +
    `IMPORTANT: THINK after every tool call. UNDERSTAND the results and/or errors before continuing. THINK (return with a "think" exit) even in case of errors. This is imperative.`;
  instructions +=
    `\n\n` +
    `MOST IMPORTANTLY: DO NOT try and complete the entire task in one iteration. Create logical checkpoints and only generate code for a checkpoint after you have completed the previous ones.`;

  const client = new Client({
    token: process.env.BOTPRESS_TOKEN,
    workspaceId: process.env.BOTPRESS_WORKSPACE_ID,
    botId: process.env.BOTPRESS_BOT_ID,
  });

  const tools: LLMzTool[] = [];
  for (const tool of request.tools ?? []) {
    tools.push(await convertOpenAIToolToLLMzTool(client, tool, sessionId));
  }

  let result: ExecutionResult | undefined;
  result = await execute({
    client,
    instructions,
    tools,
    options: {
      loop: 100,
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
    model: "openai:gpt-5-2025-08-07"
  });

  const status = result.status;
  console.log("Execution status:", status);

  console.log("===========FINAL RESULT START=============");
  //console.log(JSON.stringify(result.output, null, 2));
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
    model: request.model,
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
  const queues = getOrCreateSessionQueues(sessionId);
  queues.responses.publish(response);
}