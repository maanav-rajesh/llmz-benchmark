import { Tool as LLMzTool } from "llmz";
import type {
  ChatCompletionTool,
  ChatCompletionMessageToolCall,
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionContentPartText,
} from "openai/resources/chat/completions";
import { Responses } from "openai/resources/responses";
import { transforms, z } from "@bpinternal/zui";
import { randomUUID } from "node:crypto";
import { OpenAI } from "openai";
import { getOrCreateSessionQueues } from "./server";
import { outputSchemas } from "./generated-schemas/filesystem-schemas";
export interface ResponseOptions {
  model: string;
  content?: string;
  toolCalls?: ChatCompletionMessageToolCall[];
  finishReason: "stop" | "tool_calls" | "length" | "content_filter";
  promptTokens?: number;
  completionTokens?: number;
}

export const errorSchema = z.object({
  error: z.string(),
});

/**
 * Creates an OpenAI-compatible chat completion response.
 */
export function createChatCompletionResponse(
  options: ResponseOptions
): ChatCompletion {
  const {
    model,
    content = null,
    toolCalls,
    finishReason,
    promptTokens = 0,
    completionTokens = 0,
  } = options;

  return {
    id: `chatcmpl-${randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
          refusal: null,
          ...(toolCalls && toolCalls.length > 0
            ? { tool_calls: toolCalls }
            : {}),
        },
        finish_reason: finishReason,
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
}

/**
 * Converts OpenAI tool definitions to LLMz Tool instances.
 * These tools are placeholders - they won't execute, but will be intercepted
 * and returned to the client for execution.
 */
export async function convertOpenAIToolToLLMzTool(
  tool: ChatCompletionTool,
  sessionId: string
): Promise<LLMzTool> {
  if (tool.type !== "function") {
    throw new Error("Only function tools are supported");
  }
  const { name, description, parameters } = tool.function;
  const queues = getOrCreateSessionQueues(sessionId);

  // Convert input schema
  const inputSchema = transforms.fromJSONSchema(
    parameters as Record<string, any> | undefined
  );
  // Save the schema to a file
  const outputSchema = transforms.toJSONSchema(
    outputSchemas[name as keyof typeof outputSchemas]
  );
  console.log(`🚀 ~ convertOpenAIToolToLLMzTool ~ ${name}:`, outputSchema);

  try {
    // const resultingSchema = transforms.toJSONSchema(outputSchema);
    // console.log(
    //   "🚀 ~ convertOpenAIToolToLLMzTool ~ resultingSchema:",
    //   resultingSchema
    // );
  } catch (error) {
    console.error(`[Error converting schema] name: ${name}`, error);
    throw new Error(`Error converting schema: ${error}`);
  }

  // const outputJSONSchema = JSON.parse(outputSchemaString);
  // const outputSchemaZod = convertJsonSchemaToZod(outputJSONSchema, name);
  return new LLMzTool({
    name,
    description:
      description +
      // `Only works on absolute paths within allowed directories.` +
      ` Returns a promise.`,
    input: inputSchema,
    output: outputSchemas[name as keyof typeof outputSchemas],
    handler: async (args: z.infer<typeof inputSchema>) => {
      console.log("Executing tool", name);
      // Create the tool call object
      const toolCallId = `call_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
      const toolCall: ChatCompletionMessageToolCall = {
        id: toolCallId,
        type: "function",
        function: {
          name,
          arguments: JSON.stringify(args),
        },
      };

      const response = createChatCompletionResponse({
        model: "openai:gpt-4.1-nano-2025-04-14", //dummy model
        toolCalls: [toolCall],
        finishReason: "tool_calls",
        promptTokens: 0,
        completionTokens: 0,
      });

      console.log("Sending tool call to middleman");

      queues.responses.publish(response);
      const toolResult = await queues.toolResults.consume();

      // Find the tool result message that matches our toolCallId
      const toolResultMessage = toolResult.messages.find(
        (msg: ChatCompletionMessageParam) =>
          msg.role === "tool" &&
          "tool_call_id" in msg &&
          msg.tool_call_id === toolCallId
      );

      if (!toolResultMessage || !("content" in toolResultMessage)) {
        throw new Error(`Tool result not found for tool call ${toolCallId}`);
      }
      // Extract and parse the content;
      const content = toolResultMessage.content as string;
      const parsedContent = JSON.parse(content);
      const contentText =
        parsedContent.content as ChatCompletionContentPartText[];
      const toolCallOutput = contentText[0].text;

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      let parsedResponse: Responses.Response;
      try {
        parsedResponse = await openai.responses.create({
          model: "gpt-4o-2024-08-06",
          input: [
            {
              role: "system",
              content:
                "Extract the output of the tool call and return it in the specified JSON format.",
            },
            {
              role: "user",
              content: toolCallOutput,
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: `${name}_output`,
              schema: outputSchema,
            },
          },
        });

        // console.log("[CONVERT-TOOL] Tool:", name);
        // console.log("[CONVERT-TOOL] Raw MCP output:", toolCallOutput);
      } catch (error) {
        console.error("[Error parsing tool output]", error);
        throw new Error(`Error parsing tool output: ${error}`);
      }
      const jsonResponse = JSON.parse(parsedResponse.output_text);
      // console.log("[CONVERT-TOOL] Parsed response:", jsonResponse);

      return jsonResponse;
    },
  });
}
