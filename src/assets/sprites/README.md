# Sprite Assets Specification

이 디렉토리는 게임의 픽셀 아트 스프라이트 에셋을 관리합니다.

## 📁 File Structure

```
sprites/
├── employee_base.png       # 직원 캐릭터 스프라이트 시트 (160x160px)
├── emotions.png            # 감정 오라 스프라이트 (48x16px)
├── furniture_sprites.png   # 가구 스프라이트 시트 (TBD)
└── README.md              # 이 파일
```

## 🎨 Sprite Specifications

### 1. Employee Base Sprite Sheet (`employee_base.png`)

**크기**: 128x160px (4 columns × 5 rows)
**포맷**: PNG with transparency
**픽셀 스타일**: 32x32px per frame

**레이아웃**:
```
Row 0 (y=0):   WORKING  - 타이핑 애니메이션 (4 프레임)
Row 1 (y=32):  TRADING  - 전화 거는 동작 (4 프레임)
Row 2 (y=64):  BREAK    - 커피 마시기 (4 프레임)
Row 3 (y=96):  PANIC    - 머리 감싸기 (4 프레임)
Row 4 (y=128): IDLE     - 두리번거리기 (4 프레임)
```

**Frame 상세**:
- **WORKING**:
  - Frame 0: 손 내려감
  - Frame 1: 손 올라감 (타이핑)
  - Frame 2: 손 내려감
  - Frame 3: 손 올라감 (반복)

- **TRADING**:
  - Frame 0: 전화기 들기
  - Frame 1: 입 벌림 (말하기)
  - Frame 2: 입 다물기
  - Frame 3: 손 흔들기 (제스처)

- **BREAK**:
  - Frame 0: 커피잔 들기
  - Frame 1: 마시기
  - Frame 2: 내리기
  - Frame 3: 휴식

- **PANIC**:
  - Frame 0: 정상
  - Frame 1: 손 올리기
  - Frame 2: 머리 감싸기
  - Frame 3: 떨림

- **IDLE**:
  - Frame 0: 정면
  - Frame 1: 왼쪽 보기
  - Frame 2: 정면
  - Frame 3: 오른쪽 보기

**색상 팔레트** (Windows 95 스타일):
```
피부: #FFDBAC, #E8B796
셔츠: #3B82F6, #FFFFFF
바지: #1F2937, #4B5563
머리: #422006, #92400E, #FCD34D
```

### 2. Emotion Aura Sprites (`emotions.png`)

**크기**: 48x16px (3 columns × 1 row)
**포맷**: PNG with transparency
**픽셀 스타일**: 16x16px per sprite

**레이아웃**:
```
[Happy (0,0)]  [Stressed (16,0)]  [Focused (32,0)]
```

**Aura 스타일**:
- **Happy** (초록): 부드러운 원형 그라데이션, 중심 밝음
- **Stressed** (빨강): 날카로운 톱니 모양, 불규칙
- **Focused** (파랑): 집중선 형태, 중심으로 모이는 느낌

### 3. Furniture Sprites (`furniture_sprites.png`)

**TBD** - Week 2에서 정의 예정

## 🔧 Development Workflow

### 현재 상태 (Week 1)
- ✅ 스프라이트 명세 완료
- 🔄 플레이스홀더 사용 중 (단색 사각형)
- ⏳ 실제 픽셀 아트 제작 대기 중

### 플레이스홀더 사용
개발 중에는 `SpriteAnimator.renderPlaceholder()`가 상태별 색상 박스를 렌더링합니다:
- WORKING: 파랑 (#3b82f6)
- TRADING: 초록 (#22c55e)
- BREAK: 주황 (#f59e0b)
- PANIC: 빨강 (#ef4444)
- IDLE: 회색 (#6b7280)

### 실제 스프라이트 적용 방법
1. 픽셀 아트 파일을 이 디렉토리에 배치
2. `spriteSheetLoader.load('/assets/sprites/employee_base.png')` 호출
3. 로드된 이미지를 `SpriteAnimator.setSpriteSheet()` 전달

## 🎨 Art Creation Guidelines

### 도구 추천
- **Aseprite**: 픽셀 아트 전문 도구 (유료)
- **Piskel**: 무료 온라인 도구
- **Photoshop/GIMP**: 픽셀 브러시 설정 후 사용 가능

### 제작 팁
1. **32x32px 캔버스**에서 작업
2. **No Anti-aliasing** (선명한 픽셀 경계)
3. **제한된 색상 팔레트** 사용 (8-16 colors)
4. **Onion Skinning** 활성화 (프레임 간 일관성)
5. **Export**: PNG, No compression

### 애니메이션 타이밍
- WORKING: 8 FPS (125ms per frame)
- TRADING: 10 FPS (100ms per frame)
- BREAK: 4 FPS (250ms per frame)
- PANIC: 12 FPS (83ms per frame)
- IDLE: 2 FPS (500ms per frame)

## 📦 Export Settings

### Sprite Sheet Export
- **Format**: PNG-8 (indexed color) 또는 PNG-24 (true color + alpha)
- **Transparency**: Yes
- **Compression**: None (빠른 로딩)
- **Grid Size**: 32x32px
- **Padding**: 0px (no spacing between frames)

### Optimization
- **File Size 목표**: < 50KB per sprite sheet
- **Tool**: TinyPNG 또는 pngquant (선택 사항)
- **Quality**: 90% 이상 유지

## 🚀 Future Enhancements

### Week 2+
- [ ] 가구 스프라이트 시트 추가
- [ ] 직원 다양성 (헤어스타일, 의상 변형)
- [ ] 특수 이펙트 스프라이트 (파티클용)

### Advanced Features
- [ ] Sprite Atlas 자동 생성 (빌드 스크립트)
- [ ] 다중 해상도 지원 (@2x, @3x)
- [ ] WebP 포맷 지원 (선택적)

---

**Last Updated**: 2026-02-16
**Status**: Specification Complete, Assets Pending
