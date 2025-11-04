import { useState, useEffect } from 'react'
import RunSelector from './components/RunSelector'
import IterationCard from './components/IterationCard'
import { RunResult } from './types'
import { parseZuiSchema } from './utils/parseSchema'

export default function App() {
  const [selectedRun, setSelectedRun] = useState<string | null>(null)
  const [runData, setRunData] = useState<RunResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedRun) return

    const loadRun = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/runs/${selectedRun}`)
        if (!response.ok) {
          throw new Error(`Failed to load run: ${response.statusText}`)
        }
        const data = await response.json()
        setRunData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load run')
        setRunData(null)
      } finally {
        setLoading(false)
      }
    }

    loadRun()
  }, [selectedRun])

  const totalDuration = runData?.context.iterations.reduce(
    (acc, it) => acc + (it.duration || 0),
    0
  )
  const totalDurationSec = totalDuration ? (totalDuration / 1000).toFixed(2) : '0'

  const firstIteration = runData?.context.iterations[0]
  const model = firstIteration?.model || 'Unknown'

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="app-header">
        <h1>LLMZ Benchmark Viewer</h1>
      </div>

      {/* Run Selector */}
      <RunSelector onSelectRun={setSelectedRun} selectedRun={selectedRun} />

      {/* Content */}
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px', fontSize: '18px' }} className="text-muted">
            Loading run data...
          </div>
        )}

        {error && (
          <div className="card" style={{ borderColor: 'var(--color-error)', borderWidth: '2px' }}>
            <strong style={{ color: 'var(--color-error)' }}>Error:</strong> {error}
          </div>
        )}

        {runData && !loading && (
          <>
            {/* Run Summary */}
            <div className="card">
              <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Run Summary</h2>

              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Run ID</div>
                  <div className="info-value monospace">{selectedRun}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Status</div>
                  <div className="info-value">
                    <span className={`status-badge ${runData.status === 'success' ? 'success' : 'error'}`}>
                      {runData.status === 'success' ? '✅ Success' : '⚠️ Failed'}
                    </span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">Total Duration</div>
                  <div className="info-value">{totalDurationSec}s</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Iterations</div>
                  <div className="info-value">{runData.context.iterations.length}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Model</div>
                  <div className="info-value monospace">{model}</div>
                </div>
              </div>

              {/* Instructions */}
              {firstIteration?.instructions && (
                <details>
                  <summary>View Instructions</summary>
                  <pre className="json-block" style={{ whiteSpace: 'pre-wrap' }}>
                    {firstIteration.instructions}
                  </pre>
                </details>
              )}

              {/* Available Tools */}
              {firstIteration?.tools && firstIteration.tools.length > 0 && (
                <details>
                  <summary>View Available Tools ({firstIteration.tools.length})</summary>
                  <div style={{ marginTop: '12px' }}>
                    {firstIteration.tools.map((tool: any) => (
                      <div key={tool.name} className="tool-list-item">
                        <div className="tool-name" style={{ marginBottom: '8px', fontSize: '14px' }}>
                          {tool.name}
                        </div>
                        {tool.description && (
                          <div className="tool-description">{tool.description}</div>
                        )}
                        <div className="tool-schemas">
                          <div className="schema-block">
                            <div className="schema-label">Input:</div>
                            <code className="schema-code" style={{ fontSize: '11px', wordBreak: 'break-word' }}>
                              {parseZuiSchema(tool.input)}
                            </code>
                          </div>
                          <div className="schema-block">
                            <div className="schema-label">Output:</div>
                            <code className="schema-code" style={{ fontSize: '11px', wordBreak: 'break-word' }}>
                              {parseZuiSchema(tool.output)}
                            </code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>

            {/* Iterations */}
            <div>
              <h2 style={{ marginBottom: '16px' }}>Iterations</h2>
              {runData.context.iterations.map((iteration, index) => (
                <IterationCard
                  key={iteration.id}
                  iteration={iteration}
                  iterationNumber={index + 1}
                />
              ))}
            </div>

            {/* Final Result */}
            <div className="card">
              <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Final Result</h2>

              <div className="info-grid" style={{ marginBottom: '16px' }}>
                <div className="info-item">
                  <div className="info-label">Exit Type</div>
                  <div className="info-value monospace">{runData.result.exit.name}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Status</div>
                  <div className="info-value">
                    <span className={`status-badge ${runData.status === 'success' ? 'success' : 'error'}`}>
                      {runData.status === 'success' ? '✅ Success' : '⚠️ Failed'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="code-label">Result Value:</div>
              <pre className="json-block">
                {JSON.stringify(runData.result.result, null, 2)}
              </pre>
            </div>
          </>
        )}

        {!selectedRun && !loading && (
          <div style={{ textAlign: 'center', padding: '48px', fontSize: '18px' }} className="text-muted">
            Select a run to view results
          </div>
        )}
      </div>
    </div>
  )
}
