# PRD: STYLEBOX Supabase 연동

## 1. 개요

### 배경
STYLEBOX는 순수 HTML/CSS/JS로 만든 쇼핑몰 데모이며 토스페이먼츠 결제위젯 v2가 연동되어 있다. 현재 상품은 `js/products.js`에 하드코딩되어 있고, 장바구니·좋아요·주문 정보는 브라우저 저장소(`localStorage`/`sessionStorage`)에만 있다. 결제 승인 결과도 서버에 남지 않는다.

### 목표
- Supabase(PostgreSQL + Auth)를 도입해 상품·사용자·주문·결제 데이터를 서버에 영속화한다.
- 결제 금액 검증과 승인 기록을 서버 측으로 옮겨 위변조 가능성을 없앤다.
- 기존의 "빌드 도구·프레임워크·npm 의존성 없음" 구조를 유지한다.

### 비목표
- 프레임워크/번들러 도입
- 실제 운영 배포, 실결제 전환
- 관리자 페이지 및 재고·리뷰 기능 (3단계 이후 별도 PRD)

## 2. 사용자와 시나리오

| 사용자 | 시나리오 |
|---|---|
| 비로그인 방문자 | 상품 탐색, 장바구니/좋아요 사용(브라우저 저장), 로그인 유도 |
| 회원 | 가입/로그인, 어느 기기에서나 동일한 장바구니·좋아요, 결제, 주문 내역 확인 |
| 운영자(개발자) | Supabase 대시보드에서 상품·주문 확인, 마이그레이션 SQL로 스키마 관리 |

## 3. 범위

### 3.1 필수 기능 (1단계)

| ID | 기능 | 설명 | 수용 기준 |
|---|---|---|---|
| F-01 | 상품 데이터 DB화 | `categories`, `products` 테이블 구성. 홈/카테고리/상품 모달은 DB 조회 | 기존 화면과 동일하게 상품이 노출된다. `products.js` 하드코딩 데이터가 제거된다 |
| F-02 | 인증 | Supabase Auth 이메일 가입/로그인/로그아웃 + 소셜 로그인(카카오, 구글). **이메일 인증(가입 확인 메일) 사용**. 헤더에 로그인 상태 표시 | 가입 후 확인 메일의 링크를 눌러야 로그인된다. 소셜 로그인 후 세션 유지(새로고침), 로그아웃 시 세션 제거 |
| F-03 | customerKey 연동 | 로그인 시 `user.id`(uuid)를 토스 `customerKey`로 사용. 비로그인(게스트)은 기존 `sb_customer_key` 유지 | 로그인 사용자의 결제위젯이 `user.id` 기반으로 초기화된다 |
| F-04 | 주문 생성 | 결제 요청 직전 `orders`(`PENDING`)와 `order_items` 생성. 금액은 서버가 DB 가격으로 재계산. **게스트도 가능** | 클라이언트가 보낸 금액이 아닌 서버 계산 금액으로 `setAmount`/`requestPayment`가 수행된다 |
| F-04a | 게스트 결제 | 비로그인도 주문 가능. 주문자 이메일/연락처를 받고, 서버가 `guest_token`을 발급해 비회원 주문 조회에 사용 | 게스트 결제가 완료되고, 주문번호+이메일(또는 token)로만 주문을 조회할 수 있다. 로그인 시 같은 이메일의 게스트 주문은 본인 주문으로 연결 가능(선택) |
| F-05 | 결제 승인 기록 | `/api/confirm` 성공 시 `payments` 저장, `orders.status`를 `PAID`로 변경 | 승인 후 DB에 paymentKey·method·approvedAt·금액이 남는다. 새로고침해도 중복 승인되지 않는다 |
| F-06 | 금액 위변조 검증 | `server.js`가 토스 confirm 호출 전에 DB 주문 금액과 쿼리 `amount`를 대조 | 금액 불일치 시 토스 호출 없이 400으로 거절하고 주문은 `FAILED` 처리 |
| F-07 | RLS 정책 | 모든 테이블 RLS 활성화 | 회원은 본인 `orders`/`cart_items`/`likes`만 조회·수정. 게스트 주문(`user_id` null)은 anon이 직접 조회 불가. `orders`/`order_items` insert, `orders.status` 변경, `payments` insert는 service_role만 가능 |

