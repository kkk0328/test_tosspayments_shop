/* =========================================================
   주문 조회
   - 회원: orders 테이블 직접 조회 (RLS 로 본인 주문만)
   - 비회원: POST /api/orders/lookup (주문번호 + 이메일 또는 발급 토큰)
   ========================================================= */
renderLayout('');
loadCatalog().catch(() => { /* 썸네일만 생략 */ });

const STATUS = {
  PAID: ['결제 완료', 'paid'],
  PENDING: ['결제 대기', ''],
  FAILED: ['결제 실패', 'failed'],
  CANCELED: ['주문 취소', 'failed'],
};
const fmtDate = s => (s ? new Date(s).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

/* 주문 카드 (회원/비회원 공통). o: { orderId, status, totalAmount, orderName, createdAt, items, payment, shipping } */
function orderCardHTML(o) {
  const [label, cls] = STATUS[o.status] || [o.status, ''];
  return `
    <article class="order-card">
      <div class="order-card-head">
        <div>
          <p class="order-date">${fmtDate(o.createdAt)}</p>
          <p class="order-no">${escapeHtml(o.orderId)}</p>
        </div>
        <span class="status ${cls}">${label}</span>
      </div>
      ${(o.items || []).map(i => {
        const p = getProduct(i.product_id);
        return `
          <div class="order-item">
            <div class="thumb">${p ? productArt(p, 'art', 160) : ''}</div>
            <div>
              ${p ? `<p class="brand">${p.brand}</p>` : ''}
              <p class="name">${escapeHtml(i.name)}</p>
              <p class="opt">${escapeHtml(i.size)} / ${i.qty}개</p>
            </div>
            <p class="item-price">${won(i.unit_price * i.qty)}</p>
          </div>`;
      }).join('')}
      <dl class="order-meta">
        <div><dt>결제 금액</dt><dd>${won(o.totalAmount)}</dd></div>
        ${o.payment ? `<div><dt>결제 수단</dt><dd>${escapeHtml(o.payment.method || '-')} · ${fmtDate(o.payment.approved_at)}</dd></div>` : ''}
        ${o.shipping ? `<div><dt>배송지</dt><dd>${escapeHtml(o.shipping.name || '')} · ${escapeHtml([o.shipping.addr1, o.shipping.addr2].filter(Boolean).join(' '))}</dd></div>` : ''}
      </dl>
    </article>`;
}

/* ---------- 회원 ---------- */
async function showMemberOrders() {
  $('#ordersTitle').textContent = '주문 내역';
  $('#memberOrders').hidden = false;
  $('#guestLookup').hidden = true;
  const list = $('#memberList');
  list.innerHTML = '<p class="drawer-empty">불러오는 중...</p>';

  await loadCatalog().catch(() => {});
  const { data, error } = await sb.from('orders')
    .select('order_id, status, total_amount, order_name, created_at, shipping, order_items(product_id, name, size, qty, unit_price), payments(method, approved_at)')
    .neq('status', 'PENDING')
    .order('created_at', { ascending: false });
  if (error) {
    list.innerHTML = `<p class="drawer-empty">주문 내역을 불러오지 못했습니다. (${escapeHtml(error.message)})</p>`;
    return;
  }
  list.innerHTML = data.length
    ? data.map(r => orderCardHTML({
        orderId: r.order_id, status: r.status, totalAmount: r.total_amount, orderName: r.order_name,
        createdAt: r.created_at, items: r.order_items,
        payment: Array.isArray(r.payments) ? r.payments[0] : r.payments, shipping: r.shipping,
      })).join('')
    : '<p class="drawer-empty">주문 내역이 없습니다.</p>';
}

/* ---------- 비회원 ---------- */
async function lookup(body) {
  const box = $('#guestResult');
  box.innerHTML = '<p class="drawer-empty">조회 중...</p>';
  try {
    const res = await fetch('/api/orders/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const isJson = (res.headers.get('Content-Type') || '').includes('application/json');
    if (!isJson) throw new Error('주문 서버(/api/orders/lookup)가 없습니다. node server.js 로 실행해 주세요.');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '주문을 찾지 못했습니다.');
    await loadCatalog().catch(() => {});
    box.innerHTML = orderCardHTML(data);
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    box.innerHTML = `<p class="drawer-empty">${escapeHtml(err.message)}</p>`;
  }
}

function showGuestLookup() {
  $('#ordersTitle').textContent = '주문 조회';
  $('#memberOrders').hidden = true;
  $('#guestLookup').hidden = false;
  $('#guestResult').innerHTML = '';

  const recent = guestOrders();
  $('#recentGuest').hidden = !recent.length;
  $('#recentList').innerHTML = recent.map(o =>
    `<button type="button" class="chip" data-guest-order="${escapeHtml(o.orderId)}">${escapeHtml(o.orderId)}</button>`).join('');

  // 결제 완료 화면에서 넘어온 경우: 이 브라우저에 토큰이 있으면 바로 조회
  const qOrderId = new URLSearchParams(location.search).get('orderId');
  if (qOrderId) {
    $('#lookupOrderId').value = qOrderId;
    const saved = recent.find(o => o.orderId === qOrderId);
    if (saved) lookup({ orderId: saved.orderId, guestToken: saved.token });
  }
}

$('#recentList').addEventListener('click', e => {
  const b = e.target.closest('[data-guest-order]');
  const saved = b && guestOrders().find(o => o.orderId === b.dataset.guestOrder);
  if (saved) lookup({ orderId: saved.orderId, guestToken: saved.token });
});

$('#lookupBtn').addEventListener('click', () => {
  const orderId = $('#lookupOrderId').value.trim();
  const email = $('#lookupEmail').value.trim();
  if (!orderId) return showToast('주문번호를 입력해 주세요.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('주문 시 입력한 이메일을 입력해 주세요.');
  lookup({ orderId, email });
});

Auth.ready.then(user => (user ? showMemberOrders() : showGuestLookup()));
Auth.onChange(user => (user ? showMemberOrders() : showGuestLookup()));
