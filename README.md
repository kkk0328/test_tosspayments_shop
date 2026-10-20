# STYLEBOX - 토스페이먼츠 연동 쇼핑몰 퍼블리싱

무신사 스타일의 쇼핑몰 퍼블리싱(HTML/CSS/JS) + 토스페이먼츠 결제위젯 v2 연동 데모입니다.

## 페이지
| 파일 | 설명 |
| --- | --- |
| `index.html` | 홈 (배너, 카테고리, 실시간 랭킹, 할인 상품, 검색 결과) |
| `tops.html` / `shoes.html` / `pants.html` | 상의 · 신발 · 바지 상품 목록 (세부 카테고리, 정렬) |
| `checkout.html` | 주문서 + 토스페이먼츠 결제위젯 |
| `success.html` / `fail.html` | 결제 성공(승인 요청) · 실패 |

## 실행
결제 후 리다이렉트와 결제 승인 API 호출을 위해 로컬 서버로 실행해야 합니다. (Node.js 18+, 외부 패키지 없음)

```bash
node server.js
```

http://localhost:5500 접속

## 결제 흐름
1. `checkout.html` 에서 결제위젯 렌더링 (`js/checkout.js`)
2. `requestPayment()` → 토스 결제창 → `success.html?paymentKey&orderId&amount`
3. `js/success.js` 에서 금액 검증 후 `POST /api/confirm`
4. `server.js` 가 시크릿 키로 `https://api.tosspayments.com/v1/payments/confirm` 호출

## 키 설정
기본값은 토스페이먼츠 문서용 **공개 테스트 키**입니다. 실제 키로 바꿀 때:
- 클라이언트 키: `js/checkout.js` 의 `TOSS_CLIENT_KEY`
- 시크릿 키: 환경 변수 `TOSS_SECRET_KEY` (코드에 커밋하지 마세요)

## 이미지
상품 사진은 [Unsplash](https://unsplash.com/license) 무료 이미지입니다. 작가 정보는 `js/products.js` 와 상품 상세 모달에 표기되어 있습니다.
