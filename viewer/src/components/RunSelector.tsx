import { useState, useEffect } from 'react'

interface RunSelectorProps {
  onSelectRun: (runId: string) => void
  selectedRun: string | null
}

export default function RunSelector({ onSelectRun, selectedRun }: RunSelectorProps) {
  const [runs, setRuns] = useState<string[]>([])

  useEffect(() => {
    const loadRuns = async () => {
      try {
        const response = await fetch('/api/runs')
        if (response.ok) {
          const data = await response.json()
          setRuns(data.runs)
          if (data.runs.length > 0 && !selectedRun) {
            onSelectRun(data.runs[0])
          }
        }
      } catch (error) {
        console.error('Failed to load runs:', error)
      }
    }
    loadRuns()
  }, [])

  return (
    <div className="run-selector">
      <label>Run:</label>
      <select value={selectedRun || ''} onChange={(e) => onSelectRun(e.target.value)}>
        <option value="">Select a run...</option>
        {runs.map((run) => (
          <option key={run} value={run}>
            {run}
          </option>
        ))}
      </select>
      <button onClick={() => window.location.reload()} className="btn">
        Reload
      </button>
    </div>
  )
}
