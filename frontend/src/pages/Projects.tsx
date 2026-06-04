import { useEffect, useState } from 'react'
import { Plus, FolderOpen, Package, Key } from 'lucide-react'
import { orgsApi, projectsApi, productsApi, keysApi, Organization, Project, Product } from '../lib/api'
import axios from 'axios'

export default function Projects() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectProducts, setProjectProducts] = useState<Record<string, Product[]>>({})
  const [keyCounts, setKeyCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [newOrgId, setNewOrgId] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [os, ps] = await Promise.all([orgsApi.list(), projectsApi.list()])
      setOrgs(os)
      setProjects(ps)
      if (os.length > 0 && !newOrgId) setNewOrgId(os[0].id)
      const pp: Record<string, Product[]> = {}
      const kc: Record<string, number> = {}
      await Promise.all(ps.map(async proj => {
        const [prods, ks] = await Promise.all([
          productsApi.listForProject(proj.id),
          keysApi.list({ project_id: proj.id }),
        ])
        pp[proj.id] = prods
        kc[proj.id] = ks.length
      }))
      setProjectProducts(pp)
      setKeyCounts(kc)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setError('')
    try {
      await projectsApi.create(newOrgId, newName)
      setNewName('')
      load()
    } catch (err) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed to create') : 'Unexpected error')
    } finally {
      setCreating(false)
    }
  }

  const orgName = (id: string) => orgs.find(o => o.id === id)?.name ?? id.slice(0, 8)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
        <p className="text-sm text-gray-500 mt-0.5">Projects belong to an org and group API keys. Products linked to a project define available scopes.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">New Project</h2>
        <form onSubmit={handleCreate} className="flex gap-2">
          <select
            value={newOrgId}
            onChange={e => setNewOrgId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input
            type="text"
            placeholder="Project name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button type="submit" disabled={creating}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Plus size={15} />{creating ? 'Creating…' : 'Create'}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="text-sm text-gray-400">No projects yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {projects.map(proj => {
            const prods = projectProducts[proj.id] ?? []
            const keyCount = keyCounts[proj.id] ?? 0
            return (
              <div key={proj.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg mt-0.5">
                    <FolderOpen size={15} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{proj.name}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{orgName(proj.org_id)}</span>
                      <span className="text-xs text-gray-400 font-mono ml-auto">{String(proj.id).slice(0, 12)}…</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      {prods.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {prods.map(p => (
                            <span key={p.id} className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-full text-xs">
                              <Package size={10} />{p.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No products linked</span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                        <Key size={11} />{keyCount} key{keyCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
