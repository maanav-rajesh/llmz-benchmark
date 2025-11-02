import { Tool as LLMzTool } from "llmz";
import type {
  ChatCompletionTool,
  ChatCompletionMessageToolCall,
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { convertJsonSchemaToZod as jsonSchemaToZod } from "zod-from-json-schema";
import { z } from "@bpinternal/zui";
import { randomUUID } from "node:crypto";

export interface ResponseOptions {
  model: string;
  content?: string;
  toolCalls?: ChatCompletionMessageToolCall[];
  finishReason: "stop" | "tool_calls" | "length" | "content_filter";
  promptTokens?: number;
  completionTokens?: number;
}

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
 * Converts a JSON Schema to a Zod schema.
 * @param jsonSchema - The JSON Schema object to convert
 * @param toolName - Optional tool name for better error messages
 * @returns A Zod schema
 */
export function convertJsonSchemaToZod(
  jsonSchema: Record<string, any> | undefined,
  toolName?: string
): any {
  // Default schema if no parameters provided
  if (!jsonSchema || typeof jsonSchema !== "object") {
    return z.object({});
  }

  try {
    // Use zod-from-json-schema for runtime conversion
    const result = jsonSchemaToZod(jsonSchema);
    return result;
  } catch (error) {
    const context = toolName ? ` for tool ${toolName}` : "";
    console.warn(`Failed to convert schema${context}:`, error);
    // Fall back to accepting any object
    return z.object({}).passthrough();
  }
}

/**
 * Converts OpenAI tool definitions to LLMz Tool instances.
 * These tools are placeholders - they won't execute, but will be intercepted
 * and returned to the client for execution.
 */
export function convertOpenAIToolToLLMzTool(
  tool: ChatCompletionTool
): LLMzTool {
  if (tool.type !== "function") {
    throw new Error("Only function tools are supported");
  }
  const { name, description, parameters } = tool.function;

  // Convert input schema
  const inputSchema = convertJsonSchemaToZod(
    parameters as Record<string, any> | undefined,
    name
  );

  return new LLMzTool({
    name,
    description: description || `Tool: ${name}`,
    input: inputSchema,
    output: z.object({}).describe("The result of the tool call"),
    handler: async (args: z.infer<typeof inputSchema>) => {
      console.log(`Tool call: ${name} with arguments: ${JSON.stringify(args)}`);
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

      // Send tool call to middleman and wait for tool results
      const result = await fetch("http://localhost:3000/tool-calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(response),
      });

      const resultData: ChatCompletionCreateParamsNonStreaming =
        await result.json();

      // Find the tool result message that matches our toolCallId
      const toolResultMessage = resultData.messages.find(
        (msg: ChatCompletionMessageParam) =>
          msg.role === "tool" &&
          "tool_call_id" in msg &&
          msg.tool_call_id === toolCallId
      );

      if (!toolResultMessage || !("content" in toolResultMessage)) {
        throw new Error(`Tool result not found for tool call ${toolCallId}`);
      }

      // Extract and parse the content
      const content =
        typeof toolResultMessage.content === "string"
          ? toolResultMessage.content
          : JSON.stringify(toolResultMessage.content);

      // Try to parse as JSON, otherwise return as string
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    },
  });
}
