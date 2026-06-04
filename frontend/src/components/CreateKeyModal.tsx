import { useState, useEffect } from 'react'
import { X, Copy, Check, AlertTriangle } from 'lucide-react'
import { keysApi, orgsApi, projectsApi, productsApi, APIKey, Organization, Project, Product } from '../lib/api'
import axios from 'axios'

interface Props {
  onClose: () => void
  onCreated: (key: APIKey) => void
}

const WINDOWS = ['second', 'minute', 'hour', 'day']
const ALL_SCOPES = ['read', 'write', 'admin']

type ScopeLevel = 'org' | 'project' | 'product'

export default function CreateKeyModal({ onClose, onCreated }: Props) {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [orgId, setOrgId] = useState('')
  const [scopeLevel, setScopeLevel] = useState<ScopeLevel>('project')
  const [projectId, setProjectId] = useState('')
  const [productId, setProductId] = useState('')
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>(['read'])
  const [hasRateLimit, setHasRateLimit] = useState(false)
  const [rlRequests, setRlRequests] = useState(1000)
  const [rlWindow, setRlWindow] = useState('minute')
  const [expiresAt, setExpiresAt] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdKey, setCreatedKey] = useState<APIKey | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([orgsApi.list(), projectsApi.list(), productsApi.list()]).then(([os, ps, prods]) => {
      setOrgs(os)
      setProjects(ps)
      setProducts(prods)
      if (os.length > 0) setOrgId(os[0].id)
    })
  }, [])

  const filteredProjects = projects.filter(p => p.org_id === orgId)
  const filteredProducts = products.filter(p => p.org_id === orgId)

  useEffect(() => {
    setProjectId(filteredProjects[0]?.id ?? '')
    setProductId(filteredProducts[0]?.id ?? '')
  }, [orgId])

  function toggleScope(s: string) {
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const key = await keysApi.create({
        org_id: orgId,
        project_id: scopeLevel === 'project' ? projectId : undefined,
        product_id: scopeLevel === 'product' ? productId : undefined,
        name: name || undefined,
        scopes,
        rate_limit: hasRateLimit ? { requests: rlRequests, window: rlWindow } : undefined,
        expires_at: expiresAt || undefined,
      })
      setCreatedKey(key)
      onCreated(key)
    } catch (err) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed') : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  function copyKey() {
    if (createdKey?.plaintext) {
      navigator.clipboard.writeText(createdKey.plaintext)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">Create API Key</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {createdKey ? (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">Copy this key now. It will <strong>never</strong> be shown again.</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2.5 text-xs font-mono text-gray-800 break-all">
                {createdKey.plaintext}
              </code>
              <button onClick={copyKey} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 shrink-0">
                {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} className="text-gray-500" />}
              </button>
            </div>
            <button onClick={onClose} className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            {/* Organization */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Organization *</label>
              <select value={orgId} onChange={e => setOrgId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Scope level */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Key Scope</label>
              <div className="flex gap-2">
                {(['org', 'project', 'product'] as ScopeLevel[]).map(level => (
                  <button key={level} type="button"
                    onClick={() => setScopeLevel(level)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors capitalize ${
                      scopeLevel === level
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}>
                    {level}-level
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {scopeLevel === 'org' && 'Key is valid for all projects and products in this org.'}
                {scopeLevel === 'project' && 'Key is scoped to a specific project within the org.'}
                {scopeLevel === 'product' && 'Key is scoped to a specific product within the org.'}
              </p>
            </div>

            {/* Project picker */}
            {scopeLevel === 'project' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project *</label>
                <select value={projectId} onChange={e => setProjectId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                  {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  {filteredProjects.length === 0 && <option disabled>No projects in this org</option>}
                </select>
              </div>
            )}

            {/* Product picker */}
            {scopeLevel === 'product' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Product *</label>
                <select value={productId} onChange={e => setProductId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                  {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  {filteredProducts.length === 0 && <option disabled>No products in this org</option>}
                </select>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Key Name</label>
              <input type="text" placeholder="e.g. production-backend" value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Scopes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Permission Scopes</label>
              <div className="flex gap-3">
                {ALL_SCOPES.map(s => (
                  <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700 font-mono">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rate limit */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasRateLimit} onChange={e => setHasRateLimit(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-xs font-medium text-gray-700">Rate Limit</span>
              </label>
              {hasRateLimit && (
                <div className="flex gap-2 mt-2">
                  <input type="number" min={1} value={rlRequests} onChange={e => setRlRequests(Number(e.target.value))}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-sm text-gray-500 self-center">per</span>
                  <select value={rlWindow} onChange={e => setRlWindow(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {WINDOWS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expires At (optional)</label>
              <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading || !orgId || scopes.length === 0}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Creating…' : 'Create Key'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