### 3.2 사용자 데이터 이전 (2단계)

| ID | 기능 | 설명 |
|---|---|---|
| F-08 | 장바구니 DB화 | `cart_items`. 비로그인은 localStorage 유지, 로그인 시 merge |
| F-09 | 좋아요 DB화 | `likes`. 로그인 시 localStorage와 merge |
| F-10 | 프로필/배송지 | `profiles`, `addresses`. 주문서 기본 배송지 자동 입력 |
| F-11 | 주문 내역 페이지 | `orders.html`: 내 주문 목록·상세·결제 상태 |

### 3.3 확장 (3단계, 별도 PRD 대상)
결제 취소/환불, 토스 웹훅 수신, 재고 관리, 리뷰/별점, Storage 상품 이미지, 관리자 기능.

## 4. 데이터 모델

```
categories(key pk, name, sort)
  └─ subs(id pk, category_key fk, key, name, sort)
products(id pk, category_key fk, sub_key, brand, name, price, photo, credit_author, credit_id, created_at)
profiles(id pk = auth.users.id, name, phone, created_at)
addresses(id pk, user_id fk, recipient, phone, zip, address1, address2, is_default)
cart_items(id pk, user_id fk, product_id fk, size, qty, unique(user_id, product_id, size))
likes(user_id fk, product_id fk, pk(user_id, product_id))
orders(id pk, order_id unique /* 토스 orderId */, user_id fk null /* 게스트는 null */, guest_email, guest_phone, guest_token /* 서버 발급, 해시 저장 */, customer_key, status, total_amount, order_name, mode, created_at)
order_items(id pk, order_id fk, product_id fk, name, size, qty, unit_price)
payments(id pk, order_id fk unique, payment_key unique, method, amount, approved_at, raw jsonb)
```

- `status`: `PENDING` → `PAID` | `FAILED` | `CANCELED`
- `sale`(할인가), `sizes`는 기존과 같이 파생 계산한다. DB에는 정가(`price`)와 할인율 관련 원본 값만 저장하고, 계산 로직은 클라이언트와 서버가 동일하게 공유한다. (서버 금액 재계산용 로직은 `server.js`에 동일 규칙으로 구현)
- 게스트 결제를 허용하므로 `orders.user_id`는 nullable이다. 게스트 주문은 `guest_email`/`guest_token`으로만 조회하며, 클라이언트(anon)는 `orders`를 직접 조회하지 못하고 서버 API를 통해서만 접근한다.

## 5. 아키텍처 변경

### 5.1 클라이언트
- `@supabase/supabase-js`를 CDN `<script>`로 로드한다. 버전은 고정한다.
- `js/supabase.js`(client 초기화)를 신규 추가하고 `products.js` 앞에 로드한다.
  로드 순서: `supabase.js` → `products.js` → `common.js` → 페이지 스크립트.
- 상품 조회가 비동기가 되므로 `initHomePage`/`initCategoryPage` 등 초기화 함수를 async로 바꾸고, 상품 로드 후 렌더한다.
- 로그인 UI는 헤더(`renderLayout`)에 추가하고 별도 `login.html`을 둔다.

### 5.2 서버 (`server.js`)
- 외부 패키지 없이 Supabase PostgREST를 `fetch`로 호출한다. (의존성 0 유지)
- 신규/변경 엔드포인트

| 엔드포인트 | 역할 |
|---|---|
| `POST /api/orders` | (로그인 시) JWT 검증, (게스트) 주문자 이메일/연락처 검증 → DB 가격으로 금액 재계산 → `orders`/`order_items` 생성 → `orderId`, `amount`(게스트는 `guest_token` 추가) 반환 |
| `POST /api/orders/lookup` | 게스트 주문 조회: 주문번호 + 이메일(또는 `guest_token`) 검증 후 주문 반환 |
| `POST /api/confirm` (변경) | DB 주문 금액 대조 → 토스 confirm 호출 → 성공 시 `payments` 저장, `orders` `PAID` |

