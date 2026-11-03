const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
fetch('/api/me').then((response) => { if (response.ok) window.location.href = '/admin.html'; });
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); loginMessage.textContent = 'Signing you in…';
  const body = Object.fromEntries(new FormData(loginForm));
  const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) { loginMessage.textContent = result.error || 'Unable to sign in.'; return; }
  window.location.href = '/admin.html';
});
