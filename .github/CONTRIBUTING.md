# Contributing to Retro Stock OS

프로젝트에 기여해주셔서 감사합니다! 이 문서는 개발 워크플로우와 브랜치 전략을 설명합니다.

## 브랜치 전략

### 브랜치 구조

```
main (프로덕션)
  ├─ phase-0/critical-fixes (Phase 0 작업)
  ├─ phase-1/core-optimization (Phase 1 작업)
  ├─ phase-2/market-systems (Phase 2 작업)
  └─ [기타 feature 브랜치]
```

### 브랜치 네이밍 규칙

**Phase 브랜치**: `phase-N/feature-name`
- 예: `phase-0/critical-fixes`, `phase-1/gamestore-refactor`

**일반 Feature 브랜치**: `feature/feature-name`
- 예: `feature/add-new-event`, `feature/improve-ui`

**버그 수정**: `fix/bug-description`
- 예: `fix/trade-calculation-error`

**성능 개선**: `perf/optimization-area`
- 예: `perf/reduce-bundle-size`

**리팩토링**: `refactor/component-name`
- 예: `refactor/chart-window`

**테스트**: `test/test-area`
- 예: `test/add-integration-tests`

## Commit 컨벤션

### Commit 메시지 형식

```
<type>: <subject>

[optional body]

[optional footer]
```

### Commit 타입

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `refactor`: 코드 리팩토링 (기능 변경 없음)
- `perf`: 성능 개선
- `test`: 테스트 추가/수정
- `docs`: 문서 수정
- `style`: 코드 스타일 변경 (포맷팅, 세미콜론 등)
- `chore`: 빌드 설정, 패키지 매니저 등
- `revert`: 이전 커밋 되돌리기

### Commit 메시지 예시

```
feat: Add M&A system to game engine

- Implement quarterly M&A probability calculation
- Add premium calculation (15-50% range)
- Include restructuring logic for acquired companies
- Connect to tick engine (every quarter)

Closes #123
```

```
fix: React Hook 규칙 위반 수정

- ChartWindow.tsx: useRef로 이전 companyId 추적
- TradingWindow.tsx: 함수형 setState 사용
- 무한 루프 위험 제거

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## 개발 워크플로우

### 1. 브랜치 생성

```bash
# Phase 작업
git checkout -b phase-1/gamestore-refactor

# 일반 기능
git checkout -b feature/new-event-system
```

### 2. 작업 진행

```bash
# 코드 수정
npm run dev  # 개발 서버 실행
npm run lint # ESLint 확인
npm test     # 테스트 실행
```

### 3. 커밋

```bash
git add .
git commit -m "feat: Add new event template system"
```

### 4. Push 및 PR 생성

```bash
git push -u origin feature/new-event-system
```

GitHub에서 Pull Request를 생성합니다.

## Pull Request 체크리스트

PR을 생성하기 전에 다음을 확인하세요:

- [ ] **테스트 통과**: `npm test` 실행 시 모든 테스트 통과
- [ ] **Lint 통과**: `npm run lint` 실행 시 에러 없음
- [ ] **빌드 성공**: `npm run build` 실행 성공
- [ ] **코드 리뷰**: 자기 리뷰 완료
- [ ] **문서 업데이트**: 필요시 README.md, CLAUDE.md 업데이트
- [ ] **커밋 메시지**: 컨벤션 준수
- [ ] **변경 사항 설명**: PR 설명에 무엇을, 왜, 어떻게 변경했는지 명시

## PR 템플릿

```markdown
## 변경 사항 요약
<!-- 무엇을 변경했는지 간단히 설명 -->

## 변경 이유
<!-- 왜 이 변경이 필요한지 설명 -->

## 주요 변경 내역
- [ ] 변경 사항 1
- [ ] 변경 사항 2
- [ ] 변경 사항 3

## 테스트 방법
<!-- 어떻게 테스트했는지, 어떻게 검증할 수 있는지 -->

## 스크린샷 (선택)
<!-- UI 변경이 있다면 스크린샷 첨부 -->

## 체크리스트
- [ ] 테스트 통과
- [ ] Lint 통과
- [ ] 빌드 성공
- [ ] 문서 업데이트 (필요시)
- [ ] 자기 리뷰 완료
```

## 코드 리뷰 가이드

### 리뷰어

- 기능이 요구사항을 충족하는지 확인
- 코드 품질 (가독성, 유지보수성) 평가
- 성능 영향 고려
- 테스트 커버리지 확인
- 보안 취약점 검토

### PR 작성자

- 리뷰어 피드백에 신속하게 응답
- 변경 요청 사항 반영
- 필요시 추가 설명 제공

## Phase별 작업 가이드

### Phase 0: Foundation & Critical Fixes (완료)
- ✅ React Hook 규칙 위반 수정
- ✅ ESLint 설정 정리
- ✅ 테스트 인프라 구축 (797개 테스트)
- ✅ 브랜치 전략 문서화

### Phase 1: Core Engine Optimization
- gameStore 리팩토링 (3,263 LOC → ~800 LOC)
- 번들 크기 최적화 (666KB → 350KB)
- M&A 시스템 검증
- 성능 프로파일링

### Phase 2-6: 계획된 개선 사항
자세한 내용은 프로젝트 루트의 `PLAN.md` 참조

## Git 워크플로우 팁

### Feature 개발

```bash
# 최신 main 가져오기
git checkout main
git pull origin main

# Feature 브랜치 생성
git checkout -b feature/new-feature

# 작업 후 커밋
git add .
git commit -m "feat: Add new feature"

# Push
git push -u origin feature/new-feature

# PR 생성 후 머지되면
git checkout main
git pull origin main
git branch -d feature/new-feature  # 로컬 브랜치 삭제
```

### 긴급 수정

```bash
# Hotfix 브랜치 생성 (main에서 직접)
git checkout main
git checkout -b fix/critical-bug

# 수정 후 커밋
git add .
git commit -m "fix: Critical bug in trading system"

# Push 및 PR
git push -u origin fix/critical-bug
```

## 질문이나 문제가 있으신가요?

- **이슈**: GitHub Issues에 등록
- **논의**: GitHub Discussions 활용
- **긴급**: 프로젝트 메인테이너에게 직접 연락

## 라이선스

프로젝트에 기여함으로써, 귀하의 기여가 프로젝트와 동일한 라이선스 하에 있음에 동의합니다.
