import type { SaveData } from '../types'

/**
 * 세이브 데이터를 JSON 파일로 내보내기
 */
export function exportSaveAsFile(data: SaveData): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `retro-stock-os-save-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * JSON 파일에서 세이브 데이터 가져오기
 * @returns 유효한 SaveData 또는 null (검증 실패 시)
 */
export function importSaveFromFile(): Promise<SaveData | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      try {
        const text = await file.text()
        const data = JSON.parse(text) as SaveData
        if (!validateSaveData(data)) {
          resolve(null)
          return
        }
        resolve(data)
      } catch {
        resolve(null)
      }
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/**
 * 기본적인 세이브 데이터 구조 검증
 */
function validateSaveData(data: unknown): data is SaveData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    typeof d.player === 'object' &&
    d.player !== null &&
    typeof d.time === 'object' &&
    d.time !== null &&
    Array.isArray(d.companies) &&
    d.companies.length > 0
  )
}
