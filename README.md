# 단어 암기장 (English Word Memorization PWA)

Supabase 기반 PWA로 만든 영어 단어 암기 연습 앱입니다.

## 주요 기능

- **카드(덱) 만들기**: 카드 이름 + 첫 단어(단어/뜻/예문)를 입력해 새 카드를 생성
- **단어 추가**: 카드 안에서 단어/뜻/예문을 계속 추가
- **학습 모드**: 카드를 누르면 학습 화면으로 진입
  - 상단 필터: **단어 / 뜻 / 문장**
    - `단어` 탭: 뜻만 보이고 단어는 블라인드 → 탭하면 공개
    - `뜻` 탭: 단어만 보이고 뜻은 블라인드 → 탭하면 공개
    - `문장` 탭: 예문 속 단어 부분만 블라인드 → 탭하면 공개
  - **랜덤** 버튼으로 순서 섞기
  - **틀렸어요** 체크로 오답 표시
  - **틀린 것만 보기** 토글로 오답만 모아보기
- 로그인 없이 Supabase에 저장 — **모든 기기·배포 URL에서 같은 데이터 공유**
- PWA: 홈 화면에 설치해서 앱처럼 사용 가능

## 기술 스택

- React + TypeScript + Vite
- Supabase (Postgres, Auth - Anonymous Sign-in, RLS)
- vite-plugin-pwa
- react-router-dom

## 시작하기

### 1. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com) 에서 새 프로젝트를 생성합니다.
2. **Project Settings → API** 에서 `Project URL` 과 `anon public` 키를 확인합니다.
3. **SQL Editor** 에서 이 저장소의 `supabase/schema.sql` 파일 내용을 전체 붙여넣고 실행합니다.
   - 예전에 만든 DB가 있다면 `supabase/migration_shared_access.sql` 도 실행하세요.

### 2. 환경변수 설정

프로젝트 루트의 `.env` 파일을 열어 아래 값을 채워주세요. (`.env.example` 참고)

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 3. 설치 및 실행

```bash
npm install
npm run dev
```

터미널에 표시되는 주소(`http://localhost:5173` 등)를 복사해서 브라우저에서 열어주세요.

### 4. 빌드

```bash
npm run build
npm run preview
```

## 데이터 모델

- `decks`: 카드(덱). `id`, `title`, `user_id`, `created_at`
- `words`: 카드에 속한 단어. `id`, `deck_id`, `word`, `meaning`, `sentence`, `is_wrong`, `user_id`, `created_at`

모든 테이블은 RLS가 켜져 있지만 **공개 정책**으로, 같은 Supabase 프로젝트를 쓰는 모든 기기·브라우저에서 같은 데이터를 볼 수 있습니다.

## 참고 사항

- 현재 PWA 아이콘은 SVG(`public/pwa-icon.svg`)로 구성되어 있습니다. 실제 배포 전에는 iOS 홈 화면 아이콘 호환을 위해 PNG 아이콘(192x192, 512x512)을 추가하는 것을 권장합니다.
- 배포 시(Vercel 등)에는 배포 환경에 동일한 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 환경변수를 등록해야 합니다.
