/* =========================================================
   로컬 개발 서버 (외부 패키지 없음, Node 18+)
   - 정적 파일 제공 (HTML/CSS/JS)
   - POST /api/confirm : 토스페이먼츠 결제 승인 API 호출
   실행: node server.js  →  http://localhost:5500
   ========================================================= */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5500;
const ROOT = __dirname;

// 결제위젯 연동 키의 시크릿 키 (토스페이먼츠 문서용 공개 테스트 키)
// 운영 시에는 환경 변수 TOSS_SECRET_KEY 로 본인 키를 넣으세요. 시크릿 키는 절대 프론트엔드에 노출하면 안 됩니다.
const SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';

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

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify(body));
}

async function handleConfirm(req, res) {
  let raw = '';
  for await (const chunk of req) raw += chunk;

  let body;
  try { body = JSON.parse(raw); } catch { return sendJson(res, 400, { code: 'INVALID_JSON', message: '잘못된 요청입니다.' }); }

  const { paymentKey, orderId, amount } = body;
  if (!paymentKey || !orderId || !amount) {
    return sendJson(res, 400, { code: 'INVALID_REQUEST', message: '결제 정보가 누락되었습니다.' });
  }

  // TODO(운영): 여기서 DB에 저장된 주문 금액과 amount 를 반드시 대조하세요.

  try {
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(SECRET_KEY + ':').toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    const data = await tossRes.json();
    console.log(`[confirm] ${orderId} ${amount}원 → ${tossRes.status} ${data.status || data.code}`);
    sendJson(res, tossRes.status, data);
  } catch (err) {
    console.error(err);
    sendJson(res, 502, { code: 'CONFIRM_FAILED', message: '결제 승인 서버와 통신하지 못했습니다.' });
  }
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const filePath = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));

  // 프로젝트 폴더 밖, 서버 소스/설정 파일 접근 차단
  const rel = path.relative(ROOT, filePath);
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel.startsWith('.') || rel === 'server.js') {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

http.createServer((req, res) => {
  if (req.url === '/api/confirm') {
    if (req.method !== 'POST') return sendJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: 'POST only' });
    return handleConfirm(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`STYLEBOX running → http://localhost:${PORT}`);
});
