import { ToolCall } from '../types'
import { findToolByName, parseZuiSchema } from '../utils/parseSchema'

interface ToolCallCardProps {
  toolCall: ToolCall
  tools: any[]
}

export default function ToolCallCard({ toolCall, tools }: ToolCallCardProps) {
  const duration = toolCall.ended_at - toolCall.started_at
  const durationSec = (duration / 1000).toFixed(2)

  const toolDef = findToolByName(tools, toolCall.tool_name)
  const inputSchema = toolDef?.input ? parseZuiSchema(toolDef.input) : null
  const outputSchema = toolDef?.output ? parseZuiSchema(toolDef.output) : null

  return (
    <div className={`tool-call-card ${toolCall.success ? 'success' : 'error'}`}>
      <div className="tool-call-header">
        <span style={{ fontSize: '18px' }}>
          {toolCall.success ? '✅' : '❌'}
        </span>
        <strong className="tool-name">{toolCall.tool_name}</strong>
        <span className="tool-duration">({durationSec}s)</span>
      </div>

      {toolDef?.description && (
        <div className="tool-description">{toolDef.description}</div>
      )}

      <details>
        <summary>View Details</summary>

        <div style={{ marginLeft: '16px' }}>
          <div className="card-section">
            {inputSchema && (
              <div className="schema-block">
                <div className="schema-label">Input Schema:</div>
                <code className="schema-code">{inputSchema}</code>
              </div>
            )}
            <div className="schema-block">
              <div className="schema-label">Input Value:</div>
              <pre className="json-block">
                {JSON.stringify(toolCall.input, null, 2)}
              </pre>
            </div>
          </div>

          {toolCall.success && toolCall.output && (
            <div className="card-section">
              {outputSchema && (
                <div className="schema-block">
                  <div className="schema-label">Output Schema:</div>
                  <code className="schema-code">{outputSchema}</code>
                </div>
              )}
              <div className="schema-block">
                <div className="schema-label">Output Value:</div>
                <pre className="json-block">
                  {JSON.stringify(toolCall.output, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {!toolCall.success && toolCall.error && (
            <div className="card-section">
              <div className="schema-label" style={{ color: 'var(--color-error)' }}>
                Error:
              </div>
              <pre className="exception-block">
                {JSON.stringify(toolCall.error, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
