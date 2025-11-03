import * as readline from "readline";
import { execute } from "llmz";
import { CLIChat } from "./utils/cli-chat";
import { Client } from "@botpress/client";
import dotenv from "dotenv";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletion,
} from "openai/resources/chat/completions";
import { convertOpenAIToolToLLMzTool } from "./utils/convert-tool";
import type { ExecutionResult } from "llmz";
import { z } from "@bpinternal/zui";
import type { Tool as LLMzTool } from "llmz";

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
  try {
    const parsedInput = JSON.parse(inputText.trim());
    requestData = parsedInput as ChatCompletionCreateParamsNonStreaming;
    console.log("Parsed OpenAI chat completion request:");
    console.log("Model:", requestData.model);
    console.log("Messages:", requestData.messages.length);
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


  instructions += "IMPORTANT: None of the tools will work outside allowed directories. Do not assume that your current working directory is allowed.\n\n";

  instructions += "IMPORTANT: The tools will NOT throw errors if they fail. Instead, they will return a result with the hasError flag set to true.\n\n";
  // instructions += "IMPORTANT: Your tools will return a result that can be any type, may contain miscellaneous information. ALWAYS RETURN A THINK ACTION AFTER CALLING A TOOL so that you can UNDERSTAND the result AND how to use it.\n\n";

  const client = new Client({
    token: process.env.BOTPRESS_TOKEN,
    workspaceId: process.env.BOTPRESS_WORKSPACE_ID,
    botId: process.env.BOTPRESS_BOT_ID,
  });

  const tools: LLMzTool[] = [];
  for (const tool of requestData.tools ?? []) {
    tools.push(await convertOpenAIToolToLLMzTool(client, tool));
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
    model: "openai:gpt-5-2025-08-07",
  });
  console.log("[LLMz]\n");
  for (const iteration of result.iterations) {
    console.log("===========ITERATION START=============");
    console.log(iteration.code);
    console.log("===========ITERATION END=============");
  }

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

  // Send ChatCompletion to middleman
  await fetch("http://localhost:3000/tool-calls", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response),
  });
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
z