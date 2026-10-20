/* =========================================================
   결제 성공 리다이렉트 처리
   successUrl 로 paymentKey, orderId, amount, paymentType 이 전달됩니다.
   → 금액 검증 후 서버(/api/confirm)에서 결제 승인 API를 호출해야 결제가 완료됩니다.
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
  $('#rOrderName').textContent = data.orderName || '-';
  $('#rMethod').textContent = data.method || '-';
  $('#rAmount').textContent = data.totalAmount != null ? won(data.totalAmount) : (amount ? won(amount) : '-');
  $('#rPaymentKey').textContent = data.paymentKey || paymentKey || '-';
};

const finishOrder = pending => {
  if (pending.mode === 'buynow') storage.remove('sb_buynow', sessionStorage);
  else Cart.clear();
  storage.remove('sb_pending_order', sessionStorage);
};

(async function confirmPayment() {
  // 새로고침 등으로 다시 진입한 경우: 이미 승인된 결과 표시
  const done = storage.get('sb_paid_' + orderId, null, sessionStorage);
  if (done) {
    fill(done);
    return setState('ok', '결제가 완료되었습니다', '주문해 주셔서 감사합니다.');
  }

  const pending = storage.get('sb_pending_order', null, sessionStorage);
  fill({ orderName: pending?.orderName });

  if (!paymentKey || !orderId || !amount) {
    return setState('fail', '잘못된 접근입니다', '결제 정보가 올바르지 않습니다.');
  }

  // 1) 금액 검증: 결제 요청 시 저장한 금액과 리다이렉트로 받은 금액이 같아야 합니다.
  if (!pending || pending.orderId !== orderId || pending.amount !== amount) {
    return setState('fail', '결제 금액이 일치하지 않습니다', '주문 정보가 변조되었을 수 있어 결제를 승인하지 않았습니다.');
  }

  // 2) 결제 승인 요청 (시크릿 키는 서버에서만 사용)
  try {
    const res = await fetch('/api/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const isJson = (res.headers.get('Content-Type') || '').includes('application/json');
    if (!isJson) {
      // 정적 호스팅 등 승인 서버(/api/confirm)가 없는 환경
      fill({ orderName: pending.orderName });
      return setState('wait', '결제 인증이 완료되었습니다',
        '승인 서버(/api/confirm)가 없어 최종 승인은 진행되지 않았습니다. node server.js 로 실행하면 승인까지 완료됩니다.');
    }

    const data = await res.json();
    if (!res.ok) {
      return setState('fail', '결제 승인에 실패했습니다', `${data.message || '알 수 없는 오류'} (${data.code || res.status})`);
    }

    storage.set('sb_paid_' + orderId, data, sessionStorage);
    finishOrder(pending);
    fill(data);
    updateCartCount();
    setState('ok', '결제가 완료되었습니다', '주문해 주셔서 감사합니다.');
  } catch (err) {
    console.error(err);
    setState('fail', '결제 승인 중 오류가 발생했습니다', '네트워크 상태를 확인해 주세요.');
  }
})();
