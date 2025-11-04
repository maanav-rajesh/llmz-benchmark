export interface ToolCall {
  type: "tool_call";
  tool_call_id: string;
  tool_name: string;
  started_at: number;
  ended_at: number;
  input: any;
  output?: any;
  error?: any;
  success: boolean;
}

export interface Trace {
  type: string;
  started_at: number;
  ended_at?: number;
  [key: string]: any;
}

export interface Iteration {
  id: string;
  code: string;
  instructions: string;
  started_ts: number;
  ended_ts: number;
  duration: number;
  status: string;
  error?: string;
  model: string;
  tools: any[];
  traces: Trace[];
  variables?: Record<string, any>;
  llm?: {
    tokens: number;
  };
}

export interface RunResult {
  context: {
    iterations: Iteration[];
  };
  result: {
    exit: {
      name: string;
    };
    result: any;
  };
  status: string;
}
