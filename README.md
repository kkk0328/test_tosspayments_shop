# STYLEBOX - 토스페이먼츠 연동 쇼핑몰 퍼블리싱

무신사 스타일의 쇼핑몰 퍼블리싱(HTML/CSS/JS) + 토스페이먼츠 결제위젯 v2 연동 데모입니다.

## 페이지
| 파일 | 설명 |
| --- | --- |
| `index.html` | 홈 (배너, 카테고리, 실시간 랭킹, 할인 상품, 검색 결과) |
| `tops.html` / `shoes.html` / `pants.html` | 상의 · 신발 · 바지 상품 목록 (세부 카테고리, 정렬) |
| `checkout.html` | 주문서 + 토스페이먼츠 결제위젯 |
| `success.html` / `fail.html` | 결제 성공(승인 요청) · 실패 |
| `login.html` | 이메일 가입/로그인(확인 메일 인증), 카카오·구글 소셜 로그인 |
| `orders.html` | 회원 주문 내역 · 비회원 주문 조회 |

## 실행
상품·회원 데이터는 Supabase(`stylebox` 프로젝트)에 있습니다. 주문/결제 API를 쓰려면 service_role 키가 필요합니다.

1. `.env.example` 을 `.env` 로 복사하고 `SUPABASE_SERVICE_ROLE_KEY` 입력 (Supabase 대시보드 > Project Settings > API Keys)
2. 서버 실행 (Node.js 18+, 외부 패키지 없음)

```bash
node server.js
```

http://localhost:5500 접속

DB 스키마는 `supabase/migrations/`, 상품 시드는 `supabase/seed.sql` 입니다.

## 결제 흐름
1. `checkout.html` 에서 결제위젯 렌더링 (`js/checkout.js`)
2. 결제 버튼 → `POST /api/orders` : 서버가 DB 가격으로 금액을 계산해 주문(PENDING) 생성
3. 서버 금액으로 `setAmount` → `requestPayment()` → 토스 결제창 → `success.html?paymentKey&orderId&amount`
4. `POST /api/confirm` : 서버가 DB 주문 금액과 대조 → 토스 승인 API 호출 → `payments` 저장, 주문 PAID

## 키 설정
기본값은 토스페이먼츠 문서용 **공개 테스트 키**입니다. 실제 키로 바꿀 때:
- 클라이언트 키: `js/checkout.js` 의 `TOSS_CLIENT_KEY`
- 시크릿 키: 환경 변수 `TOSS_SECRET_KEY` (코드에 커밋하지 마세요)
- Supabase service_role 키: `.env` 의 `SUPABASE_SERVICE_ROLE_KEY` (절대 커밋·클라이언트 노출 금지)

## 이미지
상품 사진은 [Unsplash](https://unsplash.com/license) 무료 이미지입니다. 작가 정보는 DB `products` 테이블과 상품 상세 모달에 표기되어 있습니다.
