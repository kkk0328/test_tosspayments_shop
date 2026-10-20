-- 상품 시드 (기존 js/products.js 하드코딩 데이터에서 생성)

insert into public.categories (key, name, en_name, sizes, sort) values
  ('tops', '상의', 'TOP', array['S', 'M', 'L', 'XL']::text[], 1),
  ('shoes', '신발', 'SHOES', array['240', '250', '260', '270', '280']::text[], 2),
  ('pants', '바지', 'PANTS', array['28', '30', '32', '34', '36']::text[], 3)
on conflict (key) do update set name = excluded.name, en_name = excluded.en_name, sizes = excluded.sizes, sort = excluded.sort;

insert into public.subs (category_key, key, name, sort) values
  ('tops', 'tshirt', '반소매 티셔츠', 1),
  ('tops', 'sweat', '맨투맨', 2),
  ('tops', 'shirt', '셔츠', 3),
  ('tops', 'knit', '니트', 4),
  ('tops', 'hood', '후드', 5),
  ('shoes', 'sneakers', '스니커즈', 1),
  ('shoes', 'running', '러닝화', 2),
  ('shoes', 'boots', '부츠', 3),
  ('pants', 'denim', '데님', 1),
  ('pants', 'slacks', '슬랙스', 2),
  ('pants', 'cotton', '코튼 팬츠', 3),
  ('pants', 'shorts', '숏팬츠', 4)
on conflict (category_key, key) do update set name = excluded.name, sort = excluded.sort;

