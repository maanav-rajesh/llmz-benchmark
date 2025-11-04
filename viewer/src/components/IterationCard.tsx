import { useState } from 'react'
import { Iteration, ToolCall } from '../types'
import ToolCallCard from './ToolCallCard'

interface IterationCardProps {
  iteration: Iteration
  iterationNumber: number
}

export default function IterationCard({ iteration, iterationNumber }: IterationCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const toolCalls = iteration.traces.filter((trace): trace is ToolCall =>
    trace.type === 'tool_call'
  )

  const durationSec = (iteration.duration / 1000).toFixed(2)
  const hasError = iteration.status === 'exit_error' || iteration.error

  return (
    <div className={`iteration-card ${hasError ? 'error' : 'success'}`}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`iteration-header ${hasError ? 'error' : 'success'}`}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '20px' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <strong style={{ fontSize: '16px' }}>
            Iteration {iterationNumber}
          </strong>
          <span className="tool-duration">
            ({durationSec}s)
          </span>
          <span className={`status-badge ${hasError ? 'error' : 'success'}`}>
            {hasError ? '⚠️ Failed' : '✅ Success'}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="iteration-content">
          {/* Generated Code */}
          <div className="card-section">
            <div className="code-label">Generated Code:</div>
            <pre className="code-block">{iteration.code}</pre>
          </div>

          {/* Tool Calls */}
          {toolCalls.length > 0 && (
            <div className="card-section">
              <div className="code-label">Tool Calls ({toolCalls.length}):</div>
              {toolCalls.map((toolCall) => (
                <ToolCallCard
                  key={toolCall.tool_call_id}
                  toolCall={toolCall}
                  tools={iteration.tools}
                />
              ))}
            </div>
          )}

          {/* Exception */}
          {hasError && iteration.error && (
            <div className="card-section">
              <div className="code-label" style={{ color: 'var(--color-error)' }}>
                ⚠️ Exception:
              </div>
              <pre className="exception-block">{iteration.error}</pre>
            </div>
          )}

          {/* Variables (optional, for debugging) */}
          {iteration.variables && Object.keys(iteration.variables).length > 0 && (
            <details>
              <summary>View Variables</summary>
              <pre className="json-block">
                {JSON.stringify(iteration.variables, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
