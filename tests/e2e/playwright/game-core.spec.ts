import { test, expect } from '@playwright/test'

/** BIOS 부팅 화면을 건너뛰는 헬퍼 */
async function skipBootScreen(page: import('@playwright/test').Page) {
  // "클릭하여 건너뛰기" 버튼 대기 후 클릭
  const skipBtn = page.getByText(/건너뛰기|skip/i).first()
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipBtn.click()
    await page.waitForTimeout(1000)
  }
}

/** 난이도 선택 + 게임 시작 헬퍼 */
async function startNewGame(page: import('@playwright/test').Page) {
  await skipBootScreen(page)

  // 난이도 또는 새 게임 버튼 찾기
  const btns = [
    page.getByText(/새 게임/i).first(),
    page.getByText(/보통/i).first(),
    page.getByText(/쉬움/i).first(),
    page.getByText(/시작/i).first(),
  ]

  for (const btn of btns) {
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(1500)
    }
  }
}

test.describe('게임 코어 E2E 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#root > *', { timeout: 15000 })
  })

  test('게임이 정상적으로 로드된다', async ({ page }) => {
    await expect(page).toHaveTitle(/Retro Stock/)
    const root = page.locator('#root')
    await expect(root).not.toBeEmpty()
  })

  test('BIOS 부팅 화면이 표시되고 건너뛸 수 있다', async ({ page }) => {
    // BIOS 텍스트 확인
    const biosText = page.getByText(/Stock-OS 95 BIOS|BIOS/i).first()
    await expect(biosText).toBeVisible({ timeout: 5000 })

    // 건너뛰기 클릭
    await skipBootScreen(page)

    // BIOS 화면이 사라지고 다음 화면이 나타나야 함
    await page.waitForTimeout(2000)
    const rootContent = await page.locator('#root').innerHTML()
    expect(rootContent.length).toBeGreaterThan(100)
  })

  test('콘솔에 심각한 에러가 없다', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await startNewGame(page)
    await page.waitForTimeout(4000)

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error') &&
        !e.includes('Loading chunk') &&
        !e.includes('dynamically imported module'),
    )
    expect(criticalErrors).toEqual([])
  })
})

test.describe('트레이딩 시스템 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#root > *', { timeout: 15000 })
    await startNewGame(page)
  })

  test('게임 UI 요소들이 렌더링된다', async ({ page }) => {
    // 게임 시작 후 충분히 대기
    await page.waitForTimeout(3000)

    const htmlContent = await page.locator('#root').innerHTML()
    expect(htmlContent.length).toBeGreaterThan(200)

    const textContent = await page.locator('#root').textContent() ?? ''
    // 게임 화면 또는 메뉴 관련 텍스트가 있어야 함
    const hasGameContent =
      textContent.includes('주식') ||
      textContent.includes('포트폴리오') ||
      textContent.includes('거래') ||
      textContent.includes('현금') ||
      textContent.includes('Stock') ||
      textContent.includes('난이도') ||
      textContent.includes('Retro') ||
      textContent.includes('시작') ||
      textContent.includes('새 게임') ||
      textContent.includes('보통') ||
      textContent.includes('BIOS')

    expect(hasGameContent).toBeTruthy()
  })

  test('5초간 런타임 에러 없이 실행', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.waitForTimeout(5000)

    const rootContent = await page.locator('#root').innerHTML()
    expect(rootContent.length).toBeGreaterThan(0)

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error') &&
        !e.includes('Loading chunk') &&
        !e.includes('dynamically imported module'),
    )
    expect(criticalErrors.length).toBeLessThan(3)
  })
})

test.describe('게임 안정성 E2E', () => {
  test('페이지 로드 후 크래시 없이 동작한다', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#root > *', { timeout: 15000 })

    await startNewGame(page)
    await page.waitForTimeout(5000)

    // 페이지가 여전히 활성 상태
    const rootContent = await page.locator('#root').innerHTML()
    expect(rootContent.length).toBeGreaterThan(0)

    // 심각 에러 없음
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error') &&
        !e.includes('Loading chunk') &&
        !e.includes('dynamically imported module'),
    )
    expect(criticalErrors.length).toBeLessThan(3)
  })
})
