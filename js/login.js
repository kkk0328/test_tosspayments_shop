/* =========================================================
   로그인 / 회원가입 (Supabase Auth)
   - 이메일 가입은 확인 메일의 링크를 눌러야 로그인됩니다.
   - 카카오·구글 소셜 로그인은 Supabase 대시보드에 제공자가 설정되어 있어야 동작합니다.
   ========================================================= */
renderLayout('');

const loginParams = new URLSearchParams(location.search);
const next = safeNext(loginParams.get('next'));
// 확인 메일·소셜 로그인 후 돌아올 주소 (Supabase Auth > URL Configuration 의 Redirect URLs 에 등록 필요)
const redirectTo = `${location.origin}/login.html?next=${encodeURIComponent(next)}`;
let tab = 'login';

// 같은 사이트의 상대 경로만 허용 (오픈 리다이렉트 방지)
function safeNext(v) {
  if (!v || !/^[\w\-.]+\.html(\?[\w\-=&%.]*)?$/.test(v)) return 'index.html';
  return v.startsWith('login.html') ? 'index.html' : v;
}

const msg = (text, isError = false) => {
  const el = $('#authMsg');
  el.hidden = !text;
  el.textContent = text || '';
  el.classList.toggle('error', isError);
};

const AUTH_ERRORS = {
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 받은 편지함의 확인 메일을 눌러 주세요.',
  'User already registered': '이미 가입된 이메일입니다.',
  'Password should be at least 6 characters.': '비밀번호는 6자 이상이어야 합니다.',
  'Email rate limit exceeded': '메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.',
};
const authError = err => AUTH_ERRORS[err?.message] || err?.message || '알 수 없는 오류가 발생했습니다.';

function setTab(t) {
  tab = t;
  $$('#authTabs [data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  $$('[data-only="signup"]').forEach(el => { el.hidden = t !== 'signup'; });
  $('#authSubmit').textContent = t === 'signup' ? '가입하기' : '로그인';
  $('#authPassword').autocomplete = t === 'signup' ? 'new-password' : 'current-password';
  $('#resendBtn').hidden = true;
  msg('');
}

$('#authTabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (b) setTab(b.dataset.tab);
});

$('#authForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!sb) return msg('Supabase 를 불러오지 못했습니다. 네트워크를 확인해 주세요.', true);

  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg('이메일 형식을 확인해 주세요.', true);
  if (password.length < 6) return msg('비밀번호는 6자 이상이어야 합니다.', true);

  const btn = $('#authSubmit');
  btn.disabled = true;
  try {
    if (tab === 'signup') {
      if (password !== $('#authPassword2').value) return msg('비밀번호 확인이 일치하지 않습니다.', true);
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { emailRedirectTo: redirectTo, data: { name: $('#authName').value.trim() } },
      });
      if (error) return msg(authError(error), true);
      // 이미 가입된 이메일이면 identities 가 빈 배열로 옵니다.
      if (data.user && !data.user.identities?.length) return msg('이미 가입된 이메일입니다. 로그인해 주세요.', true);
      if (data.session) return location.replace(next); // 이메일 인증이 꺼진 프로젝트
      msg(`${email} 으로 확인 메일을 보냈습니다. 메일의 링크를 누르면 가입이 완료되고 자동으로 로그인됩니다.`);
      $('#resendBtn').hidden = false;
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        $('#resendBtn').hidden = error.message !== 'Email not confirmed';
        return msg(authError(error), true);
      }
      location.replace(next);
    }
  } finally {
    btn.disabled = false;
  }
});

$('#resendBtn').addEventListener('click', async () => {
  const email = $('#authEmail').value.trim();
  const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } });
  msg(error ? authError(error) : '확인 메일을 다시 보냈습니다.', !!error);
});

/* ---------- 소셜 로그인 ---------- */
$$('[data-provider]').forEach(b => b.addEventListener('click', async () => {
  if (!sb) return msg('Supabase 를 불러오지 못했습니다.', true);
  const { error } = await sb.auth.signInWithOAuth({ provider: b.dataset.provider, options: { redirectTo } });
  if (error) msg(authError(error), true);
}));

// 대시보드에서 켜지지 않은 제공자는 누르면 Supabase 오류 화면으로 이동하므로 미리 비활성화
(async function checkProviders() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } });
    const { external = {} } = await res.json();
    $$('[data-provider]').forEach(b => {
      if (external[b.dataset.provider]) return;
      b.disabled = true;
      b.title = '관리자가 아직 이 로그인 방식을 설정하지 않았습니다.';
      b.textContent += ' (준비 중)';
    });
  } catch { /* 확인 실패 시 버튼은 그대로 둠 */ }
})();

/* ---------- 이미 로그인 / 인증 리다이렉트 결과 ---------- */
(async function handleSession() {
  // 확인 메일·소셜 로그인 실패 시 Supabase 가 #error_description 또는 ?error_description 으로 돌려보냅니다.
  const hash = new URLSearchParams(location.hash.slice(1));
  const errDesc = hash.get('error_description') || loginParams.get('error_description');
  if (errDesc) msg(`로그인에 실패했습니다: ${errDesc}`, true);

  const user = await Auth.ready;
  if (user) location.replace(next);
  Auth.onChange(u => { if (u) location.replace(next); });
})();
