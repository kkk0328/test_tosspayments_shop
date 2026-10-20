/* =========================================================
   상품 데이터 (Supabase categories / subs / products 테이블)
   - 앱 시작 시 loadCatalog() 로 한 번 불러와 캐시하고, getProduct 는 캐시에서 동기 조회합니다.
   - 상품 사진: Unsplash (https://unsplash.com/license, 무료 상업적 이용 가능)
     photo = images.unsplash.com 사진 ID, credit = [작가, Unsplash 사진 페이지 ID]
   ========================================================= */
const CATEGORIES = {};   // { tops: { name, en, href, subs: ['전체', ...], sizes } }
const PRODUCTS = [];

/* 할인가 계산 규칙: 정가 × (100 - 할인율)% 를 100원 단위 반올림.
   server.js 의 salePrice 와 반드시 같은 규칙이어야 합니다. (서버가 결제 금액을 재계산) */
function salePrice(price, discount) {
  return Math.round(price * (100 - discount) / 100 / 100) * 100;
}

let catalogPromise = null;
function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetchCatalog().catch(err => {
      catalogPromise = null; // 다음 호출에서 재시도
      throw err;
    });
  }
  return catalogPromise;
}

async function fetchCatalog() {
  if (!sb) throw new Error('Supabase 클라이언트를 불러오지 못했습니다.');
  const [cats, subs, prods] = await Promise.all([
    sb.from('categories').select('key, name, en_name, sizes').order('sort'),
    sb.from('subs').select('category_key, key, name').order('sort'),
    sb.from('products').select('*'),
  ]);
  const error = cats.error || subs.error || prods.error;
  if (error) throw new Error(error.message);

  const subName = {};
  cats.data.forEach(c => {
    CATEGORIES[c.key] = { name: c.name, en: c.en_name, href: `${c.key}.html`, sizes: c.sizes, subs: ['전체'] };
  });
  subs.data.forEach(s => {
    CATEGORIES[s.category_key]?.subs.push(s.name);
    subName[`${s.category_key}/${s.key}`] = s.name;
  });

  PRODUCTS.length = 0;
  prods.data.forEach(r => PRODUCTS.push({
    id: r.id,
    cat: r.category_key,
    sub: subName[`${r.category_key}/${r.sub_key}`] || r.sub_key,
    brand: r.brand,
    name: r.name,
    price: r.price,
    discount: r.discount,
    likes: r.likes,
    rating: Number(r.rating),
    reviews: r.reviews,
    badges: r.badges || [],
    photo: r.photo,
    credit: [r.credit_author, r.credit_id],
    sizes: CATEGORIES[r.category_key]?.sizes || [],
    sale: salePrice(r.price, r.discount),
  }));
  PRODUCTS.sort((a, b) => a.id.localeCompare(b.id));
  return PRODUCTS;
}

function getProduct(id) {
  return PRODUCTS.find(p => p.id === id);
}

/* ---------- 상품 이미지 ----------
   Unsplash 이미지 CDN 에서 5:6 비율로 잘라서 불러옵니다. (w: 가로 픽셀) */
function photoUrl(p, w = 480) {
  return `https://images.unsplash.com/photo-${p.photo}?w=${w}&h=${Math.round(w * 1.2)}&fit=crop&crop=entropy&q=80&auto=format`;
}

function productArt(p, cls = 'art', w = 480) {
  return `<img class="${cls}" src="${photoUrl(p, w)}" srcset="${photoUrl(p, w)} 1x, ${photoUrl(p, w * 2)} 2x" alt="${p.brand} ${p.name}" loading="lazy" decoding="async">`;
}

function photoCredit(p) {
  const [name, id] = p.credit;
  if (!name || !id) return '';
  return `Photo by <a href="https://unsplash.com/photos/${id}?utm_source=stylebox&utm_medium=referral" target="_blank" rel="noopener">${name}</a> on <a href="https://unsplash.com/?utm_source=stylebox&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a>`;
}
