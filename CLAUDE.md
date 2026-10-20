# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

무신사 스타일 쇼핑몰 퍼블리싱(순수 HTML/CSS/JS, 빌드 도구·프레임워크·npm 의존성 없음)과 토스페이먼츠 결제위젯 v2 연동 데모. 브랜드명 `STYLEBOX`와 상품 브랜드는 모두 가상이다(실제 무신사 로고/브랜드를 쓰지 않는다).

## 실행

```bash
node server.js
```

http://localhost:5500 (포트는 `PORT` 환경 변수로 변경). Node 18+ 필요(전역 `fetch` 사용), 외부 패키지 없음. 빌드·린트·테스트 스크립트는 없다.

- HTML을 `file://`로 직접 열면 결제가 완료되지 않는다. `successUrl`/`failUrl`이 `location.origin` 기반이고 `/api/confirm` 서버가 필요하기 때문이다(`checkout.html`이 이 경우 경고를 띄운다).
- 이 Windows 환경에서는 Node/Git이 세션 PATH에 없을 수 있다: `C:\Program Files\nodejs\node.exe`, `C:\Program Files\Git\cmd\git.exe`.

## 아키텍처

### 스크립트 로딩 구조
모듈 번들러 없이 `<script>` 태그 순서에 의존하는 전역 스코프 방식이다. 모든 페이지가 다음 순서로 로드한다:

1. `js/products.js` — `CATEGORIES`, `PRODUCTS` 데이터와 `getProduct`, `productArt`(상품 `<img>` 생성), `photoUrl`, `photoCredit`
2. `js/common.js` — 유틸(`won`, `$`, `$$`, `storage`), `Cart`, `Likes`, 헤더/푸터 렌더(`renderLayout`), 상품 카드·모달·장바구니 드로어·토스트, 페이지 초기화 함수(`initHomePage`, `initCategoryPage`)
3. 페이지별 스크립트 — `js/checkout.js`, `js/success.js`, 또는 인라인 `initXxx()` 호출

헤더(`#header`)와 푸터(`#footer`)는 HTML에 마크업이 없고 `renderLayout(activeKey)`가 주입한다. 모달·드로어·토스트도 `mountOverlays()`가 body 끝에 동적으로 추가한다.

### 카테고리 페이지
`tops.html` / `shoes.html` / `pants.html`은 `<body data-category="...">` 값만 다른 동일 템플릿이다. 실제 동작은 `initCategoryPage()`가 `CATEGORIES[key]`(세부 카테고리 `subs` 포함)와 `PRODUCTS`의 `cat`/`sub` 필드로 처리한다. 카테고리나 세부 카테고리를 추가하면 `CATEGORIES`와 상품의 `sub` 값을 함께 맞춰야 한다.

### 상품 데이터와 이미지
- `sale`(할인가, 100원 단위 반올림)과 `sizes`는 `products.js` 하단에서 파생 계산된다. 직접 넣지 않는다.
- 이미지는 Unsplash CDN 핫링크다. `photo`는 `images.unsplash.com/photo-<id>`의 id, `credit`은 `[작가명, Unsplash 사진 페이지 ID]`. 5:6 비율 crop은 `photoUrl()`의 쿼리 파라미터로 처리한다. 작가 표기는 상품 모달(`photoCredit`)과 푸터에 노출된다.

### 클라이언트 상태 (storage 키)
- `localStorage`: `sb_cart`(`[{id,size,qty}]`), `sb_likes`, `sb_customer_key`
- `sessionStorage`: `sb_buynow`(바로 구매 상품), `sb_pending_order`(결제 요청 시 저장한 orderId/amount/mode), `sb_paid_<orderId>`(승인 결과, 새로고침 시 재승인 방지)

모든 접근은 `common.js`의 `storage` 헬퍼(try/catch 래핑)를 통한다.

### 결제 흐름 (토스페이먼츠 결제위젯 v2)
1. **주문서** (`checkout.html` + `js/checkout.js`): `?mode=buynow`면 `sb_buynow`, 아니면 장바구니를 주문 상품으로 사용. SDK `https://js.tosspayments.com/v2/standard` → `TossPayments(clientKey).widgets({customerKey})` → `setAmount` → `renderPaymentMethods`/`renderAgreement` 순서. `setAmount`는 반드시 렌더 전에 호출.
2. **결제 요청**: `requestPayment` 직전에 `sb_pending_order`에 orderId·amount를 저장한다(운영에서는 서버 DB가 할 일).
3. **성공** (`success.html` + `js/success.js`): 쿼리의 `amount`와 `sb_pending_order.amount`를 대조한 뒤 `POST /api/confirm`. 승인 성공 시 mode에 따라 장바구니 또는 `sb_buynow`를 비운다. 응답이 JSON이 아니면 "승인 서버 없음" 상태로 처리한다. **토스 API는 결제 세션 만료 등에서 HTTP 404를 JSON으로 돌려주므로 상태 코드만으로 서버 부재를 판단하면 안 된다.**
4. **승인 서버** (`server.js`): `/api/confirm`이 시크릿 키로 Basic 인증(`base64(secretKey + ":")`)을 만들어 `https://api.tosspayments.com/v1/payments/confirm`을 호출하고 응답 상태/본문을 그대로 전달한다. 그 외 요청은 정적 파일 서빙이며, 프로젝트 밖 경로·dot 파일·`server.js` 자체는 403으로 막는다.
5. **실패** (`fail.html`): 쿼리의 `code`/`message`/`orderId` 표시.

### 키
- 클라이언트 키: `js/checkout.js`의 `TOSS_CLIENT_KEY`
- 시크릿 키: `server.js`, 환경 변수 `TOSS_SECRET_KEY` 우선
- 기본값은 둘 다 토스페이먼츠 문서용 **공개 테스트 키**(`test_gck_docs_...` / `test_gsk_docs_...`)라 저장소에 있어도 된다. 실제 키는 코드에 넣지 않는다.

## 스타일 규칙

- CSS는 `css/style.css` 한 파일. 색상은 `:root` 변수(`--red` 할인율, `--blue` 결제 버튼 등) 사용. 반응형 브레이크포인트: 1100 / 900 / 800 / 640px, 상품 그리드는 5 → 4 → 3 → 2열.
- 폰트는 jsDelivr의 Pretendard Variable.
- UI 문구와 코드 주석은 한국어.

## 토스페이먼츠 MCP

`.mcp.json`에 `tosspayments-integration-guide` MCP 서버(`@tosspayments/integration-guide-mcp`)가 등록되어 있다. 결제 연동 API·SDK 사용법이 불확실하면 이 MCP의 문서 검색 도구(`get-documents`, `document-by-id` 등)로 확인한다.
