import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

function App() {
  const [userId, setUserId] = useState('user1');
  const [prompt, setPrompt] = useState('Plan an email to the team');
  const [workflow, setWorkflow] = useState(null);
  const [rephraseText, setRephraseText] = useState('');
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status) => {
    const colors = {
      'waiting_approval': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      'processing': 'bg-blue-100 text-blue-800 border border-blue-300',
      'completed': 'bg-green-100 text-green-800 border border-green-300',
      'failed': 'bg-red-100 text-red-800 border border-red-300',
      'rejected': 'bg-gray-100 text-gray-800 border border-gray-300',
      'created': 'bg-purple-100 text-purple-800 border border-purple-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getLogColor = (status) => {
    const colors = {
      'info': 'text-blue-600',
      'warning': 'text-yellow-600',
      'error': 'text-red-600',
      'success': 'text-green-600',
    };
    return colors[status] || 'text-gray-600';
  };

  const createWorkflow = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prompt })
      });
      const data = await res.json();
      if (data.success) {
        setWorkflow({ id: data.data.workflowId, status: data.data.status, steps: data.data.steps, logs: data.data.logs || [] });
      } else {
        alert('Create failed');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  const postAction = async (action, body = {}) => {
    if (!workflow) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/workflow/${workflow.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Object.keys(body).length ? JSON.stringify(body) : undefined
      });
      const data = await res.json();
      if (data.success || (data.success === false && action === 'reject')) {
        // some endpoints return success:false on reject in controller; handle status update
        const status = data.data?.status || (data.success ? data.data.status : 'rejected');
        setWorkflow(prev => ({ ...prev, status, steps: data.data?.steps || prev.steps, logs: data.data?.logs || prev.logs }));
      } else {
        alert('Action failed');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflow = async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/api/workflow/${id}`);
      const data = await res.json();
      if (data.success) {
        setWorkflow({ id: data.data.workflowId, status: data.data.status, steps: data.data.steps, logs: data.data.logs || [] });
      }
    } catch (err) {
      console.error('Failed to fetch workflow', err);
    }
  };

  useEffect(() => {
    if (!workflow) return;
    let timer = null;
    if (workflow.status === 'processing') {
      timer = setInterval(() => fetchWorkflow(workflow.id), 3000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [workflow]);

  const handleRephrase = () => {
    if (!rephraseText) return alert('Enter rephrase prompt');
    postAction('rephrase', { prompt: rephraseText });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Workflow Manager</h1>
          <p className="text-slate-600">Human-in-the-Loop Workflow Engine — Create, review, and manage workflows</p>
        </div>

        {/* Create Workflow Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Create New Workflow</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter user ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Workflow Prompt</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what your workflow should do..."
              />
            </div>
            <button
              onClick={createWorkflow}
              disabled={loading}
              className={`w-full font-semibold py-2 rounded-lg transition ${
                loading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {loading ? 'Creating...' : 'Create Workflow'}
            </button>
          </div>
        </div>

        {/* Workflow Detail Card */}
        {workflow && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">Workflow Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-600">Workflow ID</p>
                  <p className="text-lg font-mono text-slate-800 break-all">{workflow.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Status</p>
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(workflow.status)}`}>
                    {workflow.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Steps Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Workflow Steps</h3>
              {workflow.steps && workflow.steps.length > 0 ? (
                <div className="space-y-3">
                  {workflow.steps.map((step, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-200 word-break break-words">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-800">Step {i + 1}: {step.tool}</h4>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          step.status === 'completed' ? 'bg-green-100 text-green-800' :
                          step.status === 'failed' ? 'bg-red-100 text-red-800' :
                          step.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {step.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2"><strong>Input:</strong> {JSON.stringify(step.input)}</p>
                      {step.result && <p className="text-sm text-slate-600"><strong>Result:</strong> {JSON.stringify(step.result)}</p>}
                      {step.error && <p className="text-sm text-red-600"><strong>Error:</strong> {step.error}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No steps available</p>
              )}
            </div>

            {/* Logs Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Activity Logs</h3>
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 max-h-64 overflow-y-auto">
                {workflow.logs && workflow.logs.length > 0 ? (
                  <div className="space-y-2">
                    {workflow.logs.map((log, i) => (
                      <div key={i} className="text-sm pb-2 border-b border-slate-200 last:border-b-0">
                        <div className="flex items-start gap-2">
                          <span className={`font-bold ${getLogColor(log.status)}`}>
                            [{log.status.toUpperCase()}]
                          </span>
                          <div className="flex-1">
                            <p className="text-slate-700">{log.message}</p>
                            <p className="text-xs text-slate-500 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No logs yet</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <button
                onClick={() => postAction('approve')}
                disabled={loading || workflow.status !== 'waiting_approval'}
                className={`flex-1 font-semibold py-2 rounded-lg transition ${
                  loading || workflow.status !== 'waiting_approval'
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                }`}
              >
                Approve & Execute
              </button>
              <button
                onClick={() => postAction('reject')}
                disabled={loading || workflow.status !== 'waiting_approval'}
                className={`flex-1 font-semibold py-2 rounded-lg transition ${
                  loading || workflow.status !== 'waiting_approval'
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                }`}
              >
                Reject
              </button>
              <button
                onClick={() => fetchWorkflow(workflow.id)}
                disabled={loading}
                className={`flex-1 font-semibold py-2 rounded-lg transition ${
                  loading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-slate-600 text-white hover:bg-slate-700 active:bg-slate-800'
                }`}
              >
                Refresh
              </button>
            </div>

            {/* Rephrase Section */}
            {workflow.status === 'waiting_approval' && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Rephrase Steps</h3>
                <p className="text-sm text-blue-700 mb-3">Modify your request to adjust the workflow steps</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={rephraseText}
                    onChange={e => setRephraseText(e.target.value)}
                    placeholder="Enter your rephrase prompt..."
                    className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleRephrase}
                    disabled={loading}
                    className={`w-full font-semibold py-2 rounded-lg transition ${
                      loading
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                    }`}
                  >
                    {loading ? 'Rephrasing...' : 'Rephrase Steps'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
