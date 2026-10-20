/* =========================================================
   상품 데이터
   - 실제 서비스에서는 API 응답으로 교체하세요.
   - 상품 사진: Unsplash (https://unsplash.com/license, 무료 상업적 이용 가능)
     photo = images.unsplash.com 사진 ID, credit = [작가, Unsplash 사진 페이지 ID]
   ========================================================= */
const CATEGORIES = {
  tops:  { name: '상의', en: 'TOP',   href: 'tops.html',  subs: ['전체', '반소매 티셔츠', '맨투맨', '셔츠', '니트', '후드'] },
  shoes: { name: '신발', en: 'SHOES', href: 'shoes.html', subs: ['전체', '스니커즈', '러닝화', '부츠'] },
  pants: { name: '바지', en: 'PANTS', href: 'pants.html', subs: ['전체', '데님', '슬랙스', '코튼 팬츠', '숏팬츠'] },
};

const TOP_SIZES = ['S', 'M', 'L', 'XL'];
const PANTS_SIZES = ['28', '30', '32', '34', '36'];
const SHOE_SIZES = ['240', '250', '260', '270', '280'];

const PRODUCTS = [
  // ---------- 상의 ----------
  { id: 'T001', cat: 'tops', sub: '반소매 티셔츠', brand: 'DAILY UNIT',   name: '헤비웨이트 오버핏 반소매 티셔츠 화이트', price: 39000, discount: 30, likes: 48210, rating: 4.9, reviews: 12840, badges: ['무료배송', '단독'], photo: '1778671394516-8270eac13c42', credit: ['Avtar Singh', '8ACmRoleM24'] },
  { id: 'T002', cat: 'tops', sub: '반소매 티셔츠', brand: 'DAILY UNIT',   name: '레터링 프린트 반소매 티셔츠 블랙', price: 39000, discount: 30, likes: 41022, rating: 4.9, reviews: 10322, badges: ['무료배송'], photo: '1583743814966-8936f5b7be1a', credit: ['Faith & Yarn', 'Wr0TpKqf26s'] },
  { id: 'T003', cat: 'tops', sub: '반소매 티셔츠', brand: 'ARCHIVE ROOM', name: '서클 로고 반소매 티셔츠 블랙', price: 42000, discount: 25, likes: 15880, rating: 4.8, reviews: 3120, badges: ['단독'], photo: '1618354691373-d851c5c3a990', credit: ['Ryan Hoffman', '6Nub980bI3I'] },
  { id: 'T004', cat: 'tops', sub: '셔츠',         brand: 'NORTH LANE',   name: '옥스포드 레귤러 셔츠 스카이블루', price: 59000, discount: 15, likes: 22410, rating: 4.8, reviews: 5102, badges: ['무료배송', '쿠폰'], photo: '1623658580851-3b25bf83b4ea', credit: ['Background Foto Pixell Design', 'OsvD4y41C4g'] },
  { id: 'T005', cat: 'tops', sub: '후드',         brand: 'URBAN FIELD',  name: '스몰 로고 스웨트 후드 화이트', price: 79000, discount: 35, likes: 30520, rating: 4.9, reviews: 7340, badges: ['무료배송'], photo: '1620799140188-3b2a02fd9a77', credit: ['Mediamodifier', 'kJXGTOY1wLQ'] },
  { id: 'T006', cat: 'tops', sub: '후드',         brand: 'URBAN FIELD',  name: '헤비 테리 오버핏 후드 멜란지 그레이', price: 79000, discount: 35, likes: 27412, rating: 4.8, reviews: 6911, badges: ['무료배송'], photo: '1556821840-3a63f95609a7', credit: ['Jannes Jacobs', 'a_KC8ocB650'] },
  { id: 'T007', cat: 'tops', sub: '셔츠',         brand: 'SOFT HOUSE',   name: '코튼 브로드 레귤러 셔츠 화이트', price: 69000, discount: 10, likes: 8120, rating: 4.7, reviews: 1033, badges: [], photo: '1603252109612-24fa03d145c8', credit: ['Nimble Made', 'GDebkNryTd4'] },
  { id: 'T008', cat: 'tops', sub: '맨투맨',       brand: 'MONO GRAM',    name: '베이직 크루넥 스웨트셔츠 화이트', price: 49000, discount: 20, likes: 12930, rating: 4.8, reviews: 2210, badges: ['무료배송'], photo: '1620799140408-edc6dcb6d633', credit: ['Mediamodifier', '7cERndkOyDw'] },
  { id: 'T009', cat: 'tops', sub: '반소매 티셔츠', brand: 'ARCHIVE ROOM', name: '빈티지 레터링 반소매 티셔츠 화이트', price: 42000, discount: 20, likes: 9880, rating: 4.7, reviews: 1420, badges: [], photo: '1529374255404-311a2a4f1fd9', credit: ['Masaaki Komori', '9ugEeqflo70'] },
  { id: 'T010', cat: 'tops', sub: '셔츠',         brand: 'NORTH LANE',   name: '워싱 코튼 오버 셔츠 네이비', price: 89000, discount: 40, likes: 11402, rating: 4.9, reviews: 1980, badges: ['무료배송', '쿠폰'], photo: '1740711152088-88a009e877bb', credit: ['Robert Richman', 'vcTKFYNZop4'] },
  { id: 'T011', cat: 'tops', sub: '니트',         brand: 'SOFT HOUSE',   name: '모헤어 블렌드 루즈핏 니트 크림', price: 89000, discount: 20, likes: 14930, rating: 4.8, reviews: 2541, badges: ['단독'], photo: '1773747310819-ae0ca63f5385', credit: ['Yuliia Pakhomova', 'k8ZHLmyZvvo'] },
  { id: 'T012', cat: 'tops', sub: '니트',         brand: 'BASIC ZERO',   name: '울 블렌드 크루넥 니트 브라운', price: 69000, discount: 30, likes: 19870, rating: 4.9, reviews: 4120, badges: ['무료배송'], photo: '1773747310662-e7cc9e681226', credit: ['Yuliia Pakhomova', 'g3AwbdZut70'] },
  { id: 'T013', cat: 'tops', sub: '후드',         brand: 'MONO GRAM',    name: '피그먼트 다잉 후드 브라운', price: 85000, discount: 25, likes: 7320, rating: 4.7, reviews: 860, badges: [], photo: '1578768079052-aa76e52ff62e', credit: ['Ali Saadat', 'ikLELWYbyxk'] },

  // ---------- 신발 ----------
  { id: 'S001', cat: 'shoes', sub: '스니커즈', brand: 'STEP LAB',    name: '클래식 레더 로우 스니커즈 화이트', price: 89000, discount: 20, likes: 52310, rating: 4.9, reviews: 15420, badges: ['무료배송', '단독'], photo: '1608231387042-66d1773070a5', credit: ['The DK Photography', 'NUoPWImmjCU'] },
  { id: 'S002', cat: 'shoes', sub: '스니커즈', brand: 'STEP LAB',    name: '클래식 레더 로우 스니커즈 블랙', price: 89000, discount: 20, likes: 33120, rating: 4.8, reviews: 8910, badges: ['무료배송'], photo: '1543508282-6319a3e2621f', credit: ['Andres Jasso', 'PqbL_mxmaUE'] },
  { id: 'S003', cat: 'shoes', sub: '러닝화',   brand: 'RUNWAY 9',    name: '플라이 니트 데일리 러닝화 레드', price: 129000, discount: 25, likes: 24510, rating: 4.8, reviews: 4410, badges: ['무료배송'], photo: '1542291026-7eec264c27ff', credit: ['Ryan Waring', '164_6wVEHfI'] },
  { id: 'S004', cat: 'shoes', sub: '부츠',     brand: 'NORTH LANE',  name: '레더 첼시 부츠 브라운', price: 159000, discount: 30, likes: 18230, rating: 4.8, reviews: 2210, badges: ['무료배송', '쿠폰'], photo: '1777987601423-f350ac29b3e9', credit: ['Husien Bisky', 'ju-B5nlGXzE'] },
  { id: 'S005', cat: 'shoes', sub: '러닝화',   brand: 'RUNWAY 9',    name: '니트 경량 러닝화 그레이', price: 109000, discount: 15, likes: 14420, rating: 4.7, reviews: 2980, badges: [], photo: '1562183241-b937e95585b6', credit: ['Martin Katler', 'Y4fKN-RlMV4'] },
  { id: 'S006', cat: 'shoes', sub: '스니커즈', brand: 'SOFT HOUSE',  name: '캔버스 스케이트 스니커즈 버건디', price: 69000, discount: 10, likes: 9820, rating: 4.7, reviews: 1630, badges: ['무료배송'], photo: '1525966222134-fcfa99b8ae77', credit: ['Paul Gaudriault', 'a-QH9MAAVNI'] },
  { id: 'S007', cat: 'shoes', sub: '부츠',     brand: 'MONO GRAM',   name: '사이드 집 레더 부츠 블랙', price: 189000, discount: 35, likes: 21340, rating: 4.9, reviews: 3020, badges: ['무료배송'], photo: '1605732440685-d0654d81aa30', credit: ['mostafa mahmoudi', 'KKsB-eOAjVo'] },
  { id: 'S008', cat: 'shoes', sub: '러닝화',   brand: 'RUNWAY 9',    name: '에어 쿠션 러닝화 화이트 오렌지', price: 139000, discount: 10, likes: 17740, rating: 4.8, reviews: 2940, badges: ['단독'], photo: '1600185365926-3a2ce3cdb9eb', credit: ['Luis Felipe Lins', 'LG88A2XgIXY'] },
  { id: 'S009', cat: 'shoes', sub: '스니커즈', brand: 'STEP LAB',    name: '스웨이드 레트로 스니커즈 브라운', price: 99000, discount: 30, likes: 12110, rating: 4.8, reviews: 1890, badges: ['무료배송', '쿠폰'], photo: '1549298916-b41d501d3772', credit: ['Maksim Larin', 'NOpsC3nWTzY'] },
  { id: 'S010', cat: 'shoes', sub: '부츠',     brand: 'URBAN FIELD', name: '6인치 워크 부츠 휘트', price: 199000, discount: 20, likes: 10230, rating: 4.7, reviews: 1220, badges: [], photo: '1605812860427-4024433a70fd', credit: ['Maxim Hopman', '8cT5ja0P_N4'] },
  { id: 'S011', cat: 'shoes', sub: '러닝화',   brand: 'RUNWAY 9',    name: '카본 플레이트 레이싱 러닝화 볼트', price: 219000, discount: 10, likes: 7740, rating: 4.8, reviews: 940, badges: ['단독'], photo: '1606107557195-0e29a4b5b4aa', credit: ['USAMA AKRAM', 'kP6knT7tjn4'] },
  { id: 'S012', cat: 'shoes', sub: '부츠',     brand: 'NORTH LANE',  name: '레더 레이스업 부츠 다크 브라운', price: 179000, discount: 25, likes: 8930, rating: 4.8, reviews: 1110, badges: ['무료배송'], photo: '1608256246200-53e635b5b65f', credit: ['Zac Wolff', 'esxf7PJmExQ'] },

  // ---------- 바지 ----------
  { id: 'P001', cat: 'pants', sub: '데님',      brand: 'DENIM CLUB',   name: '세미 와이드 데님 팬츠 미드 블루', price: 69000, discount: 30, likes: 45120, rating: 4.9, reviews: 13210, badges: ['무료배송', '단독'], photo: '1714143136372-ddaf8b606da7', credit: ['TuanAnh Blue', '9yoXrG6Er_g'] },
  { id: 'P002', cat: 'pants', sub: '데님',      brand: 'DENIM CLUB',   name: '스트레이트 생지 데님 팬츠 인디고', price: 79000, discount: 25, likes: 29940, rating: 4.8, reviews: 7120, badges: ['무료배송'], photo: '1624378439575-d8705ad7ae80', credit: ['Matthew Moloney', 'YeGao3uk8kI'] },
  { id: 'P003', cat: 'pants', sub: '슬랙스',    brand: 'BASIC ZERO',   name: '세미 와이드 히든밴딩 슬랙스 블랙', price: 45000, discount: 40, likes: 61230, rating: 4.9, reviews: 22140, badges: ['무료배송', '쿠폰'], photo: '1584865288642-42078afe6942', credit: ['Santhosh Vaithiyanathan', 'ylHcWlrMlzs'] },
  { id: 'P004', cat: 'pants', sub: '슬랙스',    brand: 'BASIC ZERO',   name: '와이드 울 블렌드 슬랙스 그레이', price: 59000, discount: 30, likes: 38420, rating: 4.9, reviews: 14320, badges: ['무료배송'], photo: '1493357335960-4583bfa6f8d9', credit: ['Clem Onojeghuo', 'kg3N8vqvMd8'] },
  { id: 'P005', cat: 'pants', sub: '코튼 팬츠', brand: 'ARCHIVE ROOM', name: '테이퍼드 치노 팬츠 베이지', price: 65000, discount: 20, likes: 17840, rating: 4.8, reviews: 3410, badges: ['무료배송'], photo: '1473966968600-fa801b869a1a', credit: ['Redd Francisco', 'jC7nVH_Sw8k'] },
  { id: 'P006', cat: 'pants', sub: '코튼 팬츠', brand: 'SOFT HOUSE',   name: '린넨 블렌드 와이드 팬츠 테라코타', price: 69000, discount: 30, likes: 12910, rating: 4.7, reviews: 2120, badges: ['단독'], photo: '1590159983013-d4ff5fc71c1d', credit: ['engin akyurt', 'RSm7GBuMqos'] },
  { id: 'P007', cat: 'pants', sub: '숏팬츠',    brand: 'DENIM CLUB',   name: '라이트 워싱 데님 쇼츠', price: 49000, discount: 15, likes: 8820, rating: 4.7, reviews: 1220, badges: [], photo: '1591195853828-11db59a44f6b', credit: ['engin akyurt', 'Hd4nlxLgIbA'] },
  { id: 'P008', cat: 'pants', sub: '숏팬츠',    brand: 'URBAN FIELD',  name: '코튼 치노 쇼츠 베이지', price: 39000, discount: 20, likes: 11240, rating: 4.8, reviews: 2030, badges: ['무료배송'], photo: '1612913334025-bedf136f8715', credit: ['Arturo Mendez', 'NWfmptYeOII'] },
  { id: 'P009', cat: 'pants', sub: '코튼 팬츠', brand: 'SOFT HOUSE',   name: '스웨트 조거 팬츠 핑크', price: 55000, discount: 25, likes: 14420, rating: 4.7, reviews: 2810, badges: ['무료배송'], photo: '1594633312681-425c7b97ccd1', credit: ['engin akyurt', '5raPrOhbKQo'] },
  { id: 'P010', cat: 'pants', sub: '데님',      brand: 'NORTH LANE',   name: '빈티지 워싱 루즈핏 데님 라이트 블루', price: 89000, discount: 35, likes: 16010, rating: 4.8, reviews: 2440, badges: ['무료배송', '쿠폰'], photo: '1602293589930-45aad59ba3ab', credit: ['Jason Leung', 'EtOMMg1nSR8'] },
  { id: 'P011', cat: 'pants', sub: '데님',      brand: 'DENIM CLUB',   name: '슬림 스트레이트 블랙 진', price: 69000, discount: 20, likes: 21230, rating: 4.8, reviews: 4410, badges: ['무료배송'], photo: '1718252540617-6ecda2b56b57', credit: ['TuanAnh Blue', 'muo8Zdkz_4w'] },
];

PRODUCTS.forEach(p => {
  p.sizes = p.cat === 'tops' ? TOP_SIZES : p.cat === 'pants' ? PANTS_SIZES : SHOE_SIZES;
  p.sale = Math.round(p.price * (100 - p.discount) / 100 / 100) * 100;
});

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
  return `Photo by <a href="https://unsplash.com/photos/${id}?utm_source=stylebox&utm_medium=referral" target="_blank" rel="noopener">${name}</a> on <a href="https://unsplash.com/?utm_source=stylebox&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a>`;
}
