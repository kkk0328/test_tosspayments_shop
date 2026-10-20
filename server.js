/* =========================================================
   로컬 개발 서버 (외부 패키지 없음, Node 18+)
   - 정적 파일 제공 (HTML/CSS/JS)
   - POST /api/orders        : 주문 생성 (DB 가격으로 금액 재계산, 회원/게스트)
   - POST /api/orders/lookup : 게스트 주문 조회 (주문번호 + 이메일 또는 guest_token)
   - POST /api/confirm       : 주문 금액 대조 → 토스페이먼츠 결제 승인 → payments 기록
   실행: node server.js  →  http://localhost:5500
   설정: .env (또는 환경 변수) 에 SUPABASE_SERVICE_ROLE_KEY 필요
   ========================================================= */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
loadEnv(path.join(ROOT, '.env'));

const PORT = process.env.PORT || 5500;

// 결제위젯 연동 키의 시크릿 키 (토스페이먼츠 문서용 공개 테스트 키)
// 운영 시에는 환경 변수 TOSS_SECRET_KEY 로 본인 키를 넣으세요. 시크릿 키는 절대 프론트엔드에 노출하면 안 됩니다.
const SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';

// Supabase: URL·publishable 키는 공개 값, service_role 키는 비공개 (환경 변수 전용, 저장소 금지)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iftcupnhdudjovfbjcnk.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_RCovi1bIl-egNwgIr95B0g_IRLZF3QI';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

/* ---------- 설정 / 공통 ---------- */
// 간단한 .env 로더 (KEY=VALUE, # 주석). 이미 설정된 환경 변수는 덮어쓰지 않습니다.
function loadEnv(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return; }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify(body));
}

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', '요청이 너무 큽니다.');
  }
  try { return JSON.parse(raw); } catch { throw new ApiError(400, 'INVALID_JSON', '잘못된 요청입니다.'); }
}

function requireDb() {
  if (!SERVICE_KEY) {
    throw new ApiError(503, 'SERVER_NOT_CONFIGURED', '주문 서버 설정(SUPABASE_SERVICE_ROLE_KEY)이 없습니다. .env 를 확인해 주세요.');
  }
}

