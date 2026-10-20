/* =========================================================
   주문서 + 토스페이먼츠 결제위젯(v2) 연동
   https://docs.tosspayments.com/guides/v2/payment-widget/integration
   ========================================================= */

// 결제위젯 연동 키 (토스페이먼츠 문서용 공개 테스트 키)
// 실제 운영 시 개발자센터 > API 키 > "결제위젯 연동 키"의 클라이언트 키로 교체하세요.
const TOSS_CLIENT_KEY = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';

renderLayout('');

const isBuyNow = new URLSearchParams(location.search).get('mode') === 'buynow';
const rawItems = isBuyNow ? storage.get('sb_buynow', [], sessionStorage) : Cart.items();
const items = resolveItems(rawItems);

if (!items.length) {
  $('#checkout').hidden = true;
  $('.co-title').hidden = true;
  $('#emptyOrder').hidden = false;
} else {
  renderOrder();
  initPayment();
}

/* ---------- 주문 상품 / 금액 ---------- */
function renderOrder() {
  const qty = items.reduce((s, i) => s + i.qty, 0);
  const listPrice = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const total = items.reduce((s, i) => s + i.product.sale * i.qty, 0);

  $('#itemCount').textContent = `총 ${qty}개`;
  $('#orderItems').innerHTML = items.map(i => `
    <div class="order-item">
      <div class="thumb">${productArt(i.product, 'art', 160)}</div>
      <div>
        <p class="brand">${i.product.brand}</p>
        <p class="name">${i.product.name}</p>
        <p class="opt">${i.size} / ${i.qty}개</p>
      </div>
      <p class="item-price">${won(i.product.sale * i.qty)}</p>
    </div>`).join('');

  $('#sumPrice').textContent = won(listPrice);
  $('#sumDiscount').textContent = listPrice - total ? '-' + won(listPrice - total) : '0원';
  $('#sumTotal').textContent = won(total);
}

/* ---------- 주문자 정보 검증 ---------- */
function readOrderer() {
  const field = id => document.getElementById(id);
  const v = {
    name: field('name').value.trim(),
    phone: field('phone').value.replace(/\D/g, ''),
    email: field('email').value.trim(),
    addr1: field('addr1').value.trim(),
    addr2: field('addr2').value.trim(),
  };
  const errors = [];
  if (!v.name) errors.push(['name', '이름을 입력해 주세요.']);
  if (!/^01\d{8,9}$/.test(v.phone)) errors.push(['phone', '휴대폰 번호를 정확히 입력해 주세요.']);
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.push(['email', '이메일 형식을 확인해 주세요.']);
  if (!v.addr1) errors.push(['addr1', '배송지를 입력해 주세요.']);

  $$('#ordererForm .input').forEach(el => el.classList.remove('error'));
  errors.forEach(([k]) => field(k).classList.add('error'));
  if (errors.length) {
    field(errors[0][0]).focus();
    showToast(errors[0][1]);
    return null;
  }
  return v;
}

/* ---------- 결제 ---------- */
function randomId(len = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, n => chars[n % chars.length]).join('');
}

// 구매자 식별용 customerKey: 추측하기 어려운 무작위 값이어야 합니다. (이메일·전화번호 사용 금지)
function getCustomerKey() {
  let key = storage.get('sb_customer_key', null);
  if (!key) {
    key = 'CUS_' + randomId(24);
    storage.set('sb_customer_key', key);
  }
  return key;
}

async function initPayment() {
  const btn = $('#payButton');
  const amount = items.reduce((s, i) => s + i.product.sale * i.qty, 0);

  if (location.protocol === 'file:') $('#protocolAlert').hidden = false;

  if (typeof TossPayments !== 'function') {
    btn.textContent = '결제 모듈을 불러오지 못했습니다';
    showToast('토스페이먼츠 SDK 로드에 실패했습니다. 네트워크를 확인해 주세요.');
    return;
  }

  try {
    // 1) SDK 초기화 & 결제위젯 인스턴스 생성
    const tossPayments = TossPayments(TOSS_CLIENT_KEY);
    const widgets = tossPayments.widgets({ customerKey: getCustomerKey() });

    // 2) 결제 금액 설정 (렌더링 전에 반드시 먼저 호출)
    await widgets.setAmount({ currency: 'KRW', value: amount });

    // 3) 결제 수단 UI + 약관 UI 렌더링
    await Promise.all([
      widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
      widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
    ]);

    btn.disabled = false;
    btn.textContent = `${won(amount)} 결제하기`;

    // 4) 결제 요청
    btn.addEventListener('click', async () => {
      const orderer = readOrderer();
      if (!orderer) return;

      const orderId = 'ORD_' + Date.now() + '_' + randomId(8);
      const first = items[0].product.name;
      const orderName = items.length > 1 ? `${first} 외 ${items.length - 1}건` : first;

      // 결제 성공 페이지에서 금액 위변조를 확인하기 위해 주문 정보를 저장합니다.
      // (운영 환경에서는 결제 요청 전에 서버 DB에 orderId·amount 를 저장하세요.)
      storage.set('sb_pending_order', {
        orderId, amount, orderName, mode: isBuyNow ? 'buynow' : 'cart',
        items: rawItems, orderer, createdAt: Date.now(),
      }, sessionStorage);

      btn.disabled = true;
      try {
        await widgets.requestPayment({
          orderId,
          orderName,
          successUrl: location.origin + '/success.html',
          failUrl: location.origin + '/fail.html',
          customerName: orderer.name,
          customerEmail: orderer.email || undefined,
          customerMobilePhone: orderer.phone,
        });
      } catch (err) {
        // 사용자가 결제창을 닫는 등 결제 요청 단계의 에러
        showToast(err.message || '결제 요청 중 오류가 발생했습니다.');
        btn.disabled = false;
      }
    });
  } catch (err) {
    console.error(err);
    btn.textContent = '결제 수단을 불러오지 못했습니다';
    showToast(err.message || '결제위젯 초기화에 실패했습니다.');
  }
}
