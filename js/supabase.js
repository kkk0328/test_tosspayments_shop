/* =========================================================
   Supabase 클라이언트 + 인증 상태
   - URL / publishable(anon) 키는 공개 가능한 값입니다. 데이터는 RLS 정책이 보호합니다.
   - service_role 키는 절대 이 파일(브라우저)에 넣지 마세요. server.js 환경 변수 전용입니다.
   ========================================================= */
const SUPABASE_URL = 'https://iftcupnhdudjovfbjcnk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RCovi1bIl-egNwgIr95B0g_IRLZF3QI';

// supabase-js CDN(UMD)이 로드되지 않으면 null → 각 화면에서 오류 안내를 표시합니다.
const sb = window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const Auth = {
  user: null,
  listeners: [],
  ready: null,
  // 로그인/로그아웃으로 사용자가 바뀔 때 호출 (최초 세션 확인은 ready 로 기다립니다)
  onChange(fn) { this.listeners.push(fn); },
  async token() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session?.access_token || null;
  },
  async signOut() {
    if (sb) await sb.auth.signOut();
  },
};

Auth.ready = (async () => {
  if (!sb) return null;
  // getSession 은 URL 의 인증 결과(가입 확인 메일·소셜 로그인 리다이렉트)도 처리합니다.
  const { data } = await sb.auth.getSession();
  Auth.user = data.session?.user ?? null;
  sb.auth.onAuthStateChange((event, session) => {
    const prev = Auth.user?.id;
    Auth.user = session?.user ?? null;
    // 콜백 안에서 supabase 호출을 기다리면 교착될 수 있어 다음 틱으로 넘깁니다.
    if (prev !== Auth.user?.id) setTimeout(() => Auth.listeners.forEach(fn => fn(Auth.user, event)));
  });
  return Auth.user;
})().catch(err => {
  console.error('[auth]', err);
  return null;
});
