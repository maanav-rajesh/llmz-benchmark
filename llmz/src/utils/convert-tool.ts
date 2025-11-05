import { Tool as LLMzTool } from "llmz";
import type {
  ChatCompletionTool,
  ChatCompletionMessageToolCall,
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
  ChatCompletionContentPartText,
} from "openai/resources/chat/completions";
import { convertJsonSchemaToZod as jsonSchemaToZod } from "zod-from-json-schema";
import { transforms, z } from "@bpinternal/zui";
import { randomUUID } from "node:crypto";
import { Client } from "@botpress/client";
import { mcpToolOutputSchemas } from "../generated-schemas/mcp-tool-output-schemas";
import { OpenAI } from "openai";
export interface ResponseOptions {
  model: string;
  content?: string;
  toolCalls?: ChatCompletionMessageToolCall[];
  finishReason: "stop" | "tool_calls" | "length" | "content_filter";
  promptTokens?: number;
  completionTokens?: number;
}
import * as zod from "zod";
/**
 * Creates an OpenAI-compatible chat completion response.
 */
export function createChatCompletionResponse(
  options: ResponseOptions,
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
  toolName?: string,
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
export async function convertOpenAIToolToLLMzTool(
  client: Client,
  tool: ChatCompletionTool,
  sessionId: string,
): Promise<LLMzTool> {
  if (tool.type !== "function") {
    throw new Error("Only function tools are supported");
  }
  const { name, description, parameters } = tool.function;

  // Convert input schema
  const inputSchema = transforms.fromJSONSchema(
    parameters as Record<string, any> | undefined,
    name,
  );
  // Save the schema to a file
  const outputSchema = transforms.fromJSONSchema(mcpToolOutputSchemas[name]);

  try {
    const resultingSchema = transforms.toJSONSchema(outputSchema);
    console.log(
      "🚀 ~ convertOpenAIToolToLLMzTool ~ resultingSchema:",
      resultingSchema,
    );
  } catch (error) {
    console.error(`[Error converting schema] name: ${name}`, error);
    throw new Error(`Error converting schema: ${error}`);
  }

  // const outputJSONSchema = JSON.parse(outputSchemaString);
  // const outputSchemaZod = convertJsonSchemaToZod(outputJSONSchema, name);

  return new LLMzTool({
    name,
    description: `Tool: ${name}`,
    input: inputSchema,
    output: outputSchema,
    handler: async (args: z.infer<typeof inputSchema>) => {
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
        body: JSON.stringify({
          ...response,
          session_id: sessionId,
        }),
      });

      const resultData: ChatCompletionCreateParamsNonStreaming =
        await result.json();

      // Find the tool result message that matches our toolCallId
      const toolResultMessage = resultData.messages.find(
        (msg: ChatCompletionMessageParam) =>
          msg.role === "tool" &&
          "tool_call_id" in msg &&
          msg.tool_call_id === toolCallId,
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

      let parsedResponse: z.infer<typeof outputSchema> | undefined;
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
              schema: mcpToolOutputSchemas[name],
            },
          },
        });

        console.log("[CONVERT-TOOL] Tool:", name);
        console.log("[CONVERT-TOOL] Raw MCP output:", toolCallOutput);
      } catch (error) {
        console.error("[Error parsing tool output]", error);
        throw new Error(`Error parsing tool output: ${error}`);
      }
      const jsonResponse = JSON.parse(parsedResponse.output_text);
      console.log("[CONVERT-TOOL] Parsed response:", jsonResponse);

      if (jsonResponse.hasError) {
        throw new Error(
          `Tool ${name} returned an error: ${parsedResponse.output_text}`,
        );
      }

      return jsonResponse;
    },
  });
}
