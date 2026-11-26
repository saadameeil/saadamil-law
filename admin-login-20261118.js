'use strict';
(() => {
  const form = document.getElementById('login-form');
  const password = document.getElementById('password');
  const button = document.getElementById('login-button');
  const message = document.getElementById('message');
  let csrf = '';
  let busy = false;
  // Remove only the former authentication values; preserve the owner's drafts.
  for (const storage of [sessionStorage, localStorage]) {
    try { storage.removeItem('saad_admin_token'); } catch (_) {}
  }
  async function session() {
    const response = await fetch('/api/admin-auth.php', {credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer'});
    if (!response.ok) throw new Error('unavailable');
    const data = await response.json();
    if (data.authenticated === true) { location.replace('/api/admin-panel.php'); return; }
    if (typeof data.csrf !== 'string' || data.csrf.length !== 64) throw new Error('unavailable');
    csrf = data.csrf;
    button.disabled = false;
    message.textContent = '';
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !csrf) return;
    busy = true;
    button.disabled = true;
    message.textContent = 'جارٍ التحقق…';
    try {
      const response = await fetch('/api/admin-auth.php', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer',
        headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrf},
        body: JSON.stringify({action: 'login', password: password.value})
      });
      password.value = '';
      const data = await response.json();
      if (response.ok && data.authenticated === true) { location.replace('/api/admin-panel.php'); return; }
      message.textContent = response.status === 429 ? 'محاولات كثيرة. انتظر 15 دقيقة ثم حاول مجدداً.' :
        response.status === 401 ? 'كلمة المرور غير صحيحة.' : 'تعذر تسجيل الدخول. حدّث الصفحة وحاول مجدداً.';
    } catch (_) { password.value = ''; message.textContent = 'تعذر الاتصال بالخادم. حاول مجدداً.'; }
    finally { busy = false; button.disabled = false; }
  });
  session().catch(() => { message.textContent = 'تسجيل الدخول غير متاح حالياً. حاول لاحقاً.'; });
})();
