import * as readline from "readline";
import { execute } from "llmz";
import { CLIChat } from "./utils/cli-chat";
import { Client } from "@botpress/client";
import dotenv from "dotenv";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
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
  chat.transcript.push({
    role: "user",
    content: requestData.messages[0].content as string,
  });

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
      model: "openai:gpt-4.1-nano-2025-04-14",
    });
    if (result.isSuccess()) {
      break;
    }
  }

  if (result && result.isSuccess()) {
    fetch("http://localhost:3000/tool-calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        outcome: "success",
      }),
    });
  } else {
    fetch("http://localhost:3000/tool-calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        outcome: "failure",
      }),
    });
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
