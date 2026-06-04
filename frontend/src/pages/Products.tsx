import { useEffect, useState } from 'react'
import { Plus, Package, FolderOpen } from 'lucide-react'
import { orgsApi, productsApi, projectsApi, Organization, Product, Project } from '../lib/api'
import axios from 'axios'

export default function Products() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectProducts, setProjectProducts] = useState<Record<string, Product[]>>({})
  const [loading, setLoading] = useState(true)
  const [newOrgId, setNewOrgId] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  // link product to project
  const [linkProjectId, setLinkProjectId] = useState('')
  const [linkProductId, setLinkProductId] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [os, prods, ps] = await Promise.all([orgsApi.list(), productsApi.list(), projectsApi.list()])
      setOrgs(os)
      setProducts(prods)
      setProjects(ps)
      if (os.length > 0 && !newOrgId) setNewOrgId(os[0].id)
      if (ps.length > 0 && !linkProjectId) setLinkProjectId(ps[0].id)
      if (prods.length > 0 && !linkProductId) setLinkProductId(prods[0].id)
      // Load linked products per project
      const pp: Record<string, Product[]> = {}
      await Promise.all(ps.map(async proj => {
        pp[proj.id] = await productsApi.listForProject(proj.id)
      }))
      setProjectProducts(pp)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setError('')
    try {
      await productsApi.create(newOrgId, newName)
      setNewName('')
      load()
    } catch (err) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed') : 'Unexpected error')
    } finally {
      setCreating(false)
    }
  }

  async function handleLink(e: React.FormEvent) {
    e.preventDefault()
    setLinking(true); setLinkError('')
    try {
      await productsApi.linkToProject(linkProjectId, linkProductId)
      load()
    } catch (err) {
      setLinkError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed') : 'Unexpected error')
    } finally {
      setLinking(false)
    }
  }

  const orgName = (id: string) => orgs.find(o => o.id === id)?.name ?? id.slice(0, 8)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500 mt-0.5">Products belong to an org and can be linked to projects. Keys can be scoped to a product.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Create product */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-3">New Product</h2>
          <form onSubmit={handleCreate} className="space-y-2">
            <select
              value={newOrgId}
              onChange={e => setNewOrgId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Product name (e.g. base, advanced)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button type="submit" disabled={creating}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <Plus size={14} />{creating ? '…' : 'Create'}
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </form>
        </div>

        {/* Link product to project */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Link Product → Project</h2>
          <form onSubmit={handleLink} className="space-y-2">
            <select value={linkProductId} onChange={e => setLinkProductId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({orgName(p.org_id)})</option>)}
            </select>
            <select value={linkProjectId} onChange={e => setLinkProjectId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="submit" disabled={linking}
              className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
              {linking ? 'Linking…' : 'Link'}
            </button>
            {linkError && <p className="text-xs text-red-600">{linkError}</p>}
          </form>
        </div>
      </div>

      {/* Products list grouped by org */}
      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          {products.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No products yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {products.map(prod => {
                const linkedProjects = projects.filter(proj =>
                  (projectProducts[proj.id] ?? []).some(pp => pp.id === prod.id)
                )
                return (
                  <div key={prod.id} className="flex items-center gap-3 px-5 py-4">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Package size={15} className="text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">{prod.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {orgName(prod.org_id)} · {String(prod.id).slice(0, 12)}…
                      </div>
                    </div>
                    {linkedProjects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {linkedProjects.map(proj => (
                          <span key={proj.id} className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-full text-xs">
                            <FolderOpen size={10} />{proj.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
