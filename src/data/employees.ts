/* ── Employee Name Pool ── */
const FIRST_NAMES = [
  '김민수', '이서연', '박지훈', '정하늘', '최수현',
  '강태양', '윤미래', '조현우', '한소희', '임도윤',
  '송재훈', '오은지', '배준서', '신다은', '류시온',
  '홍유진', '전승민', '장서윤', '권도영', '남하린',
]

let nameIdx = 0

export function generateEmployeeName(): string {
  const name = FIRST_NAMES[nameIdx % FIRST_NAMES.length]
  nameIdx++
  return name
}

export function resetNamePool(): void {
  nameIdx = 0
}
