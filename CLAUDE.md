# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

무신사 스타일 쇼핑몰 퍼블리싱(순수 HTML/CSS/JS, 빌드 도구·프레임워크·npm 의존성 없음)과 토스페이먼츠 결제위젯 v2 연동 데모. 브랜드명 `STYLEBOX`와 상품 브랜드는 모두 가상이다(실제 무신사 로고/브랜드를 쓰지 않는다).

## 실행

```bash
node server.js
```

http://localhost:5500 (포트는 `PORT` 환경 변수로 변경). Node 18+ 필요(전역 `fetch` 사용), 외부 패키지 없음. 빌드·린트·테스트 스크립트는 없다.

- 주문/결제 API는 `.env`(또는 환경 변수)의 `SUPABASE_SERVICE_ROLE_KEY`가 필요하다. 없으면 `/api/*`가 503 `SERVER_NOT_CONFIGURED`를 돌려준다(상품 조회·로그인은 동작). `.env.example` 참고. `server.js`가 `.env`를 직접 파싱한다(dotenv 없음).
- HTML을 `file://`로 직접 열면 결제가 완료되지 않는다. `successUrl`/`failUrl`이 `location.origin` 기반이고 `/api/*` 서버가 필요하기 때문이다(`checkout.html`이 이 경우 경고를 띄운다).
- 이 Windows 환경에서는 Node/Git이 세션 PATH에 없을 수 있다: `C:\Program Files\nodejs\node.exe`, `C:\Program Files\Git\cmd\git.exe`.

## 아키텍처

### 스크립트 로딩 구조
모듈 번들러 없이 `<script>` 태그 순서에 의존하는 전역 스코프 방식이다. 모든 페이지가 다음 순서로 로드한다:

0. supabase-js CDN(`@supabase/supabase-js@2.45.4` UMD, 버전 고정) → `js/supabase.js` — `sb`(클라이언트, 로드 실패 시 `null`), `Auth`(`user`, `ready` Promise, `onChange`, `token()`, `signOut()`), `SUPABASE_URL`/`SUPABASE_ANON_KEY`
1. `js/products.js` — `loadCatalog()`(DB에서 한 번 불러와 캐시, 실패 시 재시도 가능), `CATEGORIES`/`PRODUCTS`(빈 객체로 시작해 채워짐), `getProduct`(캐시 동기 조회), `salePrice`, `productArt`, `photoUrl`, `photoCredit`
2. `js/common.js` — 유틸(`won`, `$`, `$$`, `storage`), `Cart`, `Likes`, 회원 동기화(`syncUserData`, `userDataReady`), 헤더/푸터(`renderLayout`, `renderNav`, `renderAuthArea`), 상품 카드·모달·장바구니 드로어·토스트, async 페이지 초기화(`initHomePage`, `initCategoryPage`)
3. 페이지별 스크립트 — `js/checkout.js`, `js/success.js`, `js/login.js`, `js/orders.js`, 또는 인라인 `initXxx()` 호출

헤더(`#header`)와 푸터(`#footer`)는 HTML에 마크업이 없고 `renderLayout(activeKey)`가 주입한다. 카테고리 탭(`#lnb`)은 카탈로그 로드 후 `renderNav`가 다시 그리고, 로그인 영역(`#authArea`)은 `Auth.ready`/`onChange`로 갱신된다. 모달·드로어·토스트는 `mountOverlays()`가 body 끝에 동적으로 추가한다.

**상품이 필요한 코드는 먼저 `await loadCatalog()`** 해야 한다(동기 `getProduct`는 캐시가 비면 `undefined`). 실패하면 `catalogErrorHTML(err)`로 안내를 띄운다(빈 화면 금지).

### 카테고리 페이지
`tops.html` / `shoes.html` / `pants.html`은 `<body data-category="...">` 값만 다른 동일 템플릿이다. 실제 동작은 `initCategoryPage()`가 `CATEGORIES[key]`(세부 카테고리 `subs` 포함)와 `PRODUCTS`의 `cat`/`sub` 필드로 처리한다. 카테고리를 추가하면 DB `categories` 행과 같은 이름의 `<key>.html`이 필요하다(`href`는 `${key}.html`로 파생).

