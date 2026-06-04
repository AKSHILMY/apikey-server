import { Copy, ShieldOff, Trash2, Check, Building2, FolderOpen, Package } from 'lucide-react'
import { useState } from 'react'
import { APIKey } from '../lib/api'

interface KeyTableProps {
  keys: APIKey[]
  rawKeys: Map<string, string>
  orgMap: Record<string, string>
  projectMap: Record<string, string>
  productMap: Record<string, string>
  onRevoke: (id: string) => void
  onDelete: (id: string) => void
}

function StatusBadge({ status }: { status: APIKey['status'] }) {
  const styles = {
    active:  'bg-green-50 text-green-700 border-green-200',
    revoked: 'bg-red-50 text-red-700 border-red-200',
    expired: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {status}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} title="Copy key"
      className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100">
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
    </button>
  )
}

function ScopeTag({ k, orgMap, projectMap, productMap }: {
  k: APIKey
  orgMap: Record<string, string>
  projectMap: Record<string, string>
  productMap: Record<string, string>
}) {
  if (k.project_id) {
    const name = projectMap[k.project_id] ?? k.project_id.slice(0, 8)
    return <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-full text-xs"><FolderOpen size={10} />{name}</span>
  }
  if (k.product_id) {
    const name = productMap[k.product_id] ?? k.product_id.slice(0, 8)
    return <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-full text-xs"><Package size={10} />{name}</span>
  }
  const name = orgMap[k.org_id] ?? k.org_id.slice(0, 8)
  return <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs"><Building2 size={10} />{name}</span>
}

function fmt(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function KeyTable({ keys, rawKeys, orgMap, projectMap, productMap, onRevoke, onDelete }: KeyTableProps) {
  if (keys.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">No API keys yet. Create one to get started.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {['Name', 'Scope', 'Permissions', 'Created', 'Last Used', 'Uses', 'Status', 'Actions'].map(h => (
              <th key={h} className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {keys.map(k => (
            <tr key={k.id} className="hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-900">{k.metadata?.name || <span className="text-gray-400 italic font-normal">unnamed</span>}</span>
                  {rawKeys.has(k.id) && <CopyButton text={rawKeys.get(k.id)!} />}
                </div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">{k.key_prefix}…</div>
              </td>
              <td className="py-3 px-4">
                <ScopeTag k={k} orgMap={orgMap} projectMap={projectMap} productMap={productMap} />
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {(k.metadata?.scopes ?? []).map(s => (
                    <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{s}</span>
                  ))}
                </div>
              </td>
              <td className="py-3 px-4 text-gray-500 text-xs">{fmt(k.created_at)}</td>
              <td className="py-3 px-4 text-gray-500 text-xs">{fmt(k.last_used_at)}</td>
              <td className="py-3 px-4 text-gray-700 font-medium">{k.use_count ?? 0}</td>
              <td className="py-3 px-4"><StatusBadge status={k.status ?? 'active'} /></td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  {k.status === 'active' && (
                    <button onClick={() => onRevoke(k.id)} title="Revoke"
                      className="p-1 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50">
                      <ShieldOff size={14} />
                    </button>
                  )}
                  <button onClick={() => onDelete(k.id)} title="Delete"
                    className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
