/**
 * 한국투자증권 OAuth2 인증 서비스
 * WebSocket 승인키 발급 및 캐싱
 */

import { KIS_REST_BASE } from '../config/kisConfig'
import type { KISCredentials } from '../types'

interface ApprovalResponse {
  approval_key: string
}

let cachedApprovalKey: string | null = null
let cachedAt = 0
const APPROVAL_KEY_TTL = 12 * 60 * 60 * 1000 // 12시간

/**
 * WebSocket 접속키(approval_key) 발급
 * POST /oauth2/Approval
 */
export async function getApprovalKey(credentials: KISCredentials): Promise<string> {
  const now = Date.now()
  if (cachedApprovalKey && now - cachedAt < APPROVAL_KEY_TTL) {
    return cachedApprovalKey
  }

  const res = await fetch(`${KIS_REST_BASE}/oauth2/Approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: credentials.appKey,
      secretkey: credentials.appSecret,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`KIS 승인키 발급 실패 (${res.status}): ${text}`)
  }

  const data = (await res.json()) as ApprovalResponse
  cachedApprovalKey = data.approval_key
  cachedAt = now
  return cachedApprovalKey
}

/** 캐시된 승인키 무효화 */
export function clearApprovalKey(): void {
  cachedApprovalKey = null
  cachedAt = 0
}

/** 자격증명 유효성 간이 검증 (승인키 발급 시도) */
export async function validateCredentials(credentials: KISCredentials): Promise<boolean> {
  try {
    clearApprovalKey()
    await getApprovalKey(credentials)
    return true
  } catch {
    return false
  }
}