### 상품 데이터와 이미지
- DB 테이블: `categories(key, name, en_name, sizes, sort)`, `subs(category_key, key, name, sort)`, `products(..., category_key, sub_key, price, discount, likes, rating, reviews, badges, photo, credit_author, credit_id)`. 클라이언트 객체로 바꿀 때 `sub`는 세부 카테고리 **이름**(예: `'부츠'`), `sizes`는 카테고리의 `sizes`, `sale`은 `salePrice(price, discount)`로 파생한다.
- **할인가 규칙(100원 단위 반올림)은 `js/products.js`와 `server.js`의 `salePrice`에 똑같이 두 번 구현되어 있다.** 하나를 바꾸면 다른 하나도 바꾼다(서버가 결제 금액을 재계산).
- 상품 추가/수정은 `supabase/seed.sql`(upsert)을 고쳐 SQL로 실행하거나 대시보드에서 한다. anon/authenticated는 카탈로그에 쓰기 권한이 없다.
- 이미지는 Unsplash CDN 핫링크다. `photo`는 `images.unsplash.com/photo-<id>`의 id, `credit`은 `[작가명, Unsplash 사진 페이지 ID]`. 5:6 비율 crop은 `photoUrl()`의 쿼리 파라미터로 처리한다. 작가 표기는 상품 모달(`photoCredit`)과 푸터에 노출된다.

### 클라이언트 상태 (storage 키)
- `localStorage`: `sb_cart`(`[{id,size,qty}]`), `sb_likes`, `sb_sync_owner`(캐시가 어느 회원의 DB 데이터인지, 없으면 비로그인 데이터), `sb_customer_key`(게스트 customerKey), `sb_guest_orders`(`[{orderId, token}]`, 비회원 주문 조회용 최근 20건), 그리고 supabase-js의 세션 키(`sb-<ref>-auth-token`)
- `sessionStorage`: `sb_buynow`(바로 구매 상품), `sb_pending_order`(orderId/orderName/mode/guestToken/email — 화면 표시·재시도용일 뿐 금액 검증에 쓰지 않는다), `sb_paid_<orderId>`(승인 결과 캐시)

모든 접근은 `common.js`의 `storage` 헬퍼(try/catch 래핑)를 통한다.

### 회원 장바구니·좋아요 동기화
`localStorage`가 화면용 캐시이고, 로그인 상태(`sb_sync_owner === user.id`)면 `Cart`/`Likes`의 각 변경이 `cart_items`/`likes`에도 반영된다(`cloud()` 헬퍼, 실패 시 토스트). 페이지 진입·로그인 시 `syncUserData`가 비로그인 중 담은 것을 DB에 merge(수량 합산, 최대 99)한 뒤 DB 상태로 캐시를 교체한다. 다른 회원의 캐시는 버리고, 로그아웃 시 캐시를 비운다. 장바구니를 읽어 결정을 내리는 화면(주문서, 결제 성공의 장바구니 비우기)은 `await userDataReady` 후에 읽는다.

### 인증 (Supabase Auth)
- `login.html` + `js/login.js`: 이메일 가입(확인 메일 필수, `emailRedirectTo`=`/login.html?next=...`), 이메일 로그인, 카카오·구글 OAuth. 리다이렉트 결과는 supabase-js가 URL에서 처리하고, 세션이 생기면 `next`(같은 사이트 `*.html`만 허용)로 이동한다.
- 대시보드에서 켜지지 않은 소셜 제공자는 `/auth/v1/settings`의 `external`로 감지해 버튼을 비활성화한다.
- 가입 시 `handle_new_user` 트리거가 `profiles` 행을 만든다.

