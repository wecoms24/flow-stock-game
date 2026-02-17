/**
 * AI 제안 실제 배치 검증 테스트
 *
 * 목표: 책상+직원이 있을 때 AI가 실제 배치를 제안하고,
 * 승인하면 직원이 책상에 배정되는지 확인
 *
 * 접근: 사무실 창 최대화 → 캔버스 접근 → 책상 배치 → AI 제안 테스트
 */
import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  try {
    // 1. 게임 시작
    console.log('[1] 게임 시작...')
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await sleep(3000)
    const startBtns = page.locator('button:has-text("시작")')
    if (await startBtns.count() > 0) {
      await startBtns.first().click()
      await sleep(3000)
    }

    // 2. 사무실 열기
    console.log('[2] 사무실 열기...')
    const stockOsBtn = page.locator('button:has-text("Stock-OS")')
    await stockOsBtn.click()
    await sleep(500)
    await page.locator('button:has-text("사무실")').first().click()
    await sleep(1500)

    // 튜토리얼 닫기
    const tutOk = page.locator('button:has-text("확인")')
    if (await tutOk.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tutOk.click()
      await sleep(500)
    }

    // 사무실 창 최대화 - WindowFrame의 최대화 버튼 또는 타이틀바 더블클릭
    console.log('[2b] 사무실 창 최대화...')
    // 최대화 버튼 패턴들 시도
    let maximized = false
    // 시도 1: title 속성으로 찾기
    const maxBtn1 = page.locator('button[title*="최대"]')
    if (await maxBtn1.count() > 0) {
      await maxBtn1.last().click()
      maximized = true
    }
    if (!maximized) {
      // 시도 2: 사무실 타이틀바의 세 번째 버튼 (_, □, X 순서)
      // WindowFrame 타이틀바 내 버튼들
      const titleBtns = page.locator('.bg-blue-600 button, .bg-blue-700 button, [class*="title"] button')
      const btnCount = await titleBtns.count()
      if (btnCount >= 2) {
        // 보통 마지막에서 두 번째가 최대화
        await titleBtns.nth(btnCount - 2).click()
        maximized = true
      }
    }
    if (!maximized) {
      // 시도 3: 사무실 WindowFrame의 div 헤더를 찾아 더블클릭
      const header = page.locator('div:has-text("사무실")').first()
      await header.dblclick()
    }
    await sleep(500)
    await page.screenshot({ path: '/tmp/ai-real-step2b.png' })

    // 3. 직원 고용
    console.log('[3] 역할별 직원 고용...')
    for (const role of ['애널리스트 고용', '트레이더 고용', '매니저 고용']) {
      const btn = page.locator(`button:has-text("${role}")`)
      await btn.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(200)
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        if (await btn.isEnabled()) {
          await btn.click()
          await sleep(600)
          console.log(`   ✅ ${role}`)
        } else {
          console.log(`   ⚠️ ${role} - 비활성`)
        }
      } else {
        console.log(`   ⚠️ ${role} - 안 보임`)
      }
    }

    // 4. 책상 배치
    console.log('[4] 책상 배치...')
    const canvas = page.locator('canvas.block')
    await canvas.scrollIntoViewIfNeeded().catch(() => {})
    await sleep(300)
    let box = await canvas.boundingBox()
    console.log(`   📐 캔버스 boundingBox: ${JSON.stringify(box)}`)

    if (box && box.y >= 0 && box.height > 50) {
      // 캔버스가 보이면 UI로 책상 배치
      const deskCard = page.locator('text=기본 책상').first()
      for (let i = 0; i < 3; i++) {
        await deskCard.scrollIntoViewIfNeeded().catch(() => {})
        await deskCard.click()
        await sleep(400)

        // 캔버스 스크롤 후 새로운 좌표 얻기
        await canvas.scrollIntoViewIfNeeded().catch(() => {})
        await sleep(200)
        const freshBox = await canvas.boundingBox()
        if (freshBox) {
          const clickX = freshBox.x + freshBox.width * (0.2 + i * 0.3)
          const clickY = freshBox.y + freshBox.height * 0.35
          await page.mouse.click(clickX, clickY)
          await sleep(600)
          console.log(`   📌 책상 ${i + 1}: (${Math.round(clickX)}, ${Math.round(clickY)})`)
        }
      }
      await page.keyboard.press('Escape')
      await sleep(300)
    } else {
      console.log('   ⚠️ 캔버스 접근 불가 - 다른 창 닫고 재시도')
      // 다른 창들 닫기
      const closeBtns = page.locator('button[title="닫기"], button:has-text("✕")')
      const closeCount = await closeBtns.count()
      for (let i = closeCount - 1; i >= 0; i--) {
        const btnText = await closeBtns.nth(i).textContent().catch(() => '')
        // 사무실 창은 닫지 않기
        const parentText = await closeBtns.nth(i).locator('..').locator('..').textContent().catch(() => '')
        if (!parentText.includes('사무실')) {
          await closeBtns.nth(i).click().catch(() => {})
          await sleep(200)
        }
      }
      await sleep(500)

      // 다시 시도
      await canvas.scrollIntoViewIfNeeded().catch(() => {})
      box = await canvas.boundingBox()
      console.log(`   📐 재시도 캔버스: ${JSON.stringify(box)}`)

      if (box && box.y >= 0 && box.height > 50) {
        const deskCard = page.locator('text=기본 책상').first()
        for (let i = 0; i < 3; i++) {
          await deskCard.scrollIntoViewIfNeeded().catch(() => {})
          await deskCard.click()
          await sleep(400)
          await canvas.scrollIntoViewIfNeeded().catch(() => {})
          await sleep(200)
          const freshBox = await canvas.boundingBox()
          if (freshBox) {
            const clickX = freshBox.x + freshBox.width * (0.2 + i * 0.3)
            const clickY = freshBox.y + freshBox.height * 0.35
            await page.mouse.click(clickX, clickY)
            await sleep(600)
            console.log(`   📌 책상 ${i + 1}: (${Math.round(clickX)}, ${Math.round(clickY)})`)
          }
        }
        await page.keyboard.press('Escape')
        await sleep(300)
      }
    }

    await page.screenshot({ path: '/tmp/ai-real-step4.png' })

    // 5. 현재 상태 확인
    console.log('[5] 현재 상태 확인...')
    const deskCount = await page.evaluate(() => {
      const el = [...document.querySelectorAll('div')].find(e =>
        e.textContent?.match(/^책상\s*\(\d+\/\d+\)$/) && e.classList.contains('font-bold')
      )
      return el?.textContent?.match(/\((\d+)\//)?.[1] || '0'
    })
    const empCount = await page.evaluate(() => {
      const el = [...document.querySelectorAll('div')].find(e =>
        e.textContent?.match(/^직원\s*\(\d+\/\d+\)$/) && e.classList.contains('font-bold')
      )
      return el?.textContent?.match(/\((\d+)\//)?.[1] || '0'
    })
    console.log(`   🪑 책상: ${deskCount}개, 👥 직원: ${empCount}명`)

    // 6. AI 제안 테스트
    console.log('[6] AI 제안 클릭...')
    const aiBtn = page.locator('button:has-text("AI 제안")')
    await aiBtn.scrollIntoViewIfNeeded().catch(() => {})
    await sleep(200)

    if (!(await aiBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      throw new Error('AI 제안 버튼 없음')
    }
    await aiBtn.click()
    await sleep(1500)
    await page.screenshot({ path: '/tmp/ai-real-step6.png' })

    // 7. 팝업 확인
    const proposalTitle = page.locator('text=AI 아키텍트의 제안')
    if (!(await proposalTitle.isVisible({ timeout: 3000 }).catch(() => false))) {
      throw new Error('AI 팝업 미표시')
    }

    console.log('[7] 팝업 내용 확인...')
    const popupText = await page.locator('.bg-gray-900').first().textContent().catch(() => '')

    const effMatch = popupText.match(/효율성 점수[:\s]*(\d+)\/100/)
    const moveMatch = popupText.match(/이동 직원[:\s]*(\d+)명/)
    const furMatch = popupText.match(/가구 구매[:\s]*(\d+)개/)
    const costMatch = popupText.match(/예상 비용[:\s]*\$?([\d,]+)/)
    const moveCount = moveMatch ? parseInt(moveMatch[1]) : 0

    console.log(`   📊 효율성: ${effMatch?.[1] || '?'}/100`)
    console.log(`   👥 이동: ${moveCount}명`)
    console.log(`   🛋️ 가구: ${furMatch?.[1] || '?'}개`)
    console.log(`   💰 비용: $${costMatch?.[1] || '?'}`)

    for (const badge of ['매우 우수', '우수', '양호', '검토 필요']) {
      if (popupText.includes(badge)) {
        console.log(`   🏷️ 추천: ${badge}`)
        break
      }
    }

    // 핵심 검증
    if (parseInt(deskCount) > 0 && parseInt(empCount) > 0) {
      if (moveCount > 0) {
        console.log(`   ✅ 핵심 검증 통과: ${moveCount}명 배치 제안`)
      } else {
        console.log(`   ❌ 핵심 검증 실패: 직원(${empCount})+책상(${deskCount})이 있지만 이동 0명`)
      }
    } else {
      console.log(`   ⚠️ 직원(${empCount}) 또는 책상(${deskCount}) 부족`)
    }

    // 8. 승인
    console.log('\n[8] 제안 승인...')
    const approveBtn = page.locator('button:has-text("승인 및 실행")')
    if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await approveBtn.click()
      await sleep(1500)
      console.log('   ✅ 승인 완료')
    }
    await page.screenshot({ path: '/tmp/ai-real-step8.png' })

    // 9. 승인 후 확인
    console.log('[9] 승인 후 상태...')
    const assignedCount = await page.locator('button:has-text("해제")').count()
    const allBtnTexts = await page.locator('button').allTextContents()
    const unassignedCount = allBtnTexts.filter(t => t.trim() === '배치').length
    console.log(`   👥 배치됨: ${assignedCount}명, 미배치: ${unassignedCount}명`)

    if (moveCount > 0 && assignedCount > 0) {
      console.log(`   🎯 AI 제안 → 승인 → ${assignedCount}명 배치 성공!`)
    }

    // 10. 재제안
    console.log('\n[10] 재제안...')
    await aiBtn.scrollIntoViewIfNeeded().catch(() => {})
    await aiBtn.click()
    await sleep(1500)

    if (await proposalTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
      const popup2 = await page.locator('.bg-gray-900').first().textContent().catch(() => '')
      const move2 = popup2.match(/이동 직원[:\s]*(\d+)명/)
      const eff2 = popup2.match(/효율성 점수[:\s]*(\d+)/)
      console.log(`   📊 재제안: 이동 ${move2?.[1] || '?'}명, 효율성 ${eff2?.[1] || '?'}`)

      await page.screenshot({ path: '/tmp/ai-real-step10.png' })
      const closeBtn = page.locator('button:has-text("거절")')
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click()
      }
    }

    await page.screenshot({ path: '/tmp/ai-real-final.png' })
    console.log('\n🎉 실제 배치 제안 검증 완료!')

  } catch (err) {
    console.error('❌ 테스트 실패:', err.message)
    await page.screenshot({ path: '/tmp/ai-real-error.png' }).catch(() => {})
  } finally {
    await browser.close()
  }
}

run()
