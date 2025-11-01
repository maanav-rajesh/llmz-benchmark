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

  const chat = new CLIChat();
  for (const message of requestData.messages) {
    chat.transcript.push({
      role: "user",
      content: message.content as string,
    });
  }

  const client = new Client({
    token: process.env.BOTPRESS_TOKEN,
    workspaceId: process.env.BOTPRESS_WORKSPACE_ID,
    botId: process.env.BOTPRESS_BOT_ID,
  });

  let result: ExecutionResult | undefined;
  while (await chat.iterate()) {
    result = await execute({
      client,
      chat,
      tools: requestData.tools?.map(convertOpenAIToolToLLMzTool),
      options: {
        loop: 10,
      },
    });
    if (result.isSuccess()) {
      break;
    }
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
