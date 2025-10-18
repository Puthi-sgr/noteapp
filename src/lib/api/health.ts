import { request } from './client'

export const checkDatabaseHealth = async () => {
  return request<{ ok: boolean }>('/health/db', {
    method: 'GET',
    auth: false,
  })
}
