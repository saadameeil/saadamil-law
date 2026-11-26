'use strict';
let adminCsrf = '';
const adminApiPaths = new Set(['/api/dockets.php', '/api/articles.php', '/api/admin-cases.php']);

async function adminSessionStatus() {
  try {
    const response = await fetch('/api/admin-auth.php', {credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer'});
    if (!response.ok) throw new Error('session unavailable');
    const data = await response.json();
    if (data.authenticated !== true || typeof data.csrf !== 'string' || data.csrf.length !== 64) throw new Error('login required');
    adminCsrf = data.csrf;
    return true;
  } catch (_) { location.replace('/admin.html'); return false; }
}

async function adminFetch(path, options = {}) {
  const url = new URL(path, document.baseURI);
  if (url.origin !== location.origin || !adminApiPaths.has(url.pathname) || url.search) throw new Error('Unexpected admin endpoint');
  const headers = new Headers(options.headers || {});
  if ((options.method || 'GET').toUpperCase() !== 'GET') {
    if (!adminCsrf) throw new Error('Missing session token');
    headers.set('X-CSRF-Token', adminCsrf);
  }
  const response = await fetch(url.href, {...options, headers, credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer'});
  if (response.status === 401) { adminCsrf = ''; location.replace('/admin.html'); throw new Error('Session expired'); }
  return response;
}

async function adminLogout() {
  try {
    const response = await fetch('/api/admin-auth.php', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: {'Content-Type': 'application/json', 'X-CSRF-Token': adminCsrf},
      body: JSON.stringify({action: 'logout'})
    });
    if (!response.ok) throw new Error('logout failed');
    adminCsrf = '';
    location.replace('/admin.html');
  } catch (_) { alert('تعذر تأكيد تسجيل الخروج. حاول مجدداً.'); }
}

for (const storage of [sessionStorage, localStorage]) {
  try { storage.removeItem('saad_admin_token'); } catch (_) {}
}
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