- 토스 `api.tosspayments.com` 호출은 계속 서버에서만 한다. 브라우저는 서버 API만 호출한다.
- JWT 검증은 Supabase Auth의 `/auth/v1/user`에 사용자 토큰을 보내 확인한다.

### 5.3 키 관리

| 키 | 위치 | 비고 |
|---|---|---|
| Supabase URL / anon(publishable) 키 | `js/supabase.js` | 공개 가능. RLS가 보호. URL은 `https://shtygsunjjouulfpqpdw.supabase.co` |
| Supabase `service_role` 키 | `server.js` 환경 변수 `SUPABASE_SERVICE_ROLE_KEY` | **절대 클라이언트·저장소에 두지 않는다.** `.env`는 `.gitignore` 처리 |
| 토스 클라이언트 키 | `js/checkout.js` | 기존 공개 테스트 키 유지 |
| 토스 시크릿 키 | `server.js` `TOSS_SECRET_KEY` | 기존 유지 |

### 5.4 결제 흐름 (변경 후)
1. 주문서: 로그인 사용자는 토큰 첨부, 게스트는 주문자 이메일/연락처 입력 → `POST /api/orders`(상품 id/size/qty만 전송) → 서버가 `orderId`·`amount`(게스트는 `guest_token` 포함) 응답
2. 위젯: `setAmount(서버 amount)` → 렌더 → `requestPayment({ orderId, ... })`. 더 이상 `sb_pending_order`에 의존하지 않는다.
3. 성공 페이지: 쿼리(`paymentKey`, `orderId`, `amount`)로 `POST /api/confirm`
4. 서버: DB 주문 조회 → 금액 대조 → 토스 confirm → 성공 시 `payments` 저장 + `PAID` 전환(이미 `PAID`면 기존 결과 반환, 멱등)
5. 성공 시 클라이언트가 장바구니(또는 `sb_buynow`)를 비운다. 로그인 사용자는 `cart_items`도 삭제한다.
6. 실패: `fail.html`에서 오류 표시, 서버는 필요 시 주문을 `FAILED`로 갱신

## 6. 권장 진행 순서

| 단계 | 작업 | 산출물 | 완료 기준 |
|---|---|---|---|
| S1 | Supabase **신규 프로젝트 생성**, 스키마·RLS 마이그레이션, 시드 | `supabase/migrations/*.sql`, `supabase/seed.sql` | 테이블 생성, RLS로 타인 데이터 접근 차단 확인 |
| S2 | 상품 DB 전환 | `js/supabase.js`, `products.js` 개편, 페이지 초기화 async화 | 홈/카테고리/모달 정상, 하드코딩 데이터 제거 |
| S3 | Auth(이메일 인증 + 카카오/구글 소셜) + customerKey 연동 | `login.html`, 헤더 로그인 UI, `checkout.js` 수정, Auth 리다이렉트 URL 설정 | 확인 메일 인증 후 로그인, 소셜 로그인, 로그아웃, 로그인 사용자 `customerKey=user.id` |
| S4 | 주문/결제 기록 (회원 + 게스트) | `server.js`의 `/api/orders`, `/api/orders/lookup`, `/api/confirm` 확장, `checkout.js`/`success.js` 수정, 게스트 주문자 정보 입력란 | 회원·게스트 모두 결제 완료 후 `orders`=`PAID`, `payments` 레코드 존재, 금액 변조 시 거절, 게스트 주문 조회 가능 |
| S5 | 장바구니/좋아요 이전, 주문 내역 | `cart_items`/`likes` 동기화, `orders.html` | 기기 간 동일 상태, 주문 내역 조회 |

각 단계는 독립적으로 동작하는 상태로 커밋한다. S1~S4가 필수(1단계), S5가 2단계다.

## 7. 비기능 요구사항

