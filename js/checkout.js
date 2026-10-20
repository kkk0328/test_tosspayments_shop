/* =========================================================
   주문서 + 토스페이먼츠 결제위젯(v2) 연동
   https://docs.tosspayments.com/guides/v2/payment-widget/integration
   - 결제 금액은 서버(/api/orders)가 DB 가격으로 계산한 값을 사용합니다.
   ========================================================= */

// 결제위젯 연동 키 (토스페이먼츠 문서용 공개 테스트 키)
// 실제 운영 시 개발자센터 > API 키 > "결제위젯 연동 키"의 클라이언트 키로 교체하세요.
const TOSS_CLIENT_KEY = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';

renderLayout('');

const isBuyNow = new URLSearchParams(location.search).get('mode') === 'buynow';
let rawItems = [];
let items = [];
let user = null;
let defaultAddressId = null;

(async function main() {
  try {
    await loadCatalog();
  } catch (err) {
    return showEmpty('상품 정보를 불러오지 못했습니다.', err.message);
  }
  user = await Auth.ready;
  if (!isBuyNow) await userDataReady; // 회원 장바구니 동기화 후 읽기

  rawItems = isBuyNow ? storage.get('sb_buynow', [], sessionStorage) : Cart.items();
  items = resolveItems(rawItems);
  if (!items.length) return showEmpty();

  renderOrder();
  setupOrderer();
  initPayment();
})();

function showEmpty(title, desc) {
  $('#checkout').hidden = true;
  $('.co-title').hidden = true;
  $('#emptyOrder').hidden = false;
  if (title) $('#emptyOrder h1').textContent = title;
  if (desc) $('#emptyOrder .desc').textContent = desc;
}

/* ---------- 주문 상품 / 금액 (화면 표시용. 실제 결제 금액은 서버가 계산) ---------- */
const displayTotal = () => items.reduce((s, i) => s + i.product.sale * i.qty, 0);

function renderOrder() {
  const qty = items.reduce((s, i) => s + i.qty, 0);
  const listPrice = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const total = displayTotal();

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

/* ---------- 주문자 정보 ---------- */
const field = id => document.getElementById(id);

async function setupOrderer() {
  if (!user) {
    // 게스트: 이메일 필수 (비회원 주문 조회용)
    $('#guestNote').hidden = false;
    $('#emailRequired').hidden = false;
    $('#guestLogin').href = 'login.html?next=' + encodeURIComponent(currentPath());
    return;
  }
  $('#saveAddrRow').hidden = false;
  field('email').value = user.email || '';

  // 회원: 프로필 + 기본 배송지 자동 입력
  const [profileRes, addrRes] = await Promise.all([
    sb.from('profiles').select('name, phone').eq('id', user.id).maybeSingle(),
    sb.from('addresses').select('*').eq('user_id', user.id)
      .order('is_default', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const profile = profileRes.data || {};
  const addr = addrRes.data;
  defaultAddressId = addr?.id || null;
  const fill = (id, v) => { if (v && !field(id).value) field(id).value = v; };
  fill('name', addr?.recipient || profile.name);
  fill('phone', addr?.phone || profile.phone);
  fill('addr1', addr?.address1);
  fill('addr2', addr?.address2);
}

function readOrderer() {
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
  if (!user && !v.email) errors.push(['email', '비회원 주문은 이메일을 입력해 주세요.']);
  else if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.push(['email', '이메일 형식을 확인해 주세요.']);
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

// 회원 배송지 저장 (주문 진행을 막지 않도록 실패는 무시)
async function saveAddress(v) {
  if (!user || !field('saveAddr').checked) return;
  const row = { user_id: user.id, recipient: v.name, phone: v.phone, address1: v.addr1, address2: v.addr2, is_default: true };
  try {
    await Promise.all([
      defaultAddressId
        ? sb.from('addresses').update(row).eq('id', defaultAddressId)
        : sb.from('addresses').insert(row),
      sb.from('profiles').update({ name: v.name, phone: v.phone }).eq('id', user.id),
    ]);
  } catch (err) {
    console.error('[address]', err);
  }
}

/* ---------- 결제 ---------- */
function randomId(len = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, n => chars[n % chars.length]).join('');
}

// 구매자 식별용 customerKey: 로그인 회원은 user.id(uuid), 게스트는 브라우저별 무작위 값 (이메일·전화번호 사용 금지)
function getCustomerKey() {
  if (user) return user.id;
  let key = storage.get('sb_customer_key', null);
  if (!key) {
    key = 'CUS_' + randomId(24);
    storage.set('sb_customer_key', key);
  }
  return key;
}

/* 서버에 주문 생성 요청 → { orderId, amount, orderName, guestToken? } */
async function createOrder(orderer) {
  const headers = { 'Content-Type': 'application/json' };
  const token = user ? await Auth.token() : null;
  if (token) headers.Authorization = 'Bearer ' + token;

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      items: rawItems.map(({ id, size, qty }) => ({ id, size, qty })),
      mode: isBuyNow ? 'buynow' : 'cart',
      orderer,
      customerKey: getCustomerKey(),
    }),
  });
  const isJson = (res.headers.get('Content-Type') || '').includes('application/json');
  if (!isJson) throw new Error('주문 서버(/api/orders)가 없습니다. node server.js 로 실행해 주세요.');
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '주문을 생성하지 못했습니다.');
  return data;
}

async function initPayment() {
  const btn = $('#payButton');
  const amount = displayTotal();

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

    // 2) 결제 금액 설정 (렌더링 전에 반드시 먼저 호출). 결제 직전 서버 금액으로 다시 설정합니다.
    await widgets.setAmount({ currency: 'KRW', value: amount });

    // 3) 결제 수단 UI + 약관 UI 렌더링
    await Promise.all([
      widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
      widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
    ]);

    btn.disabled = false;
    btn.textContent = `${won(amount)} 결제하기`;

    // 4) 주문 생성(서버 금액) → 결제 요청
    btn.addEventListener('click', async () => {
      const orderer = readOrderer();
      if (!orderer) return;

      btn.disabled = true;
      let order;
      try {
        order = await createOrder(orderer);
      } catch (err) {
        showToast(err.message);
        btn.disabled = false;
        return;
      }

      // 서버가 계산한 금액으로 위젯 금액을 맞춥니다. 화면 금액과 다르면(가격 변경) 확인 후 다시 결제하게 합니다.
      await widgets.setAmount({ currency: 'KRW', value: order.amount });
      if (order.amount !== amount) {
        $('#sumTotal').textContent = won(order.amount);
        btn.textContent = `${won(order.amount)} 결제하기`;
        btn.disabled = false;
        return showToast('상품 가격이 변경되어 결제 금액을 갱신했습니다. 확인 후 다시 결제해 주세요.');
      }

      // 결과 화면 표시·재시도용 (금액 검증은 서버가 DB로 합니다)
      storage.set('sb_pending_order', {
        orderId: order.orderId, orderName: order.orderName, mode: isBuyNow ? 'buynow' : 'cart',
        guestToken: order.guestToken || null, email: user ? null : orderer.email,
      }, sessionStorage);
      if (order.guestToken) rememberGuestOrder(order.orderId, order.guestToken);
      await saveAddress(orderer);

      try {
        await widgets.requestPayment({
          orderId: order.orderId,
          orderName: order.orderName,
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
