// import * as readline from "readline";
// import { execute, Exit, ThinkExit } from "llmz";
// import { Client } from "@botpress/client";
// import dotenv from "dotenv";
// import type {
//   ChatCompletionCreateParamsNonStreaming,
//   ChatCompletion,
// } from "openai/resources/chat/completions";
// import { convertOpenAIToolToLLMzTool } from "./utils/convert-tool";
// import type { ExecutionResult } from "llmz";
// import type { Tool as LLMzTool } from "llmz";
// import * as fs from "fs";

// dotenv.config();

// async function main() {
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//     terminal: false,
//   });

//   let inputText = "";

//   for await (const line of rl) {
//     inputText += line + "\n";
//   }

//   // Parse the input text as JSON
//   let requestData: ChatCompletionCreateParamsNonStreaming;
//   let sessionId: string;
//   try {
//     const parsedInput = JSON.parse(inputText.trim());
//     requestData = parsedInput as ChatCompletionCreateParamsNonStreaming;

//     // CRITICAL: Extract and validate session_id
//     sessionId = (parsedInput as any).session_id || process.env.SESSION_ID || "";
//     if (!sessionId) {
//       console.error(
//         "FATAL: No session_id provided in request or SESSION_ID env",
//       );
//       process.exit(1);
//     }

//     console.log(`[LLMZ] Session ID: ${sessionId}`);
//   } catch (error) {
//     console.error("Failed to parse input as JSON:", error);
//     process.exit(1);
//   }

//   // const chat = new CLIChat();
//   let instructions = "";
//   for (const message of requestData.messages) {
//     instructions += `${message.content} \n\n`;
//     // chat.transcript.push({
//     //   role: "user",
//     //   content: message.content as string,
//     // });
//   }
//   instructions += `\n\n` + `Always survey ALL the tools at your disposal. THINK about what valid input arguments each tool might take. If the code you generated is not working, consider WHY, and consider which tool you might use to make progress.`;
//   instructions +=
//     `\n\n` + `IMPORTANT: THINK after every tool call. UNDERSTAND the results and/or errors before continuing. THINK (i.e return with a "think" exit) even in case of errors. This is imperative.`;
//   instructions += `\n\n` + `MOST IMPORTANTLY: DO NOT try and complete the entire task in one iteration. Create logical checkpoints and only generate code for a checkpoint after you have completed the previous ones.`;
//   const client = new Client({
//     token: process.env.BOTPRESS_TOKEN,
//     workspaceId: process.env.BOTPRESS_WORKSPACE_ID,
//     botId: process.env.BOTPRESS_BOT_ID,
//   });

//   const tools: LLMzTool[] = [];
//   for (const tool of requestData.tools ?? []) {
//     tools.push(await convertOpenAIToolToLLMzTool(client, tool, sessionId));
//   }

//   let result: ExecutionResult | undefined;
//   result = await execute({
//     client,
//     instructions,
//     tools,
//     options: {
//       loop: 100,
//       timeout: 100000000,
//     },
//     onIterationEnd: async (iteration) => {
//       console.log("===========ITERATION CODE START=============");
//       console.log(iteration.code);
//       console.log("===========ITERATION OUTPUT START=============");
//       console.log(iteration.llm?.output)
//       console.log("===========ITERATION CODE END=============");
//     },
//     onExit: async (result) => {
//       console.log("RESULT:", result);
//       if (result.result.success === false && result.result.error) {
//         console.log("Throwing error on exit:", result.result.error);
//         throw new Error(result.result.error);
//       }
//     },
//     model: "openai:gpt-5-nano-2025-08-07",
//   });

//   const status = result.status;
//   console.log("Execution status:", status);

//   console.log("===========FINAL RESULT START=============");
//   console.log(JSON.stringify(result.output, null, 2));
//   console.log("===========FINAL RESULT END=============");

//   // save the result to a file
//   const runId = `run_${Date.now()}`;
//   if (!fs.existsSync("./results")) {
//     fs.mkdirSync("./results");
//   }
//   fs.writeFileSync(`./results/${runId}.json`, JSON.stringify(result, null, 2));

//   // Clean up old iteration_*.json files
//   const oldFiles = fs
//     .readdirSync(".")
//     .filter((f) => f.startsWith("iteration_"));
//   oldFiles.forEach((f) => fs.unlinkSync(f));

//   console.log("sending final response");

//   // Create ChatCompletion response
//   const response: ChatCompletion = {
//     id: `chatcmpl-${Date.now()}`,
//     object: "chat.completion",
//     created: Math.floor(Date.now() / 1000),
//     model: requestData.model,
//     choices: [
//       {
//         index: 0,
//         message: {
//           role: "assistant",
//           content:
//             result && result.isSuccess()
//               ? "Task completed successfully"
//               : "Task failed",
//           refusal: null,
//         },
//         logprobs: null,
//         finish_reason: "stop",
//       },
//     ],
//     usage: {
//       prompt_tokens: 0,
//       completion_tokens: 0,
//       total_tokens:
//         result?.iterations
//           .map((iteration) => iteration.llm?.tokens ?? 0)
//           .reduce((a, b) => a + b, 0) ?? 0,
//     },
//   };

//   // Send ChatCompletion to middleman
//   await fetch("http://localhost:3001/tool-calls", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       ...response,
//       session_id: sessionId,
//     }),
//   });
// }

// main().catch((error) => {
//   console.error("Error:", error);
//   process.exit(1);
// });