### 결제 흐름 (토스페이먼츠 결제위젯 v2)
1. **주문서** (`checkout.html` + `js/checkout.js`): `?mode=buynow`면 `sb_buynow`, 아니면 장바구니를 주문 상품으로 사용. customerKey는 회원이면 `user.id`, 게스트면 `sb_customer_key`. SDK `https://js.tosspayments.com/v2/standard` → `TossPayments(clientKey).widgets({customerKey})` → `setAmount`(화면 표시 금액) → `renderPaymentMethods`/`renderAgreement`. `setAmount`는 반드시 렌더 전에 호출. 게스트는 이메일 필수, 회원은 프로필·기본 배송지가 자동 입력되고 "기본 배송지로 저장" 시 `addresses`/`profiles`를 갱신한다.
2. **주문 생성**: 결제 버튼 → `POST /api/orders`(상품 id/size/qty + 주문자 정보만 전송, 회원은 `Authorization: Bearer <access_token>`) → 서버가 `{orderId, amount, orderName, guestToken?}` 반환 → `setAmount(서버 amount)` → `requestPayment`. 서버 금액이 화면 금액과 다르면 결제하지 않고 금액을 갱신해 다시 누르게 한다.
3. **성공** (`success.html` + `js/success.js`): `POST /api/confirm`. 성공 응답의 `order.mode`에 따라 장바구니(회원은 `cart_items`도) 또는 `sb_buynow`를 비운다(`alreadyConfirmed`면 비우지 않음). `recorded:false`면 결과를 캐시하지 않아 새로고침 시 서버가 다시 기록한다. 응답이 JSON이 아니면 "승인 서버 없음" 상태로 처리한다. **토스 API는 결제 세션 만료 등에서 HTTP 404를 JSON으로 돌려주므로 상태 코드만으로 서버 부재를 판단하면 안 된다.**
4. **실패** (`fail.html`): 쿼리의 `code`/`message`/`orderId` 표시. 주문은 `PENDING`으로 남는다(취소된 결제창 등).
5. **주문 조회** (`orders.html` + `js/orders.js`): 회원은 supabase-js로 `orders`를 직접 조회(RLS, `PENDING` 제외). 비회원은 `POST /api/orders/lookup`(주문번호 + 이메일, 또는 이 브라우저에 저장된 `guestToken`).

### 서버 (`server.js`)
의존성 없이 Supabase PostgREST(`/rest/v1`)를 service_role 키로 `fetch` 호출한다(`db()` 헬퍼, RLS 우회). 레거시 JWT 키는 `apikey`+`Authorization`, `sb_secret_` 키는 `apikey`만 보낸다. 로그인 사용자는 `/auth/v1/user`로 토큰을 검증한다. 에러는 `ApiError(status, code, message)`를 던지면 라우터가 JSON으로 변환한다.
- `POST /api/orders`: 상품·사이즈·수량 검증(같은 상품+사이즈는 합산) → DB 가격으로 금액 재계산 → `orders`(PENDING)·`order_items` 생성(items 실패 시 order 삭제). 게스트는 `guest_token`을 발급하고 sha256 해시만 저장한다.
- `POST /api/orders/lookup`: 게스트 주문(`user_id is null`)만, 주문번호 + 이메일(소문자 비교) 또는 토큰(timingSafeEqual) 일치 필수. 불일치·없음은 같은 404. IP당 10분 10회 제한(메모리).
- `POST /api/confirm`: 주문 조회 → `PAID`면 저장된 `payments.raw` 반환(멱등) → `PENDING`이 아니면 409 → 금액 불일치면 토스 호출 없이 `FAILED` + 400 `AMOUNT_MISMATCH` → 토스 승인(`Idempotency-Key` 사용) → 토스 4xx면 `FAILED`(단 `ALREADY_PROCESSED_PAYMENT` 제외) → 성공 시 `payments` upsert(`payment_key` 중복 무시) 후 `orders` `PAID`. 응답은 토스 결제 객체 + `order:{mode, orderName}` + `recorded`.
- 정적 파일 서빙에서 프로젝트 밖 경로·dot 파일(`.env`)·`server.js`·`supabase/`는 403.

