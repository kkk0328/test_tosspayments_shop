/* =========================================================
   공통: 헤더/푸터, 장바구니, 상품 카드, 상품 모달, 토스트
   ========================================================= */

/* ---------- 유틸 ---------- */
const won = n => n.toLocaleString('ko-KR') + '원';
const countLabel = n => (n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '만' : n.toLocaleString('ko-KR'));
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const storage = {
  get(key, fallback, area = localStorage) {
    try { return JSON.parse(area.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value, area = localStorage) {
    try { area.setItem(key, JSON.stringify(value)); } catch { /* 저장 불가 환경 무시 */ }
  },
  remove(key, area = localStorage) {
    try { area.removeItem(key); } catch { /* noop */ }
  },
};

/* ---------- 장바구니 ---------- */
const Cart = {
  items() { return storage.get('sb_cart', []); },
  save(items) { storage.set('sb_cart', items); updateCartCount(); },
  add(id, size, qty = 1) {
    const items = this.items();
    const found = items.find(i => i.id === id && i.size === size);
    if (found) found.qty = Math.min(99, found.qty + qty);
    else items.push({ id, size, qty });
    this.save(items);
  },
  setQty(idx, qty) {
    const items = this.items();
    if (!items[idx]) return;
    items[idx].qty = Math.max(1, Math.min(99, qty));
    this.save(items);
  },
  remove(idx) {
    const items = this.items();
    items.splice(idx, 1);
    this.save(items);
  },
  clear() { this.save([]); },
  count() { return this.items().reduce((s, i) => s + i.qty, 0); },
};

/* 주문 상품 목록을 상품 정보와 합쳐서 반환 */
function resolveItems(items) {
  return items
    .map(i => ({ ...i, product: getProduct(i.id) }))
    .filter(i => i.product);
}
function itemsTotal(items) {
  return resolveItems(items).reduce((s, i) => s + i.product.sale * i.qty, 0);
}

/* ---------- 좋아요 ---------- */
const Likes = {
  all() { return storage.get('sb_likes', []); },
  has(id) { return this.all().includes(id); },
  toggle(id) {
    const list = this.all();
    const i = list.indexOf(id);
    i >= 0 ? list.splice(i, 1) : list.push(id);
    storage.set('sb_likes', list);
    return i < 0;
  },
};

/* ---------- 아이콘 ---------- */
const ICON = {
  search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  bag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
  heart: '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.7 3.9 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.7 1.1-1.6 2.7-2.7 4.7-2.7 3.4 0 5.7 3.2 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3z"/></svg>',
  close: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  user: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
};

/* ---------- 헤더 / 푸터 ---------- */
function renderLayout(active) {
  const header = document.getElementById('header');
  if (header) {
    header.innerHTML = `
      <div class="gnb">
        <div class="inner">
          <a href="index.html" class="logo">STYLEBOX</a>
          <form class="search" action="index.html" role="search">
            <input type="search" name="q" placeholder="브랜드, 상품, 카테고리 검색" aria-label="검색" value="${escapeHtml(new URLSearchParams(location.search).get('q') || '')}">
            <button type="submit" aria-label="검색">${ICON.search}</button>
          </form>
          <div class="gnb-util">
            <a href="#" onclick="showToast('로그인은 준비 중입니다.');return false;">${ICON.user}<span class="txt">로그인</span></a>
            <button type="button" id="openCart">${ICON.bag}<span class="txt">장바구니</span><span class="cart-count" id="cartCount">0</span></button>
          </div>
        </div>
      </div>
      <nav class="lnb" aria-label="카테고리">
        <div class="inner">
          <a href="index.html" class="${active === 'home' ? 'active' : ''}">홈</a>
          ${Object.entries(CATEGORIES).map(([key, c]) =>
            `<a href="${c.href}" class="${active === key ? 'active' : ''}">${c.name}</a>`).join('')}
          <a href="#" onclick="showToast('세일 기획전은 준비 중입니다.');return false;">세일</a>
          <a href="#" onclick="showToast('랭킹 페이지는 준비 중입니다.');return false;">랭킹</a>
        </div>
      </nav>`;
    $('#openCart').addEventListener('click', openCart);
  }

  const footer = document.getElementById('footer');
  if (footer) {
    footer.innerHTML = `
      <footer class="footer">
        <div class="inner">
          <strong>STYLEBOX</strong>
          <p>본 사이트는 토스페이먼츠 연동 테스트용 퍼블리싱 데모입니다. 실제 상품 판매 및 출금이 이루어지지 않습니다.</p>
          <p>고객센터 1588-0000 · 평일 10:00 - 18:00</p>
          <p>상품 이미지: <a href="https://unsplash.com/?utm_source=stylebox&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a> 무료 이미지 (작가 정보는 각 상품 상세에 표기)</p>
        </div>
      </footer>`;
  }

  mountOverlays();
  updateCartCount();
}

function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (el) el.textContent = Cart.count();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/* ---------- 상품 카드 ---------- */
function cardHTML(p, rank) {
  const liked = Likes.has(p.id);
  return `
    <li class="card" data-id="${p.id}">
      <div class="thumb">
        ${productArt(p)}
        ${rank ? `<span class="rank">${rank}</span>` : ''}
        <button type="button" class="like-btn ${liked ? 'on' : ''}" data-like="${p.id}" aria-label="좋아요">${ICON.heart}</button>
      </div>
      <div class="info">
        <p class="brand">${p.brand}</p>
        <p class="name">${p.name}</p>
        <p class="price">${p.discount ? `<span class="rate">${p.discount}%</span>` : ''}<span>${won(p.sale)}</span></p>
        <p class="meta"><span class="heart">♥ ${countLabel(p.likes)}</span><span>★ ${p.rating} (${countLabel(p.reviews)})</span></p>
        ${p.badges.length ? `<div class="badges">${p.badges.map(b => `<span class="badge ${b === '쿠폰' ? 'blue' : ''}">${b}</span>`).join('')}</div>` : ''}
      </div>
    </li>`;
}

function renderGrid(el, list, { ranked = false } = {}) {
  el.innerHTML = list.length
    ? list.map((p, i) => cardHTML(p, ranked ? i + 1 : 0)).join('')
    : '<li class="empty">조건에 맞는 상품이 없습니다.</li>';
}

/* 카드 클릭 이벤트 (위임) */
document.addEventListener('click', e => {
  const likeBtn = e.target.closest('[data-like]');
  if (likeBtn) {
    e.stopPropagation();
    const on = Likes.toggle(likeBtn.dataset.like);
    $$(`[data-like="${likeBtn.dataset.like}"]`).forEach(b => b.classList.toggle('on', on));
    showToast(on ? '좋아요 목록에 추가했습니다.' : '좋아요를 취소했습니다.');
    return;
  }
  const card = e.target.closest('.card[data-id]');
  if (card) openProduct(card.dataset.id);
});

/* ---------- 오버레이(모달/드로어/토스트) ---------- */
function mountOverlays() {
  if (document.getElementById('dim')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="dim" id="dim"></div>
    <div class="modal" id="productModal" role="dialog" aria-modal="true" aria-label="상품 상세"></div>
    <aside class="drawer" id="cartDrawer" aria-label="장바구니">
      <div class="drawer-head"><h2>장바구니</h2><button type="button" data-close aria-label="닫기">${ICON.close}</button></div>
      <div class="drawer-list" id="cartList"></div>
      <div class="drawer-foot" id="cartFoot"></div>
    </aside>
    <div class="toast" id="toast" role="status"></div>`);

  $('#dim').addEventListener('click', closeOverlays);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlays(); });
  $('#cartDrawer [data-close]').addEventListener('click', closeOverlays);
}

function closeOverlays() {
  $$('#dim, #productModal, #cartDrawer').forEach(el => el && el.classList.remove('show'));
  document.body.style.overflow = '';
}

function openLayer(el) {
  $('#dim').classList.add('show');
  el.classList.add('show');
  document.body.style.overflow = 'hidden';
}

let toastTimer;
function showToast(msg) {
  const t = $('#toast');
  if (!t) return alert(msg);
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

/* ---------- 상품 상세 모달 ---------- */
function openProduct(id) {
  const p = getProduct(id);
  if (!p) return;
  const modal = $('#productModal');
  let size = null;
  let qty = 1;

  modal.innerHTML = `
    <button type="button" class="modal-close" data-close aria-label="닫기">${ICON.close}</button>
    <div class="thumb">${productArt(p, 'art', 640)}</div>
    <div class="modal-body">
      <p class="brand">${p.brand}</p>
      <h2 class="name">${p.name}</h2>
      <p class="price">${p.discount ? `<span class="rate">${p.discount}%</span>` : ''}<span>${won(p.sale)}</span>${p.discount ? `<del>${won(p.price)}</del>` : ''}</p>
      <p class="meta"><span class="heart">♥ ${countLabel(p.likes)}</span><span>★ ${p.rating} · 후기 ${p.reviews.toLocaleString()}개</span><span>무료배송</span></p>
      <p class="credit">${photoCredit(p)}</p>
      <p class="opt-label">사이즈</p>
      <div class="sizes">${p.sizes.map(s => `<button type="button" class="size" data-size="${s}">${s}</button>`).join('')}</div>
      <p class="opt-label">수량</p>
      <div class="qty">
        <button type="button" data-qty="-1" aria-label="수량 감소">−</button>
        <input type="text" value="1" readonly aria-label="수량">
        <button type="button" data-qty="1" aria-label="수량 증가">+</button>
      </div>
      <div class="total-row"><span>총 상품 금액</span><strong id="modalTotal">${won(p.sale)}</strong></div>
      <div class="btn-row">
        <button type="button" class="btn" id="addCart">장바구니</button>
        <button type="button" class="btn primary" id="buyNow">바로 구매</button>
      </div>
    </div>`;

  const qtyInput = $('.qty input', modal);
  const sync = () => {
    qtyInput.value = qty;
    $('#modalTotal').textContent = won(p.sale * qty);
  };

  modal.onclick = e => {
    if (e.target.closest('[data-close]')) return closeOverlays();
    const sizeBtn = e.target.closest('[data-size]');
    if (sizeBtn) {
      size = sizeBtn.dataset.size;
      $$('.size', modal).forEach(b => b.classList.toggle('active', b === sizeBtn));
    }
    const qBtn = e.target.closest('[data-qty]');
    if (qBtn) { qty = Math.max(1, Math.min(99, qty + Number(qBtn.dataset.qty))); sync(); }
  };

  $('#addCart', modal).addEventListener('click', () => {
    if (!size) return showToast('사이즈를 선택해 주세요.');
    Cart.add(p.id, size, qty);
    closeOverlays();
    showToast('장바구니에 담았습니다.');
  });
  $('#buyNow', modal).addEventListener('click', () => {
    if (!size) return showToast('사이즈를 선택해 주세요.');
    storage.set('sb_buynow', [{ id: p.id, size, qty }], sessionStorage);
    location.href = 'checkout.html?mode=buynow';
  });

  openLayer(modal);
}

/* ---------- 장바구니 드로어 ---------- */
function renderCart() {
  const items = resolveItems(Cart.items());
  const list = $('#cartList');
  const foot = $('#cartFoot');

  if (!items.length) {
    list.innerHTML = '<p class="drawer-empty">장바구니에 담긴 상품이 없습니다.</p>';
    foot.innerHTML = '';
    return;
  }

  list.innerHTML = items.map((i, idx) => `
    <div class="cart-item">
      <div class="thumb">${productArt(i.product, 'art', 160)}</div>
      <div>
        <p class="brand">${i.product.brand}</p>
        <p class="name">${i.product.name}</p>
        <p class="opt">옵션: ${i.size}</p>
        <div class="row">
          <div class="qty">
            <button type="button" data-cart-qty="${idx}" data-d="-1" aria-label="수량 감소">−</button>
            <input type="text" value="${i.qty}" readonly aria-label="수량">
            <button type="button" data-cart-qty="${idx}" data-d="1" aria-label="수량 증가">+</button>
          </div>
          <span class="item-price">${won(i.product.sale * i.qty)}</span>
        </div>
        <button type="button" class="remove" data-cart-remove="${idx}">삭제</button>
      </div>
    </div>`).join('');

  foot.innerHTML = `
    <div class="total-row"><span>총 결제 예상 금액</span><strong>${won(itemsTotal(Cart.items()))}</strong></div>
    <div class="btn-row"><a href="checkout.html" class="btn primary">${Cart.count()}개 상품 구매하기</a></div>`;
}

function openCart() {
  renderCart();
  openLayer($('#cartDrawer'));
}

document.addEventListener('click', e => {
  const qBtn = e.target.closest('[data-cart-qty]');
  if (qBtn) {
    const idx = Number(qBtn.dataset.cartQty);
    Cart.setQty(idx, Cart.items()[idx].qty + Number(qBtn.dataset.d));
    renderCart();
  }
  const rBtn = e.target.closest('[data-cart-remove]');
  if (rBtn) {
    Cart.remove(Number(rBtn.dataset.cartRemove));
    renderCart();
  }
});

/* ---------- 카테고리 페이지 ---------- */
function initCategoryPage() {
  const key = document.body.dataset.category;
  const cat = CATEGORIES[key];
  renderLayout(key);

  const sorts = {
    recommend: { label: '추천순', fn: (a, b) => b.likes * b.rating - a.likes * a.rating },
    sales: { label: '판매순', fn: (a, b) => b.reviews - a.reviews },
    low: { label: '낮은 가격순', fn: (a, b) => a.sale - b.sale },
    high: { label: '높은 가격순', fn: (a, b) => b.sale - a.sale },
    discount: { label: '할인율순', fn: (a, b) => b.discount - a.discount },
  };
  let sub = '전체';
  let sort = 'recommend';

  $('#crumb').textContent = `홈 > ${cat.name}`;
  $('#title').textContent = cat.name;
  $('#chips').innerHTML = cat.subs.map(s => `<button type="button" class="chip ${s === sub ? 'active' : ''}" data-sub="${s}">${s}</button>`).join('');
  $('#sort').innerHTML = Object.entries(sorts).map(([k, s]) => `<button type="button" data-sort="${k}" class="${k === sort ? 'active' : ''}">${s.label}</button>`).join('');

  const draw = () => {
    const list = PRODUCTS
      .filter(p => p.cat === key && (sub === '전체' || p.sub === sub))
      .sort(sorts[sort].fn);
    $('#count').innerHTML = `상품 <b>${list.length}</b>개`;
    renderGrid($('#grid'), list);
  };

  $('#chips').addEventListener('click', e => {
    const b = e.target.closest('[data-sub]');
    if (!b) return;
    sub = b.dataset.sub;
    $$('#chips .chip').forEach(c => c.classList.toggle('active', c === b));
    draw();
  });
  $('#sort').addEventListener('click', e => {
    const b = e.target.closest('[data-sort]');
    if (!b) return;
    sort = b.dataset.sort;
    $$('#sort button').forEach(c => c.classList.toggle('active', c === b));
    draw();
  });

  draw();
}

/* ---------- 홈 ---------- */
function initHomePage() {
  renderLayout('home');

  // 검색 결과
  const q = (new URLSearchParams(location.search).get('q') || '').trim();
  if (q) {
    const words = q.toLowerCase().split(/\s+/);
    const found = PRODUCTS.filter(p => {
      const hay = `${p.brand} ${p.name} ${p.sub} ${CATEGORIES[p.cat].name}`.toLowerCase();
      return words.every(w => hay.includes(w));
    });
    $('#searchSection').hidden = false;
    $('#searchTitle').textContent = `'${q}' 검색 결과 ${found.length}개`;
    renderGrid($('#searchGrid'), found);
  }

  // 배너 슬라이드
  const track = $('#bannerTrack');
  const dots = $('#bannerDots');
  const total = track.children.length;
  let idx = 0;
  dots.innerHTML = Array.from({ length: total }, (_, i) => `<button type="button" aria-label="${i + 1}번 배너"></button>`).join('');
  const go = i => {
    idx = (i + total) % total;
    track.style.transform = `translateX(${-idx * 100}%)`;
    $$('button', dots).forEach((d, j) => d.classList.toggle('active', j === idx));
  };
  dots.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) go([...dots.children].indexOf(b));
  });
  go(0);
  setInterval(() => go(idx + 1), 4500);

  // 카테고리 바로가기 아트
  $$('[data-art]').forEach(el => {
    el.insertAdjacentHTML('afterbegin', productArt(getProduct(el.dataset.art), 'cat-art', 640));
  });

  // 랭킹 탭
  const rankingTabs = $('#rankingTabs');
  const drawRanking = cat => {
    const list = PRODUCTS
      .filter(p => cat === 'all' || p.cat === cat)
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 10);
    renderGrid($('#rankingGrid'), list, { ranked: true });
  };
  rankingTabs.addEventListener('click', e => {
    const b = e.target.closest('[data-rank]');
    if (!b) return;
    $$('.chip', rankingTabs).forEach(c => c.classList.toggle('active', c === b));
    drawRanking(b.dataset.rank);
  });
  drawRanking('all');

  // 할인 상품
  renderGrid($('#saleGrid'), [...PRODUCTS].sort((a, b) => b.discount - a.discount).slice(0, 5));
}
