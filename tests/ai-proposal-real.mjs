/**
 * AI 제안 실제 배치 검증 테스트
 *
 * 목표: 책상+직원이 있을 때 AI가 실제 배치를 제안하고,
 * 승인하면 직원이 책상에 배정되는지 확인
 */
import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

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

    // 3. 직원 고용: 애널리스트 1 + 매니저 1 + 트레이더 1
    console.log('[3] 역할별 직원 고용...')
    const roles = ['애널리스트 고용', '매니저 고용', '트레이더 고용']
    for (const role of roles) {
      const btn = page.locator(`button:has-text("${role}")`)
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        if (await btn.isEnabled()) {
          await btn.click()
          await sleep(600)
          console.log(`   ✅ ${role}`)
        } else {
          console.log(`   ⚠️ ${role} - 자금 부족`)
        }
      } else {
        console.log(`   ⚠️ ${role} - 버튼 없음`)
      }
    }

    // 4. 책상 3개 배치
    // 카탈로그에서 "기본 책상" 클릭 → 배치 모드 진입 → 캔버스 클릭
    console.log('[4] 책상 3개 배치...')
    const canvas = page.locator('canvas.block')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('캔버스 없음')

    const deskPositions = [
      { x: box.x + 100, y: box.y + 80 },
      { x: box.x + 250, y: box.y + 80 },
      { x: box.x + 400, y: box.y + 80 },
    ]

    // 기본 책상 카탈로그 아이템은 div 요소
    const basicDeskCard = page.locator('div:has-text("기본 책상")').filter({ hasText: '원' }).first()

    for (let i = 0; i < deskPositions.length; i++) {
      // 카탈로그 클릭 → 배치 모드 활성화
      await basicDeskCard.click()
      await sleep(500)
      // 캔버스 클릭 → 책상 배치
      await page.mouse.click(deskPositions[i].x, deskPositions[i].y)
      await sleep(800)
      console.log(`   📌 책상 ${i + 1} 배치 (${Math.round(deskPositions[i].x)}, ${Math.round(deskPositions[i].y)})`)
    }
    // ESC로 배치 모드 종료
    await page.keyboard.press('Escape')
    await sleep(300)

    await page.screenshot({ path: '/tmp/ai-real-step4.png' })

    // 5. 상태 확인
    console.log('[5] 현재 상태 확인...')
    await page.screenshot({ path: '/tmp/ai-real-step5.png' })

    // 직원 수 확인: 고용 버튼 영역 위의 직원 리스트 확인
    const employeeCount = await page.locator('button:has-text("해제"), button:has-text("배치")').count()
    console.log(`   👥 직원 관련 버튼 수: ${employeeCount}`)

    // 6. AI 제안 클릭
    console.log('[6] AI 제안 클릭...')
    const aiBtn = page.locator('button:has-text("AI 제안")')
    if (!(await aiBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('   ❌ AI 제안 버튼 없음')
      await page.screenshot({ path: '/tmp/ai-real-no-ai-btn.png' })
      throw new Error('AI 제안 버튼 없음')
    }
    await aiBtn.click()
    await sleep(1500)
    await page.screenshot({ path: '/tmp/ai-real-step6-proposal.png' })

    // 7. 팝업 내용 상세 확인
    const proposalTitle = page.locator('text=AI 아키텍트의 제안')
    const hasProposal = await proposalTitle.isVisible({ timeout: 3000 }).catch(() => false)

    if (!hasProposal) {
      console.log('   ❌ AI 팝업 미표시')
      await page.screenshot({ path: '/tmp/ai-real-no-popup.png' })
      throw new Error('AI 팝업 미표시')
    }

    console.log('[7] 팝업 내용 상세 확인...')

    // 효율성 점수 값 읽기
    const effText = await page.locator('text=/효율성 점수/').locator('..').textContent().catch(() => '')
    console.log(`   📊 ${effText.trim()}`)

    // 이동 직원 수 읽기
    const moveText = await page.locator('text=/이동 직원/').locator('..').textContent().catch(() => '')
    console.log(`   👥 ${moveText.trim()}`)

    // 가구 구매 수 읽기
    const furText = await page.locator('text=/가구 구매/').locator('..').textContent().catch(() => '')
    console.log(`   🛋️ ${furText.trim()}`)

    // 예상 비용 읽기
    const costText = await page.locator('text=/예상 비용/').locator('..').textContent().catch(() => '')
    console.log(`   💰 ${costText.trim()}`)

    // 추천 배지
    const badges = ['매우 우수', '우수', '양호', '검토 필요']
    for (const badge of badges) {
      if (await page.locator(`text=${badge}`).isVisible({ timeout: 300 }).catch(() => false)) {
        console.log(`   🏷️ 추천: ${badge}`)
        break
      }
    }

    // 직원 재배치 섹션 확인
    const moveSection = page.locator('text=직원 재배치')
    if (await moveSection.isVisible({ timeout: 500 }).catch(() => false)) {
      console.log('   ✅ 직원 재배치 섹션 있음')
    } else {
      console.log('   — 직원 재배치 섹션 없음 (이동 제안 0개)')
    }

    // 8. 승인 전 상태 캡처
    console.log('\n[8] 승인 전 배치 상태...')
    await page.screenshot({ path: '/tmp/ai-real-step8-before.png' })

    // 9. 승인 실행
    console.log('[9] 제안 승인...')
    const approveBtn = page.locator('button:has-text("승인 및 실행")')
    if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await approveBtn.click()
      await sleep(1500)
      console.log('   ✅ 승인 완료')
    } else {
      console.log('   ⚠️ 승인 버튼 없음 (비용 부족?)')
    }
    await page.screenshot({ path: '/tmp/ai-real-step9-after.png' })

    // 10. 승인 후 상태 확인
    console.log('[10] 승인 후 상태 확인...')

    // 직원 카드에서 "해제" 버튼이 보이면 배치된 것
    const unassignBtns = page.locator('button:has-text("해제")')
    const assignedCount = await unassignBtns.count()
    console.log(`   👥 배치된 직원: ${assignedCount}명 ("해제" 버튼 수)`)

    // "배치" 버튼만 카운트 (해제/자동배치 제외)
    const allBtns = await page.locator('button').allTextContents()
    const assignOnlyBtns = allBtns.filter(t => t.trim() === '배치')
    console.log(`   👥 미배치 직원: ${assignOnlyBtns.length}명 ("배치" 버튼 수)`)

    if (assignedCount > 0) {
      console.log(`   🎯 AI 제안으로 ${assignedCount}명이 책상에 배치됨!`)
    }

    // 11. 다시 AI 제안 → 이미 배치 완료 시 개선 제안 여부
    console.log('\n[11] 재제안 (배치 후)...')
    await aiBtn.click()
    await sleep(1500)

    if (await proposalTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
      const moveText2 = await page.locator('text=/이동 직원/').locator('..').textContent().catch(() => '')
      console.log(`   📊 재제안: ${moveText2.trim()}`)

      const effText2 = await page.locator('text=/효율성 점수/').locator('..').textContent().catch(() => '')
      console.log(`   📊 ${effText2.trim()}`)

      await page.screenshot({ path: '/tmp/ai-real-step11-repropose.png' })

      // 닫기
      const closeBtn = page.locator('button:has-text("거절")')
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click()
        await sleep(500)
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
