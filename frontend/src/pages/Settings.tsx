import { useEffect, useState } from 'react'
import { AlertTriangle, Copy, Check } from 'lucide-react'
import { bootstrapApi, keysApi, projectsApi, APIKey, BootstrapStatus } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

export default function Settings() {
  const [status, setStatus] = useState<BootstrapStatus | null>(null)
  const [rotating, setRotating] = useState(false)
  const [newKey, setNewKey] = useState<APIKey | null>(null)
  const [oldKeyId, setOldKeyId] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const { logout } = useAuth()

  useEffect(() => {
    bootstrapApi.status().then(setStatus)
  }, [])

  async function handleRotate() {
    if (!confirm('Are you sure? You must copy the new key before closing the next dialog.')) return
    setRotating(true)
    setError('')
    try {
      // Find the platform-admin project
      const projects = await projectsApi.list()
      const adminProject = projects.find(p => p.name === 'platform-admin')
      if (!adminProject) throw new Error('platform-admin project not found')

      // Save old key ID for revocation
      const oldId = status?.admin_key_id ?? ''
      setOldKeyId(oldId)

      // Create new admin key
      const key = await keysApi.create({
        org_id: String(adminProject.org_id),
        project_id: adminProject.id,
        name: 'platform-super-admin-rotated',
        scopes: ['admin', 'read', 'write'],
      })
      setNewKey(key)
    } catch (err) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed to rotate') : String(err))
    } finally {
      setRotating(false)
    }
  }

  async function handleConfirmRotation() {
    if (!oldKeyId || !newKey) return
    try {
      await keysApi.revoke(oldKeyId)
      logout()
    } catch (err) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed to revoke old key') : String(err))
    }
  }

  function copyNewKey() {
    if (newKey?.plaintext) {
      navigator.clipboard.writeText(newKey.plaintext)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform configuration and admin key management</p>
      </div>

      {/* Bootstrap Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-medium text-gray-900">Bootstrap Status</h2>
        {status ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-40">Bootstrapped</span>
              <span className={status.bootstrapped ? 'text-green-700 font-medium' : 'text-red-600'}>
                {status.bootstrapped ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-40">Admin Key ID</span>
              <code className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                {status.admin_key_id ?? '—'}
              </code>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">Loading…</div>
        )}
      </div>

      {/* Rotate Admin Key */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-gray-900">Rotate Admin Key</h2>
          <p className="text-xs text-gray-500 mt-1">
            Creates a new admin key, shows it once, then revokes the current key. You will be signed out.
          </p>
        </div>

        {newKey ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                Copy this key now — it will <strong>never</strong> be shown again. Once you click "Revoke Old Key & Sign Out", the current admin key stops working immediately.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2.5 text-xs font-mono text-gray-800 break-all">
                {newKey.plaintext}
              </code>
              <button
                onClick={copyNewKey}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 shrink-0"
              >
                {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} className="text-gray-500" />}
              </button>
            </div>
            <button
              onClick={handleConfirmRotation}
              className="w-full bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Revoke Old Key &amp; Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={handleRotate}
            disabled={rotating}
            className="bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {rotating ? 'Generating…' : 'Rotate Admin Key'}
          </button>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
