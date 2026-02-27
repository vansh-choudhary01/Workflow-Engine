import React, { useState, useEffect, useRef } from 'react'
import './App.css'

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000'

function Badge ({ status }) {
  const map = {
    waiting_approval: 'bg-yellow-900 text-yellow-300 border border-yellow-700',
    processing: 'bg-blue-900 text-blue-300 border border-blue-700 animate-pulse',
    completed: 'bg-green-900 text-green-300 border border-green-700',
    failed: 'bg-red-900 text-red-300 border border-red-700',
    rejected: 'bg-slate-700 text-slate-300 border border-slate-600',
    created: 'bg-purple-900 text-purple-300 border border-purple-700'
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${map[status] || 'bg-slate-700 text-slate-300 border border-slate-600'}`}>
      {String(status).replace(/_/g, ' ').toUpperCase()}
    </span>
  )
}

function Toasts ({ toasts }) {
  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {toasts.map(t => (
        <div key={t.id} className="bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded shadow-lg">{t.message}</div>
      ))}
    </div>
  )
}

export default function App () {
  const [userId, setUserId] = useState('user1')
  const [prompt, setPrompt] = useState('Plan an email to the team')
  const [workflow, setWorkflow] = useState(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [autoFollow, setAutoFollow] = useState(true)
  const [terminalMode, setTerminalMode] = useState(false)
  const [logFilter, setLogFilter] = useState('all')
  const [logSearch, setLogSearch] = useState('')
  const [toasts, setToasts] = useState([])
  const [promptChars, setPromptChars] = useState(0)
  const [rephraseText, setRephraseText] = useState('')
  const [error, setError] = useState(null)
  const [showDeploymentDocs, setShowDeploymentDocs] = useState(false)
  const [envInput, setEnvInput] = useState('')

  const logsRef = useRef(null)
  const nextToastId = useRef(1)

  const addToast = (message) => {
    const id = nextToastId.current++
    setToasts(t => [...t, { id, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      addToast('Copied to clipboard')
    } catch (e) {
      addToast('Copy failed')
    }
  }

  useEffect(() => setPromptChars(prompt.length), [prompt])

  const createWorkflow = async () => {
    if (!userId || !prompt) return addToast('User ID and prompt required')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prompt })
      })
      const data = await res.json()
      if (data.success) {
        setWorkflow({ id: data.data.workflowId, status: data.data.status, steps: data.data.steps || [], logs: data.data.logs || [], createdAt: data.data.createdAt, error: data.data?.error || null })
        addToast('Workflow created')
        setError(null)
      } else addToast('Create failed')
        if (data.success === false) setError(data?.message);
    } catch (err) {
      console.error(err)
      addToast('Network error')
    } finally { setLoading(false) }
  }

  const fetchWorkflow = async (id) => {
    if (!id) return
    try {
      const res = await fetch(`${API_BASE}/api/workflow/${id}`)
      const data = await res.json()
      if (data.success) {
        setWorkflow({ id: data.data.workflowId, status: data.data.status, steps: data.data.steps || [], logs: data.data.logs || [], createdAt: data.data.createdAt, error: data.data?.error || null })
      }
      else setError(data?.message);
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    if (!workflow) return
    if (!autoRefresh) return
    if (['completed', 'failed', 'rejected'].includes(workflow.status)) return
    const t = setInterval(() => fetchWorkflow(workflow.id), 500)
    return () => clearInterval(t)
  }, [workflow, autoRefresh])

  useEffect(() => {
    if (!logsRef.current || !workflow) return
    const el = logsRef.current
    if (!autoFollow) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [workflow?.logs, autoFollow])

  const postAction = async (action, body = {}) => {
    if (!workflow) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/workflow/${workflow.id}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: Object.keys(body).length ? JSON.stringify(body) : undefined })
      const data = await res.json()
      if (data.success || (data.success === false && action === 'reject')) {
        const status = data.data?.status || (data.success ? data.data.status : 'rejected')
        setWorkflow(prev => ({ ...prev, status, steps: data.data?.steps || prev.steps, logs: data.data?.logs || prev.logs, error: data.data?.error || null }));
        addToast(action === 'approve' ? 'Execution started' : action === 'reject' ? 'Workflow rejected' : action === 'rephrase' ? 'Workflow rephrased' : 'Updated');
        setError(null);
      } else addToast('Action failed')
      if (data.success === false) setError(data?.message);
    } catch (err) { console.error(err); addToast('Network error') } finally { setLoading(false) }
  }

  const handleRephrase = () => {
    if (!rephraseText.trim()) return addToast('Rephrase prompt required')
    postAction('rephrase', { prompt: rephraseText })
    setRephraseText('')
  }

  const parseEnvInput = (envStr) => {
    const env = {}
    envStr.split('\n').forEach(line => {
      line = line.trim()
      if (!line || line.startsWith('#')) return
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    })
    return env
  }

  const hasDeployRepo = (steps) => {
    return (steps || []).some(s => s.tool === 'deploy_repo')
  }

  const filteredLogs = (workflow?.logs || []).filter(l => (logFilter === 'all' || l.status === logFilter) && (!logSearch || JSON.stringify(l).toLowerCase().includes(logSearch.toLowerCase())))

  const renderInputParams = (input) => {
    if (!input) return '-'
    if (typeof input !== 'object') return String(input)
    return Object.entries(input).map(([key, value]) => (
      <div key={key} className="flex gap-2 py-1 text-sm">
        <span className="font-semibold text-cyan-400 min-w-fit">{key}:</span>
        <span className="text-slate-100 break-words font-mono">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</span>
      </div>
    ))
  }

  const progress = () => {
    const steps = workflow?.steps || []
    const total = steps.length
    const done = steps.filter(s => s.status === 'completed').length
    const runningIndex = steps.findIndex(s => s.status === 'processing')
    const current = runningIndex >= 0 ? runningIndex + 1 : done
    return { done, total, current }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-50">
      <div className="max-w-screen mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-700">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Workflow Automation</h1>
            <p className="text-slate-400 mt-1">Human-in-the-Loop Execution Engine</p>
          </div>
          <div className="flex items-center gap-3">
            {workflow && <Badge status={workflow.status} />}
            <button onClick={() => workflow && fetchWorkflow(workflow.id)} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-sm font-medium transition">↻ Refresh</button>
            <button onClick={() => setShowDeploymentDocs(!showDeploymentDocs)} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-sm font-medium transition">📘 Deployment</button>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer hover:text-slate-300 transition">
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="rounded" /> Auto-refresh
            </label>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-900 bg-opacity-30 border border-red-700 rounded p-4">
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold text-lg flex-shrink-0">✕</span>
              <div className="flex-1">
                <h3 className="font-semibold text-red-300 mb-1">Workflow Error</h3>
                <p className="text-red-200 text-sm font-mono break-words">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Deployment Documentation */}
        {showDeploymentDocs && (
          <div className="mb-6 bg-gradient-to-r from-slate-800 to-slate-700 border border-cyan-700 rounded p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold text-cyan-400">📘 Deployment Guide</h2>
              <button onClick={() => setShowDeploymentDocs(false)} className="text-slate-400 hover:text-slate-200 text-xl">✕</button>
            </div>

            <div className="space-y-6 text-slate-200">
              {/* Requirement 1 */}
              <div className="bg-slate-900 bg-opacity-50 rounded p-4 border border-slate-600">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">1. Node.js Project Only</h3>
                <p className="text-sm mb-3">This is a Node.js project. Deployment must use Node.js runtime only.</p>
                <ul className="text-sm space-y-2 ml-4">
                  <li className="flex gap-2"><span className="text-green-400 flex-shrink-0">✓</span> Ensure your deployment environment supports Node.js runtime</li>
                  <li className="flex gap-2"><span className="text-green-400 flex-shrink-0">✓</span> Do not attempt to deploy as a Python, Go, Java, or other language runtime project</li>
                </ul>
              </div>

              {/* Requirement 2 */}
              <div className="bg-slate-900 bg-opacity-50 rounded p-4 border border-slate-600">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">2. Port 4000 Requirement</h3>
                <p className="text-sm mb-3">The backend server <span className="font-bold text-red-300">MUST</span> run on port <span className="font-bold text-cyan-300">4000</span>.</p>
                <ul className="text-sm space-y-2 ml-4">
                  <li className="flex gap-2"><span className="text-green-400 flex-shrink-0">✓</span> Update the <code className="bg-black bg-opacity-30 px-2 py-1 rounded text-yellow-300">.env</code> file with <code className="bg-black bg-opacity-30 px-2 py-1 rounded text-yellow-300">PORT=4000</code></li>
                  <li className="flex gap-2"><span className="text-green-400 flex-shrink-0">✓</span> Ensure port 4000 is open and accessible in your deployment environment</li>
                  <li className="flex gap-2"><span className="text-green-400 flex-shrink-0">✓</span> Firewall rules and network policies must allow incoming traffic on port 4000</li>
                </ul>
              </div>

              {/* Environment Configuration */}
              <div className="bg-slate-900 bg-opacity-50 rounded p-4 border border-slate-600">
                <h3 className="text-lg font-semibold text-cyan-400 mb-3">⚙ Node.js Environment Configuration</h3>
                <p className="text-sm mb-3">Set these environment variables in your Node.js deployment:</p>
                <div className="bg-black bg-opacity-50 p-3 rounded border border-slate-700 font-mono text-xs text-slate-100 space-y-1">
                  <div><span className="text-green-400"># .env configuration for Node.js</span></div>
                  <div><span className="text-yellow-300">PORT</span><span className="text-slate-400">=</span><span className="text-cyan-300">4000</span></div>
                  <div><span className="text-yellow-300">DBURI</span><span className="text-slate-400">=</span><span className="text-cyan-300">mongodb+srv://user:pass@cluster.mongodb.net/workflow-engine</span></div>
                </div>
              </div>

              <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded p-3">
                <p className="text-sm text-blue-300"><span className="font-bold">⚠ Important:</span> Do NOT change the port from 4000 after deployment. All requests will fail if the port is different.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Panel */}
          <div className="lg:col-span-1 bg-slate-800 rounded shadow border border-slate-700 p-5">
            <h2 className="text-lg font-semibold mb-4 text-blue-400">⚙ New Workflow</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2 font-medium">Prompt <span className="text-xs text-slate-500">({promptChars}/1000)</span></label>
                <textarea className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition h-24 resize-none" maxLength={1000} placeholder="Describe the workflow..." value={prompt} onChange={e => setPrompt(e.target.value)} />
              </div>
              <button onClick={createWorkflow} disabled={loading} className={`w-full py-2 rounded font-semibold transition ${loading ? 'bg-slate-600 text-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>{loading ? '⏳ Creating...' : '▶ Create Workflow'}</button>
            </div>
          </div>

          {/* Overview & Actions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 rounded shadow border border-slate-700 p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Workflow ID</p>
                <div className="flex items-center gap-3 mt-2">
                  <h3 className="font-mono font-semibold text-cyan-400 break-all text-sm">{workflow?.id || '—'}</h3>
                  {workflow && <button onClick={() => copy(workflow.id)} className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded transition">Copy</button>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Created</p>
                <p className="font-medium text-slate-100">{workflow && workflow.createdAt ? new Date(workflow.createdAt).toLocaleString() : '—'}</p>
              </div>
            </div>

            {/* Execution Plan - Timeline View */}
            <div className="bg-slate-800 rounded shadow border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-blue-400">📋 Execution Plan</h4>
                <div className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-700 text-cyan-300">{progress().current}/{progress().total} Steps</div>
              </div>
              <div className="space-y-3">
                {(workflow?.steps || []).length === 0 && <div className="text-slate-400 text-center py-8 italic">No steps planned</div>}
                {(workflow?.steps || []).map((s, i) => (
                  <div key={i} className={`relative border-l-4 pl-4 py-3 rounded-r px-4 transition ${s.status === 'completed' ? 'border-green-500 bg-slate-700 bg-opacity-50' : s.status === 'failed' ? 'border-red-500 bg-red-900 bg-opacity-20' : s.status === 'processing' ? 'border-blue-500 bg-blue-900 bg-opacity-20 animate-pulse' : 'border-slate-600 bg-slate-700 bg-opacity-30'}`}>
                    <div className={`absolute -left-3 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition ${s.status === 'completed' ? 'bg-green-500 border-slate-800 text-white' : s.status === 'failed' ? 'bg-red-500 border-slate-800 text-white' : s.status === 'processing' ? 'bg-blue-500 border-slate-800 text-white animate-pulse' : 'bg-slate-600 border-slate-500 text-slate-300'}`}>{i + 1}</div>
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-slate-100 text-base mb-3">{s.tool}</h5>
                        
                        {/* Input Parameters */}
                        {s.input && (
                          <div className="bg-slate-900 bg-opacity-30 rounded p-3 mb-3 border border-slate-600">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Input</div>
                            <div className="text-sm text-slate-200">{renderInputParams(s.input)}</div>
                          </div>
                        )}
                        
                        {/* Result */}
                        {s.result && (
                          <div className="bg-green-900 bg-opacity-20 rounded p-3 mb-3 border border-green-700">
                            <div className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-2">✓ Output</div>
                            <div className="text-sm text-slate-100">{renderInputParams(s.result)}</div>
                          </div>
                        )}
                        
                        {/* Error */}
                        {s.error && (
                          <div className="bg-red-900 bg-opacity-30 rounded p-3 border border-red-600">
                            <div className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-2">✕ Error</div>
                            <div className="text-sm text-red-200">{s.error}</div>
                          </div>
                        )}
                      </div>
                      
                      <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${s.status === 'completed' ? 'bg-green-900 text-green-300' : s.status === 'failed' ? 'bg-red-900 text-red-300' : s.status === 'processing' ? 'bg-blue-900 text-blue-300' : 'bg-slate-700 text-slate-300'}`}>{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            
            {/* Environment Variables - Show if deploy_repo present */}
            {hasDeployRepo(workflow?.steps) && workflow?.status === 'waiting_approval' && (
              <div className="bg-slate-800 rounded shadow border border-slate-700 p-5">
                <h4 className="font-semibold mb-3 text-cyan-400 text-lg">🔧 Environment Variables</h4>
                <p className="text-sm text-slate-300 mb-3">Enter environment variables for deployment (KEY=VALUE, one per line):</p>
                <textarea 
                  value={envInput} 
                  onChange={e => setEnvInput(e.target.value)} 
                  placeholder="PORT=4000&#10;DATABASE_URL=mongodb://localhost&#10;SECRET_KEY=your_secret" 
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 mb-3 h-24 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition resize-none font-mono text-sm"
                />
              </div>
            )}

            {/* Rephrase Section - Visible when waiting_approval */}
            {workflow?.status === 'waiting_approval' && (
              <div className="bg-gradient-to-r from-purple-900 from-20% to-blue-900 to-80% rounded shadow border border-purple-700 p-5">
                <h4 className="font-semibold mb-3 text-purple-300 text-lg">✨ Rephrase Workflow</h4>
                <p className="text-sm text-slate-300 mb-3">Enter a prompt to regenerate and rephrase the workflow steps:</p>
                <textarea 
                  value={rephraseText} 
                  onChange={e => setRephraseText(e.target.value)} 
                  placeholder="e.g., Make it more concise and professional..." 
                  className="w-full bg-slate-700 border border-purple-700 rounded px-3 py-2 mb-3 h-20 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none transition resize-none"
                />
                <button 
                  onClick={handleRephrase} 
                  disabled={loading || !rephraseText.trim()} 
                  className={`py-2 px-4 rounded font-semibold text-sm transition ${loading || !rephraseText.trim() ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                >
                  {loading ? '⏳ Rephrasing...' : '🔄 Rephrase Steps'}
                </button>
              </div>
            )}

            {/* Activity Logs - Workflow Execution */}
            <div className="bg-slate-800 rounded shadow border border-slate-700 p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h4 className="font-semibold text-lg text-blue-400">📊 Activity Logs</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={logFilter} onChange={e => setLogFilter(e.target.value)} className="text-sm bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 focus:border-blue-500 focus:outline-none">
                    <option value="all">All Levels</option>
                    <option value="info">ℹ INFO</option>
                    <option value="success">✓ SUCCESS</option>
                    <option value="error">✕ ERROR</option>
                  </select>
                  <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search..." className="text-sm bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-slate-300 hover:text-slate-100 transition"><input type="checkbox" checked={autoFollow} onChange={e => setAutoFollow(e.target.checked)} className="rounded" /> Follow</label>
                </div>
              </div>
              <div ref={logsRef} className="bg-black bg-opacity-50 text-slate-100 p-4 rounded border border-slate-700 flex-1 overflow-auto font-mono text-xs space-y-1 max-h-80"> 
                {filteredLogs.length === 0 && <div className="text-slate-500 py-8 text-center italic">No activity yet</div>}
                {filteredLogs.map((l, i) => {
                  const icon = l.status === 'error' ? '✕' : l.status === 'success' ? '✓' : 'ℹ'
                  const color = l.status === 'error' ? 'text-red-400' : l.status === 'success' ? 'text-green-400' : 'text-blue-400'
                  return (
                    <div key={i} className="flex gap-3 py-1 leading-snug hover:bg-slate-700 hover:bg-opacity-30 px-2 rounded transition">
                      <span className={`font-bold flex-shrink-0 w-4 ${color}`}>{icon}</span>
                      <span className="text-slate-500 flex-shrink-0 w-20">{new Date(l.timestamp).toLocaleTimeString()}</span>
                      <span className={`flex-1 ${color}`}>{l.message}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Action Panel */}
            <div className="sticky bottom-6 flex gap-3">
              <button onClick={() => {
                const env = hasDeployRepo(workflow?.steps) ? parseEnvInput(envInput) : undefined
                postAction('approve', env ? { env } : {})
              }} disabled={!workflow || workflow.status !== 'waiting_approval'} className={`flex-1 py-3 rounded font-semibold transition text-white ${(!workflow || workflow.status !== 'waiting_approval') ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg'}`}>✓ Approve & Execute</button>
              <button onClick={() => postAction('reject')} disabled={!workflow || workflow.status !== 'waiting_approval'} className={`flex-1 py-3 rounded font-semibold transition text-white ${(!workflow || workflow.status !== 'waiting_approval') ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-lg'}`}>✕ Reject</button>
              <button onClick={() => workflow && fetchWorkflow(workflow.id)} className="py-3 px-6 rounded border border-slate-600 bg-slate-700 hover:bg-slate-600 font-semibold transition text-slate-100">↻ Refresh</button>
            </div>
          </div>
        </div>
      </div>
      <Toasts toasts={toasts} />
    </div>
  )
}
