import { useEffect, useState } from 'react'
import { Key, CheckCircle, XCircle, FolderOpen, Building2, Package } from 'lucide-react'
import { keysApi, projectsApi, orgsApi, productsApi, APIKey, Organization, Project, Product } from '../lib/api'

export default function Dashboard() {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([keysApi.list(), projectsApi.list(), orgsApi.list(), productsApi.list()])
      .then(([ks, ps, os, prods]) => {
        setKeys(ks); setProjects(ps); setOrgs(os); setProducts(prods)
      })
      .finally(() => setLoading(false))
  }, [])

  const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]))
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]))

  const cards = [
    { label: 'Organizations', value: orgs.length,    icon: Building2,     color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Products',      value: products.length, icon: Package,       color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Projects',      value: projects.length, icon: FolderOpen,    color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Keys',    value: keys.length,     icon: Key,           color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Active Keys',   value: keys.filter(k => k.status === 'active').length,  icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Revoked Keys',  value: keys.filter(k => k.status === 'revoked').length, icon: XCircle,    color: 'text-red-600',   bg: 'bg-red-50' },
  ]

  const recent = [...keys]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of your API key platform</p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 xl:grid-cols-6">
            {cards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{label}</span>
                  <div className={`${bg} p-1.5 rounded-lg`}>
                    <Icon size={13} className={color} />
                  </div>
                </div>
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
              </div>
            ))}
          </div>

          {/* Hierarchy overview */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-medium text-gray-900 text-sm mb-4">Hierarchy</h2>
            <div className="space-y-3">
              {orgs.map(org => {
                const orgProjects = projects.filter(p => p.org_id === org.id)
                const orgProducts = products.filter(p => p.org_id === org.id)
                return (
                  <div key={org.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 size={14} className="text-indigo-600" />
                      <span className="font-medium text-sm text-gray-900">{org.name}</span>
                      <span className="text-xs text-gray-400 font-mono ml-auto">{String(org.id).slice(0, 8)}…</span>
                    </div>
                    <div className="ml-4 space-y-1.5">
                      {orgProducts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {orgProducts.map(prod => (
                            <span key={prod.id} className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-full text-xs">
                              <Package size={10} /> {prod.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {orgProjects.map(proj => {
                        const projKeys = keys.filter(k => k.project_id === proj.id)
                        return (
                          <div key={proj.id} className="flex items-center gap-2 text-xs text-gray-600">
                            <FolderOpen size={12} className="text-purple-500 shrink-0" />
                            <span className="font-medium">{proj.name}</span>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-400">{projKeys.length} key{projKeys.length !== 1 ? 's' : ''}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent keys */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="font-medium text-gray-900 text-sm">Recent Keys</h2>
            </div>
            {recent.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No keys yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Scope</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Scopes</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Uses</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.map(k => (
                    <tr key={k.id} className="hover:bg-gray-50">
                      <td className="py-3 px-5 font-medium text-gray-900">
                        {k.metadata?.name || <span className="text-gray-400 italic font-normal">unnamed</span>}
                      </td>
                      <td className="py-3 px-5 text-xs text-gray-500">
                        {k.project_id ? (
                          <span className="flex items-center gap-1"><FolderOpen size={11} className="text-purple-500" />{projectMap[k.project_id] ?? k.project_id.slice(0,8)}</span>
                        ) : (
                          <span className="flex items-center gap-1"><Building2 size={11} className="text-indigo-500" />{orgMap[k.org_id] ?? k.org_id.slice(0,8)}</span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex gap-1 flex-wrap">
                          {(k.metadata?.scopes ?? []).map(s => (
                            <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-gray-700">{k.use_count ?? 0}</td>
                      <td className="py-3 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          k.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                          k.status === 'revoked' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>{k.status ?? 'active'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
