/* =========================================================
   결제 성공 리다이렉트 처리
   successUrl 로 paymentKey, orderId, amount, paymentType 이 전달됩니다.
   → 서버(/api/confirm)가 DB 주문 금액과 대조한 뒤 결제 승인 API를 호출해야 결제가 완료됩니다.
   ========================================================= */
renderLayout('');

const params = new URLSearchParams(location.search);
const paymentKey = params.get('paymentKey');
const orderId = params.get('orderId');
const amount = Number(params.get('amount'));

const setState = (state, title, desc) => {
  const icon = $('#resultIcon');
  icon.className = 'icon' + (state === 'ok' ? '' : ' ' + state);
  if (state === 'fail') icon.innerHTML = ICON.close;
  $('#resultTitle').textContent = title;
  $('#resultDesc').textContent = desc;
};

const fill = data => {
  $('#rOrderId').textContent = data.orderId || orderId || '-';
  $('#rOrderName').textContent = data.orderName || data.order?.orderName || '-';
  $('#rMethod').textContent = data.method || '-';
  $('#rAmount').textContent = data.totalAmount != null ? won(data.totalAmount) : (amount ? won(amount) : '-');
  $('#rPaymentKey').textContent = data.paymentKey || paymentKey || '-';
};

// 주문 조회 링크 (회원: 주문 내역, 비회원: 발급된 토큰으로 바로 조회)
const showOrderLink = pending => {
  const link = $('#orderLink');
  if (!link) return;
  link.hidden = false;
  link.href = Auth.user ? 'orders.html' : `orders.html?orderId=${encodeURIComponent(orderId)}`;
  if (!Auth.user && pending?.email) {
    $('#resultDesc').textContent += ` 비회원 주문은 주문번호와 이메일(${pending.email})로 조회할 수 있습니다.`;
  }
};

const finishOrder = async mode => {
  if (mode === 'buynow') storage.remove('sb_buynow', sessionStorage);
  else {
    await userDataReady; // 회원이면 cart_items 도 함께 비움
    await Cart.clear();
  }
  storage.remove('sb_pending_order', sessionStorage);
};

(async function confirmPayment() {
  await Auth.ready;
  const pending = storage.get('sb_pending_order', null, sessionStorage);

  // 새로고침 등으로 다시 진입한 경우: 이미 승인된 결과 표시
  const done = storage.get('sb_paid_' + orderId, null, sessionStorage);
  if (done) {
    fill(done);
    showOrderLink(pending);
    return setState('ok', '결제가 완료되었습니다', '주문해 주셔서 감사합니다.');
  }

  fill({ orderName: pending?.orderId === orderId ? pending.orderName : null });

  if (!paymentKey || !orderId || !amount) {
    return setState('fail', '잘못된 접근입니다', '결제 정보가 올바르지 않습니다.');
  }

  // 결제 승인 요청 (금액 대조·시크릿 키 사용은 서버에서만)
  try {
    const res = await fetch('/api/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    // 토스 API 는 결제 세션 만료 등에서 HTTP 404 를 JSON 으로 돌려주므로, 서버 부재는 Content-Type 으로 판단합니다.
    const isJson = (res.headers.get('Content-Type') || '').includes('application/json');
    if (!isJson) {
      // 정적 호스팅 등 승인 서버(/api/confirm)가 없는 환경
      return setState('wait', '결제 인증이 완료되었습니다',
        '승인 서버(/api/confirm)가 없어 최종 승인은 진행되지 않았습니다. node server.js 로 실행하면 승인까지 완료됩니다.');
    }

    const data = await res.json();
    if (!res.ok) {
      return setState('fail', '결제 승인에 실패했습니다', `${data.message || '알 수 없는 오류'} (${data.code || res.status})`);
    }

    // DB 기록이 실패한 경우(recorded=false)는 캐시하지 않아 새로고침 시 서버가 다시 기록합니다. (승인은 멱등)
    if (data.recorded !== false) storage.set('sb_paid_' + orderId, data, sessionStorage);
    if (!data.alreadyConfirmed) await finishOrder(data.order?.mode || pending?.mode);
    fill(data);
    showOrderLink(pending);
    updateCartCount();
    setState('ok', '결제가 완료되었습니다', '주문해 주셔서 감사합니다.');
  } catch (err) {
    console.error(err);
    setState('fail', '결제 승인 중 오류가 발생했습니다', '네트워크 상태를 확인해 주세요.');
  }
})();
