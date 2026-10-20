-- STYLEBOX 초기 스키마: 카탈로그, 사용자 데이터, 주문/결제 + RLS

-- ---------- 카탈로그 ----------
create table public.categories (
  key      text primary key,
  name     text not null,
  en_name  text not null,
  sizes    text[] not null,            -- 카테고리별 선택 가능 사이즈 (상품 sizes 파생 원본)
  sort     int not null default 0
);

create table public.subs (
  id            bigint generated always as identity primary key,
  category_key  text not null references public.categories(key) on delete cascade,
  key           text not null,
  name          text not null,
  sort          int not null default 0,
  unique (category_key, key)
);

create table public.products (
  id            text primary key,
  category_key  text not null references public.categories(key),
  sub_key       text not null,
  brand         text not null,
  name          text not null,
  price         int not null check (price > 0),                  -- 정가
  discount      int not null default 0 check (discount between 0 and 90),  -- 할인율(%)
  likes         int not null default 0,
  rating        numeric(2,1) not null default 0,
  reviews       int not null default 0,
  badges        text[] not null default '{}',
  photo         text not null,
  credit_author text,
  credit_id     text,
  created_at    timestamptz not null default now(),
  foreign key (category_key, sub_key) references public.subs(category_key, key)
);
create index products_category_idx on public.products (category_key, sub_key);

-- ---------- 사용자 데이터 ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table public.addresses (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  recipient  text not null,
  phone      text not null,
  zip        text,
  address1   text not null,
  address2   text,
  is_default boolean not null default false
);
create index addresses_user_idx on public.addresses (user_id);

create table public.cart_items (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  text not null references public.products(id) on delete cascade,
  size        text not null,
  qty         int not null check (qty between 1 and 99),
  unique (user_id, product_id, size)
);
create index cart_items_product_idx on public.cart_items (product_id);

create table public.likes (
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  text not null references public.products(id) on delete cascade,
  primary key (user_id, product_id)
);
create index likes_product_idx on public.likes (product_id);

-- ---------- 주문 / 결제 ----------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_id         text not null unique,          -- 토스 orderId
  user_id          uuid references auth.users(id), -- 게스트는 null
  guest_email      text,
  guest_phone      text,
  guest_token_hash text,                          -- 게스트 조회 토큰의 sha256 (원문은 저장하지 않음)
  customer_key     text not null,
  status           text not null default 'PENDING' check (status in ('PENDING', 'PAID', 'FAILED', 'CANCELED')),
  total_amount     int not null check (total_amount > 0),
  order_name       text not null,
  mode             text not null check (mode in ('cart', 'buynow')),
  shipping         jsonb not null,                -- 주문자/배송 정보 {name, phone, email, addr1, addr2}
  created_at       timestamptz not null default now(),
  paid_at          timestamptz,
  check (user_id is not null or (guest_email is not null and guest_token_hash is not null))
);
create index orders_user_idx on public.orders (user_id, created_at desc);

create table public.order_items (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  text not null references public.products(id),
  name        text not null,
  size        text not null,
  qty         int not null check (qty between 1 and 99),
  unit_price  int not null check (unit_price > 0)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.payments (
  id           bigint generated always as identity primary key,
  order_id     uuid not null unique references public.orders(id) on delete cascade,
  payment_key  text not null unique,
  method       text,
  amount       int not null,
  approved_at  timestamptz,
  raw          jsonb not null
);

-- ---------- 가입 시 프로필 자동 생성 ----------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------
alter table public.categories  enable row level security;
alter table public.subs        enable row level security;
alter table public.products    enable row level security;
alter table public.profiles    enable row level security;
alter table public.addresses   enable row level security;
alter table public.cart_items  enable row level security;
alter table public.likes       enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.payments    enable row level security;

-- 카탈로그: 누구나 조회, 쓰기는 service_role(대시보드/마이그레이션)만
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy subs_read       on public.subs       for select to anon, authenticated using (true);
create policy products_read   on public.products   for select to anon, authenticated using (true);

-- 사용자 데이터: 본인 행만
create policy profiles_own on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy addresses_own on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy cart_items_own on public.cart_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy likes_own on public.likes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 주문/결제: 회원은 본인 것만 조회. 쓰기 정책 없음(= service_role 전용). 게스트(user_id null)는 anon 조회 불가
create policy orders_read_own on public.orders for select to authenticated
  using (user_id = (select auth.uid()));
create policy order_items_read_own on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = (select auth.uid())));
create policy payments_read_own on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = payments.order_id and o.user_id = (select auth.uid())));

-- 방어선: 테이블 권한 자체도 회수 (RLS와 이중 차단)
revoke insert, update, delete on public.categories, public.subs, public.products from anon, authenticated;
revoke all on public.orders, public.order_items, public.payments from anon;
revoke insert, update, delete on public.orders, public.order_items, public.payments from authenticated;
revoke all on public.profiles, public.addresses, public.cart_items, public.likes from anon;