### DB / RLS (`supabase/migrations/`)
- 카탈로그(`categories`/`subs`/`products`): 누구나 select, 쓰기 권한 없음.
- `profiles`/`addresses`/`cart_items`/`likes`: 본인 행만(`auth.uid()`), anon 권한 없음.
- `orders`/`order_items`/`payments`: 회원은 본인 주문만 select. insert/update/delete 권한은 anon·authenticated 모두 회수 → service_role(서버)만 쓴다. 게스트 주문은 클라이언트가 직접 볼 수 없다.
- `orders`는 `user_id` 또는 (`guest_email` + `guest_token_hash`) 중 하나가 반드시 있다(check 제약). `shipping` jsonb에 주문자/배송 정보.
- 정책에서 다른 테이블을 서브쿼리할 때 같은 이름 컬럼(예: `orders.order_id` vs `order_items.order_id`)이 있으면 반드시 `order_items.order_id`처럼 테이블명을 붙인다.

### 키
- 토스 클라이언트 키: `js/checkout.js`의 `TOSS_CLIENT_KEY` / 시크릿 키: `server.js`, 환경 변수 `TOSS_SECRET_KEY` 우선. 기본값은 둘 다 토스페이먼츠 문서용 **공개 테스트 키**(`test_gck_docs_...` / `test_gsk_docs_...`)라 저장소에 있어도 된다. 실제 키는 코드에 넣지 않는다.
- Supabase URL·publishable 키: `js/supabase.js`와 `server.js` 기본값(공개 값, RLS가 보호).
- Supabase `service_role` 키: `.env`/환경 변수 `SUPABASE_SERVICE_ROLE_KEY`에만 둔다. **클라이언트·저장소 금지**(토스 테스트 키와 달리 공개 키가 아니다). `.env`는 `.gitignore` 처리되어 있다.

## Supabase 프로젝트

요구사항·결정은 `PRD.md`가 기준이다. S1~S5 구현 완료(2026-10-20).

- 프로젝트: `stylebox` (ref `iftcupnhdudjovfbjcnk`, `ap-northeast-2`, 조직 `kkk0328's Org` = GitHub 계정 `kkk0328`). Supabase MCP 커넥터도 이 계정으로 연결되어 있어야 한다. 다른 계정(예: 예전에 쓰던 `reno-del's Org`)에 연결되어 있으면 이 프로젝트가 보이지 않으니, 작업 전에 `list_organizations`로 확인한다.
- 스키마 변경은 `supabase/migrations/*.sql` 파일로 남기고 같은 SQL을 적용한다. 상품 시드는 `supabase/seed.sql`.
- 대시보드에서 해야 하는 설정(코드로 안 됨): Authentication > URL Configuration의 Site URL·Redirect URLs에 `http://localhost:5500/**` 등록, 카카오·구글 제공자의 Client ID/Secret 등록, 이메일 확인(Confirm email) 켜기.
- Supabase MCP로 프로젝트를 만들 땐 `get_cost` → `confirm_cost` → `create_project(confirm_cost_id)` 순서가 필요하다.

## 스타일 규칙

- CSS는 `css/style.css` 한 파일. 색상은 `:root` 변수(`--red` 할인율, `--blue` 결제 버튼 등) 사용. 반응형 브레이크포인트: 1100 / 900 / 800 / 640px, 상품 그리드는 5 → 4 → 3 → 2열.
- 폰트는 jsDelivr의 Pretendard Variable.
- UI 문구와 코드 주석은 한국어.

## 토스페이먼츠 MCP

`.mcp.json`에 `tosspayments-integration-guide` MCP 서버(`@tosspayments/integration-guide-mcp`)가 등록되어 있다. 결제 연동 API·SDK 사용법이 불확실하면 이 MCP의 문서 검색 도구(`get-documents`, `document-by-id` 등)로 확인한다.