/* Supabase PostgREST 호출 (service_role: RLS 우회, 서버 전용) */
async function db(method, pathAndQuery, body, prefer) {
  const headers = { apikey: SERVICE_KEY, 'Content-Type': 'application/json' };
  // 레거시 service_role JWT 는 Authorization 헤더도 필요, 신규 sb_secret_ 키는 apikey 헤더만 사용
  if (!SERVICE_KEY.startsWith('sb_')) headers.Authorization = 'Bearer ' + SERVICE_KEY;
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(`[db] ${method} ${pathAndQuery.split('?')[0]} → ${res.status} ${data?.message || text}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const one = v => (Array.isArray(v) ? v[0] : v) || null;

/* 로그인 사용자 확인: Supabase Auth 에 사용자 토큰을 보내 검증 */
async function getUser(req) {
  const m = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + m[1] },
  });
  if (!res.ok) throw new ApiError(401, 'UNAUTHORIZED', '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.');
  return res.json();
}

/* 할인가 계산 규칙: js/products.js 의 salePrice 와 반드시 같아야 합니다. */
function salePrice(price, discount) {
  return Math.round(price * (100 - discount) / 100 / 100) * 100;
}

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER_ID_RE = /^[A-Za-z0-9_-]{6,64}$/;

/* ---------- POST /api/orders : 주문 생성 ---------- */
async function handleCreateOrder(req, res) {
  requireDb();
  const body = await readJson(req);
  const user = await getUser(req);

  // 1) 주문 상품 검증 (클라이언트는 id/size/qty 만 보냄. 가격은 받지 않음)
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) {
    throw new ApiError(400, 'INVALID_ITEMS', '주문 상품이 올바르지 않습니다.');
  }
  const merged = new Map();
  for (const i of body.items) {
    if (typeof i?.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(i.id) || typeof i.size !== 'string' ||
        !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 99) {
      throw new ApiError(400, 'INVALID_ITEMS', '주문 상품이 올바르지 않습니다.');
    }
    const key = `${i.id}|${i.size}`;
    const qty = (merged.get(key)?.qty || 0) + i.qty;
    if (qty > 99) throw new ApiError(400, 'INVALID_ITEMS', '한 상품은 최대 99개까지 주문할 수 있습니다.');
    merged.set(key, { id: i.id, size: i.size, qty });
  }
  const mode = body.mode === 'buynow' ? 'buynow' : 'cart';

  // 2) 주문자 정보 검증 (게스트는 이메일 필수: 비회원 주문 조회에 사용)
  const o = body.orderer || {};
  const orderer = {
    name: String(o.name || '').trim().slice(0, 50),
    phone: String(o.phone || '').replace(/\D/g, ''),
    email: String(o.email || '').trim().toLowerCase().slice(0, 254),
    addr1: String(o.addr1 || '').trim().slice(0, 200),
    addr2: String(o.addr2 || '').trim().slice(0, 200),
  };
  if (user && !orderer.email) orderer.email = (user.email || '').toLowerCase();
  if (!orderer.name) throw new ApiError(400, 'INVALID_ORDERER', '이름을 입력해 주세요.');
  if (!/^01\d{8,9}$/.test(orderer.phone)) throw new ApiError(400, 'INVALID_ORDERER', '휴대폰 번호를 정확히 입력해 주세요.');
  if (!user && !orderer.email) throw new ApiError(400, 'INVALID_ORDERER', '비회원 주문은 이메일이 필요합니다.');
  if (orderer.email && !EMAIL_RE.test(orderer.email)) throw new ApiError(400, 'INVALID_ORDERER', '이메일 형식을 확인해 주세요.');
  if (!orderer.addr1) throw new ApiError(400, 'INVALID_ORDERER', '배송지를 입력해 주세요.');

  // 3) DB 가격으로 금액 재계산
  const lines = [...merged.values()];
  const ids = [...new Set(lines.map(l => l.id))];
  const products = await db('GET', `products?select=id,name,price,discount,categories(sizes)&id=in.(${ids.join(',')})`);
  const byId = new Map(products.map(p => [p.id, p]));
  const items = lines.map(l => {
    const p = byId.get(l.id);
    if (!p) throw new ApiError(400, 'PRODUCT_NOT_FOUND', '판매하지 않는 상품이 포함되어 있습니다.');
    if (!(p.categories?.sizes || []).includes(l.size)) throw new ApiError(400, 'INVALID_SIZE', `${p.name}: 선택할 수 없는 사이즈입니다.`);
    return { product_id: p.id, name: p.name, size: l.size, qty: l.qty, unit_price: salePrice(p.price, p.discount) };
  });
  const amount = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const orderName = items.length > 1 ? `${items[0].name} 외 ${items.length - 1}건` : items[0].name;

  // 4) 주문 생성
  const orderId = `ORD_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const guestToken = user ? null : crypto.randomBytes(24).toString('base64url');
  const customerKey = user
    ? user.id
    : (/^[A-Za-z0-9\-_=.@]{2,50}$/.test(body.customerKey || '') ? body.customerKey : 'CUS_' + crypto.randomBytes(12).toString('hex'));

  const [order] = await db('POST', 'orders', {
    order_id: orderId,
    user_id: user ? user.id : null,
    guest_email: user ? null : orderer.email,
    guest_phone: user ? null : orderer.phone,
    guest_token_hash: guestToken ? sha256(guestToken) : null,
    customer_key: customerKey,
    status: 'PENDING',
    total_amount: amount,
    order_name: orderName,
    mode,
    shipping: orderer,
  }, 'return=representation');

  try {
    await db('POST', 'order_items', items.map(i => ({ ...i, order_id: order.id })), 'return=minimal');
  } catch (err) {
    await db('DELETE', `orders?id=eq.${order.id}`).catch(() => {});
    throw err;
  }

  console.log(`[order] ${orderId} ${amount}원 ${user ? 'member ' + user.id : 'guest'}`);
  sendJson(res, 201, { orderId, amount, orderName, customerKey, ...(guestToken && { guestToken }) });
}

/* ---------- POST /api/orders/lookup : 게스트 주문 조회 ---------- */
const lookupHits = new Map(); // ip → { count, reset }
function rateLimit(req, limit = 10, windowMs = 10 * 60 * 1000) {
  const ip = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const hit = lookupHits.get(ip);
  if (!hit || hit.reset < now) { lookupHits.set(ip, { count: 1, reset: now + windowMs }); return; }
  if (++hit.count > limit) throw new ApiError(429, 'TOO_MANY_REQUESTS', '조회 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.');
}

async function handleLookup(req, res) {
  requireDb();
  rateLimit(req);
  const { orderId, email, guestToken } = await readJson(req);
  const notFound = new ApiError(404, 'ORDER_NOT_FOUND', '주문 정보가 일치하지 않습니다.');
  // 주문번호 단독 조회 금지: 이메일 또는 guest_token 일치 필수
  if (typeof orderId !== 'string' || !ORDER_ID_RE.test(orderId) || (!email && !guestToken)) throw notFound;

  const order = one(await db('GET',
    `orders?select=order_id,status,total_amount,order_name,shipping,created_at,paid_at,guest_email,guest_token_hash,` +
    `order_items(product_id,name,size,qty,unit_price),payments(method,amount,approved_at)` +
    `&order_id=eq.${encodeURIComponent(orderId)}&user_id=is.null`));
  if (!order) throw notFound;

  let ok = false;
  if (typeof guestToken === 'string' && guestToken) {
    const a = Buffer.from(sha256(guestToken), 'hex');
    const b = Buffer.from(order.guest_token_hash || '', 'hex');
    ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  } else if (typeof email === 'string') {
    ok = email.trim().toLowerCase() === order.guest_email;
  }
  if (!ok) throw notFound;

  sendJson(res, 200, {
    orderId: order.order_id,
    status: order.status,
    totalAmount: order.total_amount,
    orderName: order.order_name,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    shipping: order.shipping,
    items: order.order_items,
    payment: one(order.payments),
  });
}

/* ---------- POST /api/confirm : 결제 승인 ---------- */
async function markFailed(orderUuid) {
  await db('PATCH', `orders?id=eq.${orderUuid}&status=eq.PENDING`, { status: 'FAILED' }, 'return=minimal')
    .catch(err => console.error(err.message));
}

async function handleConfirm(req, res) {
  const { paymentKey, orderId, amount } = await readJson(req);
  if (typeof paymentKey !== 'string' || !paymentKey || paymentKey.length > 200 ||
      typeof orderId !== 'string' || !ORDER_ID_RE.test(orderId) || !Number.isInteger(amount)) {
    throw new ApiError(400, 'INVALID_REQUEST', '결제 정보가 누락되었습니다.');
  }
  requireDb();

  // 1) DB 주문 조회
  const order = one(await db('GET',
    `orders?select=id,status,total_amount,order_name,mode,payments(raw)&order_id=eq.${encodeURIComponent(orderId)}`));
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', '주문 정보를 찾을 수 없습니다.');
  const orderInfo = { mode: order.mode, orderName: order.order_name };

  // 이미 승인된 주문: 저장된 결과 반환 (새로고침·재호출 멱등)
  if (order.status === 'PAID') {
    const paid = one(order.payments);
    if (paid) return sendJson(res, 200, { ...paid.raw, order: orderInfo, alreadyConfirmed: true });
  } else if (order.status !== 'PENDING') {
    throw new ApiError(409, 'INVALID_ORDER_STATUS', `처리할 수 없는 주문 상태입니다. (${order.status})`);
  }

  // 2) 금액 위변조 검증: 토스 호출 전에 DB 주문 금액과 대조
  if (amount !== order.total_amount) {
    await markFailed(order.id);
    console.warn(`[confirm] ${orderId} 금액 불일치: 요청 ${amount} / 주문 ${order.total_amount}`);
    throw new ApiError(400, 'AMOUNT_MISMATCH', '결제 금액이 주문 금액과 일치하지 않아 승인하지 않았습니다.');
  }

  // 3) 토스페이먼츠 승인 (Idempotency-Key: 같은 요청 재시도 시 중복 승인 없이 같은 결과)
  let tossRes, data;
  try {
    tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(SECRET_KEY + ':').toString('base64'),
        'Content-Type': 'application/json',
        'Idempotency-Key': 'confirm_' + sha256(orderId + ':' + paymentKey).slice(0, 40),
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    data = await tossRes.json();
  } catch (err) {
    console.error(err);
    throw new ApiError(502, 'CONFIRM_FAILED', '결제 승인 서버와 통신하지 못했습니다.');
  }
  console.log(`[confirm] ${orderId} ${amount}원 → ${tossRes.status} ${data.status || data.code}`);

  if (!tossRes.ok) {
    if (tossRes.status < 500 && data.code !== 'ALREADY_PROCESSED_PAYMENT') await markFailed(order.id);
    return sendJson(res, tossRes.status, data);
  }

  // 4) 승인 기록: payments 저장 → orders PAID
  //    실패해도 결제는 승인된 상태이므로 성공 응답을 주되, recorded=false 로 알려 재호출(멱등) 시 다시 기록합니다.
  let recorded = true;
  try {
    await db('POST', 'payments?on_conflict=payment_key', {
      order_id: order.id,
      payment_key: data.paymentKey,
      method: data.method,
      amount: data.totalAmount,
      approved_at: data.approvedAt,
      raw: data,
    }, 'resolution=ignore-duplicates,return=minimal');
    await db('PATCH', `orders?id=eq.${order.id}&status=eq.PENDING`,
      { status: 'PAID', paid_at: data.approvedAt || new Date().toISOString() }, 'return=minimal');
  } catch (err) {
    recorded = false;
    console.error(`[confirm] ${orderId} 승인은 완료됐지만 DB 기록 실패 (paymentKey=${data.paymentKey}):`, err.message);
  }
  sendJson(res, 200, { ...data, order: orderInfo, recorded });
}

/* ---------- 정적 파일 ---------- */
function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const filePath = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));

  // 프로젝트 폴더 밖, 서버 소스/설정 파일(.env 등 dot 파일, supabase/) 접근 차단
  const rel = path.relative(ROOT, filePath);
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel.startsWith('.') || rel === 'server.js' ||
      rel.split(path.sep)[0] === 'supabase') {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

const ROUTES = {
  '/api/orders': handleCreateOrder,
  '/api/orders/lookup': handleLookup,
  '/api/confirm': handleConfirm,
};

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const route = ROUTES[pathname];
  if (route) {
    if (req.method !== 'POST') return sendJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: 'POST only' });
    try {
      await route(req, res);
    } catch (err) {
      if (err instanceof ApiError) return sendJson(res, err.status, { code: err.code, message: err.message });
      console.error(err);
      sendJson(res, 500, { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' });
    }
    return;
  }
  if (pathname.startsWith('/api/')) return sendJson(res, 404, { code: 'NOT_FOUND', message: '없는 API 입니다.' });
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`STYLEBOX running → http://localhost:${PORT}`);
  if (!SERVICE_KEY) console.warn('⚠ SUPABASE_SERVICE_ROLE_KEY 가 없어 주문/결제 API 가 503 을 반환합니다. (.env 설정)');
});