insert into public.products (id, category_key, sub_key, brand, name, price, discount, likes, rating, reviews, badges, photo, credit_author, credit_id) values
  ('T001', 'tops', 'tshirt', 'DAILY UNIT', '헤비웨이트 오버핏 반소매 티셔츠 화이트', 39000, 30, 48210, 4.9, 12840, array['무료배송', '단독']::text[], '1778671394516-8270eac13c42', 'Avtar Singh', '8ACmRoleM24'),
  ('T002', 'tops', 'tshirt', 'DAILY UNIT', '레터링 프린트 반소매 티셔츠 블랙', 39000, 30, 41022, 4.9, 10322, array['무료배송']::text[], '1583743814966-8936f5b7be1a', 'Faith & Yarn', 'Wr0TpKqf26s'),
  ('T003', 'tops', 'tshirt', 'ARCHIVE ROOM', '서클 로고 반소매 티셔츠 블랙', 42000, 25, 15880, 4.8, 3120, array['단독']::text[], '1618354691373-d851c5c3a990', 'Ryan Hoffman', '6Nub980bI3I'),
  ('T004', 'tops', 'shirt', 'NORTH LANE', '옥스포드 레귤러 셔츠 스카이블루', 59000, 15, 22410, 4.8, 5102, array['무료배송', '쿠폰']::text[], '1623658580851-3b25bf83b4ea', 'Background Foto Pixell Design', 'OsvD4y41C4g'),
  ('T005', 'tops', 'hood', 'URBAN FIELD', '스몰 로고 스웨트 후드 화이트', 79000, 35, 30520, 4.9, 7340, array['무료배송']::text[], '1620799140188-3b2a02fd9a77', 'Mediamodifier', 'kJXGTOY1wLQ'),
  ('T006', 'tops', 'hood', 'URBAN FIELD', '헤비 테리 오버핏 후드 멜란지 그레이', 79000, 35, 27412, 4.8, 6911, array['무료배송']::text[], '1556821840-3a63f95609a7', 'Jannes Jacobs', 'a_KC8ocB650'),
  ('T007', 'tops', 'shirt', 'SOFT HOUSE', '코튼 브로드 레귤러 셔츠 화이트', 69000, 10, 8120, 4.7, 1033, array[]::text[], '1603252109612-24fa03d145c8', 'Nimble Made', 'GDebkNryTd4'),
  ('T008', 'tops', 'sweat', 'MONO GRAM', '베이직 크루넥 스웨트셔츠 화이트', 49000, 20, 12930, 4.8, 2210, array['무료배송']::text[], '1620799140408-edc6dcb6d633', 'Mediamodifier', '7cERndkOyDw'),
  ('T009', 'tops', 'tshirt', 'ARCHIVE ROOM', '빈티지 레터링 반소매 티셔츠 화이트', 42000, 20, 9880, 4.7, 1420, array[]::text[], '1529374255404-311a2a4f1fd9', 'Masaaki Komori', '9ugEeqflo70'),
  ('T010', 'tops', 'shirt', 'NORTH LANE', '워싱 코튼 오버 셔츠 네이비', 89000, 40, 11402, 4.9, 1980, array['무료배송', '쿠폰']::text[], '1740711152088-88a009e877bb', 'Robert Richman', 'vcTKFYNZop4'),
  ('T011', 'tops', 'knit', 'SOFT HOUSE', '모헤어 블렌드 루즈핏 니트 크림', 89000, 20, 14930, 4.8, 2541, array['단독']::text[], '1773747310819-ae0ca63f5385', 'Yuliia Pakhomova', 'k8ZHLmyZvvo'),
  ('T012', 'tops', 'knit', 'BASIC ZERO', '울 블렌드 크루넥 니트 브라운', 69000, 30, 19870, 4.9, 4120, array['무료배송']::text[], '1773747310662-e7cc9e681226', 'Yuliia Pakhomova', 'g3AwbdZut70'),
  ('T013', 'tops', 'hood', 'MONO GRAM', '피그먼트 다잉 후드 브라운', 85000, 25, 7320, 4.7, 860, array[]::text[], '1578768079052-aa76e52ff62e', 'Ali Saadat', 'ikLELWYbyxk'),
  ('S001', 'shoes', 'sneakers', 'STEP LAB', '클래식 레더 로우 스니커즈 화이트', 89000, 20, 52310, 4.9, 15420, array['무료배송', '단독']::text[], '1608231387042-66d1773070a5', 'The DK Photography', 'NUoPWImmjCU'),
  ('S002', 'shoes', 'sneakers', 'STEP LAB', '클래식 레더 로우 스니커즈 블랙', 89000, 20, 33120, 4.8, 8910, array['무료배송']::text[], '1543508282-6319a3e2621f', 'Andres Jasso', 'PqbL_mxmaUE'),
  ('S003', 'shoes', 'running', 'RUNWAY 9', '플라이 니트 데일리 러닝화 레드', 129000, 25, 24510, 4.8, 4410, array['무료배송']::text[], '1542291026-7eec264c27ff', 'Ryan Waring', '164_6wVEHfI'),
  ('S004', 'shoes', 'boots', 'NORTH LANE', '레더 첼시 부츠 브라운', 159000, 30, 18230, 4.8, 2210, array['무료배송', '쿠폰']::text[], '1777987601423-f350ac29b3e9', 'Husien Bisky', 'ju-B5nlGXzE'),
  ('S005', 'shoes', 'running', 'RUNWAY 9', '니트 경량 러닝화 그레이', 109000, 15, 14420, 4.7, 2980, array[]::text[], '1562183241-b937e95585b6', 'Martin Katler', 'Y4fKN-RlMV4'),
  ('S006', 'shoes', 'sneakers', 'SOFT HOUSE', '캔버스 스케이트 스니커즈 버건디', 69000, 10, 9820, 4.7, 1630, array['무료배송']::text[], '1525966222134-fcfa99b8ae77', 'Paul Gaudriault', 'a-QH9MAAVNI'),
  ('S007', 'shoes', 'boots', 'MONO GRAM', '사이드 집 레더 부츠 블랙', 189000, 35, 21340, 4.9, 3020, array['무료배송']::text[], '1605732440685-d0654d81aa30', 'mostafa mahmoudi', 'KKsB-eOAjVo'),
  ('S008', 'shoes', 'running', 'RUNWAY 9', '에어 쿠션 러닝화 화이트 오렌지', 139000, 10, 17740, 4.8, 2940, array['단독']::text[], '1600185365926-3a2ce3cdb9eb', 'Luis Felipe Lins', 'LG88A2XgIXY'),
  ('S009', 'shoes', 'sneakers', 'STEP LAB', '스웨이드 레트로 스니커즈 브라운', 99000, 30, 12110, 4.8, 1890, array['무료배송', '쿠폰']::text[], '1549298916-b41d501d3772', 'Maksim Larin', 'NOpsC3nWTzY'),
  ('S010', 'shoes', 'boots', 'URBAN FIELD', '6인치 워크 부츠 휘트', 199000, 20, 10230, 4.7, 1220, array[]::text[], '1605812860427-4024433a70fd', 'Maxim Hopman', '8cT5ja0P_N4'),
  ('S011', 'shoes', 'running', 'RUNWAY 9', '카본 플레이트 레이싱 러닝화 볼트', 219000, 10, 7740, 4.8, 940, array['단독']::text[], '1606107557195-0e29a4b5b4aa', 'USAMA AKRAM', 'kP6knT7tjn4'),
  ('S012', 'shoes', 'boots', 'NORTH LANE', '레더 레이스업 부츠 다크 브라운', 179000, 25, 8930, 4.8, 1110, array['무료배송']::text[], '1608256246200-53e635b5b65f', 'Zac Wolff', 'esxf7PJmExQ'),
  ('P001', 'pants', 'denim', 'DENIM CLUB', '세미 와이드 데님 팬츠 미드 블루', 69000, 30, 45120, 4.9, 13210, array['무료배송', '단독']::text[], '1714143136372-ddaf8b606da7', 'TuanAnh Blue', '9yoXrG6Er_g'),
  ('P002', 'pants', 'denim', 'DENIM CLUB', '스트레이트 생지 데님 팬츠 인디고', 79000, 25, 29940, 4.8, 7120, array['무료배송']::text[], '1624378439575-d8705ad7ae80', 'Matthew Moloney', 'YeGao3uk8kI'),
  ('P003', 'pants', 'slacks', 'BASIC ZERO', '세미 와이드 히든밴딩 슬랙스 블랙', 45000, 40, 61230, 4.9, 22140, array['무료배송', '쿠폰']::text[], '1584865288642-42078afe6942', 'Santhosh Vaithiyanathan', 'ylHcWlrMlzs'),
  ('P004', 'pants', 'slacks', 'BASIC ZERO', '와이드 울 블렌드 슬랙스 그레이', 59000, 30, 38420, 4.9, 14320, array['무료배송']::text[], '1493357335960-4583bfa6f8d9', 'Clem Onojeghuo', 'kg3N8vqvMd8'),
  ('P005', 'pants', 'cotton', 'ARCHIVE ROOM', '테이퍼드 치노 팬츠 베이지', 65000, 20, 17840, 4.8, 3410, array['무료배송']::text[], '1473966968600-fa801b869a1a', 'Redd Francisco', 'jC7nVH_Sw8k'),
  ('P006', 'pants', 'cotton', 'SOFT HOUSE', '린넨 블렌드 와이드 팬츠 테라코타', 69000, 30, 12910, 4.7, 2120, array['단독']::text[], '1590159983013-d4ff5fc71c1d', 'engin akyurt', 'RSm7GBuMqos'),
  ('P007', 'pants', 'shorts', 'DENIM CLUB', '라이트 워싱 데님 쇼츠', 49000, 15, 8820, 4.7, 1220, array[]::text[], '1591195853828-11db59a44f6b', 'engin akyurt', 'Hd4nlxLgIbA'),
  ('P008', 'pants', 'shorts', 'URBAN FIELD', '코튼 치노 쇼츠 베이지', 39000, 20, 11240, 4.8, 2030, array['무료배송']::text[], '1612913334025-bedf136f8715', 'Arturo Mendez', 'NWfmptYeOII'),
  ('P009', 'pants', 'cotton', 'SOFT HOUSE', '스웨트 조거 팬츠 핑크', 55000, 25, 14420, 4.7, 2810, array['무료배송']::text[], '1594633312681-425c7b97ccd1', 'engin akyurt', '5raPrOhbKQo'),
  ('P010', 'pants', 'denim', 'NORTH LANE', '빈티지 워싱 루즈핏 데님 라이트 블루', 89000, 35, 16010, 4.8, 2440, array['무료배송', '쿠폰']::text[], '1602293589930-45aad59ba3ab', 'Jason Leung', 'EtOMMg1nSR8'),
  ('P011', 'pants', 'denim', 'DENIM CLUB', '슬림 스트레이트 블랙 진', 69000, 20, 21230, 4.8, 4410, array['무료배송']::text[], '1718252540617-6ecda2b56b57', 'TuanAnh Blue', 'muo8Zdkz_4w')
on conflict (id) do update set category_key = excluded.category_key, sub_key = excluded.sub_key, brand = excluded.brand, name = excluded.name,
  price = excluded.price, discount = excluded.discount, likes = excluded.likes, rating = excluded.rating, reviews = excluded.reviews,
  badges = excluded.badges, photo = excluded.photo, credit_author = excluded.credit_author, credit_id = excluded.credit_id;