- **보안**: service_role 키 노출 금지. 모든 쓰기 경로에 RLS 또는 서버 검증 적용. 서버는 클라이언트가 보낸 금액·가격을 신뢰하지 않는다.
- **멱등성**: `/api/confirm` 재호출·새로고침 시 중복 승인/중복 기록이 없어야 한다. (`payments.payment_key` unique, `orders.status` 체크)
- **호환성**: 빌드 도구 없음, 전역 스크립트 방식 유지. Node 18+ 전역 `fetch` 사용.
- **오프라인/미설정 대응**: Supabase 키가 없거나 조회 실패 시 화면에 오류 안내를 표시한다. (조용히 빈 화면이 되지 않게)
- **기존 규칙 준수**: UI 문구·코드 주석은 한국어, CSS는 `css/style.css` 단일 파일.

## 8. 결정 사항

1. Supabase 프로젝트는 **신규 생성**한다. → 생성 완료 (2026-10-20)
   - 이름 `stylebox`, ref `shtygsunjjouulfpqpdw`, 리전 `ap-northeast-2`(서울), 조직 `reno-del's Org`, 비용 월 $0
   - 프로젝트 URL: `https://shtygsunjjouulfpqpdw.supabase.co`
   - 기존 `toss_test`(시드니 리전, 빈 프로젝트)는 사용하지 않는다.
2. **게스트 결제를 허용**한다. (`orders.user_id` nullable, `guest_token`으로 비회원 주문 조회)
3. **이메일 인증(가입 확인 메일)을 켠다.**
4. **소셜 로그인을 포함**한다. 제공자는 카카오·구글을 기본으로 한다.

### 남은 확인 사항
- 소셜 제공자별 OAuth 앱(카카오 개발자센터, Google Cloud Console)은 사용자가 직접 만들어 Client ID/Secret을 Supabase 대시보드에 등록해야 한다. (코드로 대신할 수 없음)
- Supabase 기본 메일 발송은 시간당 발송 제한이 낮다. 데모 규모를 넘으면 SMTP 연동이 필요하다.

## 9. 리스크

| 리스크 | 대응 |
|---|---|
| 상품 조회가 비동기화되며 `common.js`의 동기 `getProduct` 호출부가 깨짐 | 상품 캐시를 앱 시작 시 한 번 로드하고 `getProduct`는 캐시에서 동기 조회하도록 유지 |
| 클라이언트 할인가 계산과 서버 재계산 결과 불일치 | 계산 규칙(100원 단위 반올림)을 한 곳에 명세하고 양쪽에 동일 구현, 불일치 테스트 케이스 작성 |
| 결제 성공 후 서버 기록 실패(승인은 됐는데 DB 오류) | `payments` 저장 실패 시 로그를 남기고 재시도 가능하게 `confirm` 멱등 처리. 근본 대응은 3단계 웹훅 |
| 게스트 주문 조회가 주문번호 추측으로 노출됨 | 주문번호 단독 조회 금지. 이메일 또는 `guest_token` 일치 필수, `guest_token`은 해시로 저장, 조회 API에 시도 횟수 제한 |
| 소셜 로그인 리다이렉트 URL 불일치 (`localhost:5500` 등) | Supabase Auth의 Site URL / Redirect URLs에 개발·운영 주소를 등록 |
| service_role 키 유출 | `.env` + `.gitignore`, 커밋 전 키 문자열 검색 |

## 10. 완료 정의 (1단계)

- [ ] 상품이 DB에서 로드되고 기존 화면과 동일하게 동작한다
- [ ] 이메일 인증 가입, 소셜 로그인, 로그아웃이 동작한다
- [ ] 게스트 결제가 완료되고 주문번호+이메일로 조회된다
- [ ] 테스트 결제 완료 후 `orders.status=PAID`, `payments`에 승인 정보가 저장된다
- [ ] 금액을 변조한 요청은 서버에서 거절된다
- [ ] 다른 사용자의 주문/장바구니를 조회할 수 없다 (RLS 확인)
- [ ] service_role 키가 저장소와 클라이언트 번들에 없다
- [ ] CLAUDE.md의 아키텍처/키/storage 항목이 변경 내용에 맞게 갱신되었다
