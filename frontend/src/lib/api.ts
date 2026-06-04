import axios from 'axios'

let adminKey: string | null = null

export function setAdminKey(key: string) { adminKey = key }
export function clearAdminKey() { adminKey = null }
export function hasAdminKey(): boolean { return adminKey !== null }

const api = axios.create({ baseURL: '/' })

api.interceptors.request.use((config) => {
  if (adminKey) config.headers['X-API-Key'] = adminKey
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) clearAdminKey()
    return Promise.reject(err)
  }
)

// --- Types ---

export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface Product {
  id: string
  org_id: string
  name: string
  created_at: string
}

export interface Project {
  id: string
  org_id: string
  name: string
  created_at: string
}

export interface KeyMetadata {
  name: string | null
  scopes: string[]
  rate_limit: { requests: number; window: string } | null
  custom: Record<string, unknown>
}

export interface APIKey {
  id: string
  plaintext?: string
  org_id: string
  project_id: string | null
  product_id: string | null
  key_prefix: string
  metadata: KeyMetadata
  use_count: number
  last_used_at: string | null
  created_at: string
  revoked_at: string | null
  status: 'active' | 'revoked' | 'expired'
}

export interface BootstrapStatus {
  bootstrapped: boolean
  admin_key_id: string | null
}

export interface CreateKeyPayload {
  org_id: string
  project_id?: string
  product_id?: string
  name?: string
  scopes?: string[]
  rate_limit?: { requests: number; window: string }
  expires_at?: string
  custom?: Record<string, unknown>
}

// --- API ---

export const bootstrapApi = {
  status: () => api.get<BootstrapStatus>('/v1/bootstrap/status').then(r => r.data),
}

export const orgsApi = {
  list: () => api.get<Organization[]>('/v1/organizations').then(r => r.data),
  create: (name: string) => api.post<Organization>('/v1/organizations', { name }).then(r => r.data),
}

export const productsApi = {
  list: (org_id?: string) =>
    api.get<Product[]>('/v1/products', { params: org_id ? { org_id } : {} }).then(r => r.data),
  listForProject: (project_id: string) =>
    api.get<Product[]>(`/v1/products/project/${project_id}`).then(r => r.data),
  create: (org_id: string, name: string) =>
    api.post<Product>('/v1/products', { org_id, name }).then(r => r.data),
  linkToProject: (project_id: string, product_id: string) =>
    api.post(`/v1/products/project/${project_id}/link`, { product_id }),
}

export const projectsApi = {
  list: (org_id?: string) =>
    api.get<Project[]>('/v1/projects', { params: org_id ? { org_id } : {} }).then(r => r.data),
  create: (org_id: string, name: string) =>
    api.post<Project>('/v1/projects', { org_id, name }).then(r => r.data),
}

export const keysApi = {
  list: (params?: { org_id?: string; project_id?: string }) =>
    api.get<APIKey[]>('/v1/keys', { params }).then(r => r.data),
  get: (id: string) => api.get<APIKey>(`/v1/keys/${id}`).then(r => r.data),
  create: (payload: CreateKeyPayload) => api.post<APIKey>('/v1/keys', payload).then(r => r.data),
  update: (id: string, payload: Partial<CreateKeyPayload>) =>
    api.patch<APIKey>(`/v1/keys/${id}`, payload).then(r => r.data),
  revoke: (id: string) => api.post(`/v1/keys/${id}/revoke`),
  delete: (id: string) => api.delete(`/v1/keys/${id}`),
  verify: (key: string) =>
    api.post<{ valid: boolean; reason?: string; key?: APIKey }>('/v1/keys/verify', { key }).then(r => r.data),
}
