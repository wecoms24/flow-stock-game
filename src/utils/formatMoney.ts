/**
 * 금액을 한국식 단위(조/억/만)로 포맷팅
 *
 * @param amount - 포맷팅할 금액
 * @param options.suffix - 단위 뒤에 '원' 붙일지 여부 (기본: false)
 * @param options.sign - 부호(+/-) 표시 여부 (기본: false)
 * @param options.trillion - 조 단위 표시 여부 (기본: false)
 */
export function formatMoney(
  amount: number,
  options?: { suffix?: boolean; sign?: boolean; trillion?: boolean },
): string {
  const { suffix = false, sign = false, trillion = false } = options ?? {}
  const abs = Math.abs(amount)
  const prefix = sign ? (amount < 0 ? '-' : '+') : ''
  const won = suffix ? '원' : ''

  if (trillion && abs >= 1_000_000_000_000) {
    return `${prefix}${(amount / 1_000_000_000_000).toFixed(1)}조${won}`
  }
  if (abs >= 100_000_000) {
    return `${prefix}${(abs / 100_000_000).toFixed(1)}억${won}`
  }
  if (abs >= 10_000) {
    return `${prefix}${(abs / 10_000).toFixed(0)}만${won}`
  }
  return `${prefix}${abs.toLocaleString()}${won}`
}
