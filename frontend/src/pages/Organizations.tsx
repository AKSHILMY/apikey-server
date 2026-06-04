import { useEffect, useState } from 'react'
import { Plus, Building2, FolderOpen, Package, Key } from 'lucide-react'
import { orgsApi, projectsApi, productsApi, keysApi, Organization, Project, Product } from '../lib/api'
import axios from 'axios'

export default function Organizations() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [keyCounts, setKeyCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [os, ps, prods] = await Promise.all([orgsApi.list(), projectsApi.list(), productsApi.list()])
      setOrgs(os)
      setProjects(ps)
      setProducts(prods)
      const counts: Record<string, number> = {}
      await Promise.all(os.map(async o => {
        const ks = await keysApi.list({ org_id: o.id })
        counts[o.id] = ks.length
      }))
      setKeyCounts(counts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      await orgsApi.create(newName)
      setNewName('')
      load()
    } catch (err) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed to create') : 'Unexpected error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Organizations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Top-level tenants. Each org owns its products, projects, and keys.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">New Organization</h2>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. acme-corp"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={15} />
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : orgs.length === 0 ? (
        <div className="text-sm text-gray-400">No organizations yet.</div>
      ) : (
        <div className="space-y-4">
          {orgs.map(org => {
            const orgProjects = projects.filter(p => p.org_id === org.id)
            const orgProducts = products.filter(p => p.org_id === org.id)
            return (
              <div key={org.id} className="bg-white rounded-xl border border-gray-200">
                {/* Org header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Building2 size={16} className="text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{org.name}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{org.id}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Package size={12} />{orgProducts.length} product{orgProducts.length !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1"><FolderOpen size={12} />{orgProjects.length} project{orgProjects.length !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1"><Key size={12} />{keyCounts[org.id] ?? 0} key{(keyCounts[org.id] ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Products */}
                {orgProducts.length > 0 && (
                  <div className="px-5 py-3 border-b border-gray-100 bg-orange-50/30">
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Products</p>
                    <div className="flex flex-wrap gap-2">
                      {orgProducts.map(prod => (
                        <div key={prod.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-orange-200 rounded-lg text-xs">
                          <Package size={11} className="text-orange-500" />
                          <span className="font-medium text-gray-800">{prod.name}</span>
                          <span className="text-gray-400 font-mono">{String(prod.id).slice(0, 8)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {orgProjects.length > 0 && (
                  <div className="divide-y divide-gray-100">
                    {orgProjects.map(proj => (
                      <div key={proj.id} className="flex items-center gap-3 px-5 py-3 ml-4">
                        <FolderOpen size={14} className="text-purple-500 shrink-0" />
                        <span className="text-sm text-gray-800 font-medium">{proj.name}</span>
                        <span className="text-xs text-gray-400 font-mono">{String(proj.id).slice(0, 12)}…</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
