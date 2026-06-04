import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { keysApi, projectsApi, orgsApi, productsApi, APIKey, Project, Organization, Product } from '../lib/api'
import KeyTable from '../components/KeyTable'
import CreateKeyModal from '../components/CreateKeyModal'
import axios from 'axios'

export default function Keys() {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filterOrg, setFilterOrg] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [rawKeys, setRawKeys] = useState<Map<string, string>>(new Map())

  async function load() {
    setLoading(true); setError('')
    try {
      const [ks, os, ps, prods] = await Promise.all([
        keysApi.list(filterProject ? { project_id: filterProject } : filterOrg ? { org_id: filterOrg } : undefined),
        orgsApi.list(),
        projectsApi.list(),
        productsApi.list(),
      ])
      setKeys(ks); setOrgs(os); setProjects(ps); setProducts(prods)
    } catch (err) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed') : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterOrg, filterProject])

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this key? It will stop working immediately.')) return
    await keysApi.revoke(id); load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this key?')) return
    await keysApi.delete(id)
    setRawKeys(prev => { const m = new Map(prev); m.delete(id); return m })
    load()
  }

  function handleCreated(key: APIKey) {
    if (key.plaintext) setRawKeys(prev => new Map(prev).set(key.id, key.plaintext!))
    load()
  }

  const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]))
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]))
  const productMap = Object.fromEntries(products.map(p => [p.id, p.name]))

  const displayed = keys.filter(k => !filterStatus || (k.status ?? 'active') === filterStatus)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-0.5">Keys scoped to org, project, or product</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={15} />Create Key
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={filterOrg} onChange={e => { setFilterOrg(e.target.value); setFilterProject('') }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Orgs</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Projects</option>
          {projects.filter(p => !filterOrg || p.org_id === filterOrg).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-500">{error}</div>
        ) : (
          <KeyTable
            keys={displayed}
            rawKeys={rawKeys}
            orgMap={orgMap}
            projectMap={projectMap}
            productMap={productMap}
            onRevoke={handleRevoke}
            onDelete={handleDelete}
          />
        )}
      </div>

      {showCreate && <CreateKeyModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </div>
  )
}
