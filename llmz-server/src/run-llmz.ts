import { execute, ObjectInstance } from "llmz";
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
import { sessionQueues } from "./server";
import { Cognitive } from "@botpress/cognitive";

dotenv.config();

export async function runLLMz(
  request: ChatCompletionCreateParamsNonStreaming,
  model: string
) {
  let instructions = Date.now().toString().toLocaleString() + `\n\n`;
  for (const message of request.messages) {
    instructions += `${message.content} \n\n`;
  }

  // const botIds = process.env.BOTPRESS_BOT_IDS?.split(",") ?? [];
  // const currentBotId = botIds[parseInt(process.env.IDX ?? "0")];

  const client = new Cognitive({
    client: new Client({
      token: process.env.BOTPRESS_TOKEN,
      workspaceId: process.env.BOTPRESS_WORKSPACE_ID,
      botId: process.env.BOTPRESS_BOT_ID,
    }),
    __experimental_beta: true,
  });

  const tools: LLMzTool[] = [];
  for (const tool of request.tools ?? []) {
    tools.push(await convertOpenAIToolToLLMzTool(tool));
  }

  const FS = new ObjectInstance({
    name: "FS",
    description:
      "A comprehensive file system object with tools for reading, writing, and managing files and directories. ALL operations are asynchronous and return promises.",
    tools: tools,
  });

  let result: ExecutionResult | undefined;
  result = await execute({
    client,
    instructions,
    objects: [FS],
    options: {
      loop: 25,
      timeout: 100000000,
    },
    onIterationEnd: async (iteration) => {
      console.log("===========ITERATION CODE START=============");
      console.log(iteration.code);
      console.log("===========ITERATION CODE END=============");
    },
    onAfterTool: async (tool) => {
      console.log(
        `=========== TOOL ${tool.tool.name} RESULT START=============`
      );
      console.log("TOOL INPUT:", tool.input);
      console.log("TOOL OUTPUT:", tool.output);
      console.log(`=========== TOOL ${tool.tool.name} RESULT END=============`);
    },
    onExit: async (result) => {
      console.log("RESULT:", result);
      if (result.result.success === false && result.result.error) {
        console.log("Throwing error on exit:", result.result.error);
        throw new Error(result.result.error);
      }
    },
    model,
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
  sessionQueues.responses.publish(response);
}
