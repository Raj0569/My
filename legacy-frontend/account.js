const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const tabButtons = document.querySelectorAll('.account-tab');

tabButtons.forEach((button) => button.addEventListener('click', () => {
  const showLogin = button.dataset.panel === 'login-panel';
  loginForm.hidden = !showLogin;
  registerForm.hidden = showLogin;
  tabButtons.forEach((tab) => {
    const active = tab === button;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
}));

function getNextPage() {
  const next = new URLSearchParams(location.search).get('next');
  if (!next) return 'apply.html';
  const resolved = new URL(next, location.href);
  return resolved.origin === location.origin ? `${resolved.pathname.split('/').pop()}${resolved.search}` : 'apply.html';
}

async function handleAccountSubmit(form, endpoint) {
  const feedback = form.querySelector('[data-feedback]');
  const button = form.querySelector('button[type="submit"]');
  feedback.textContent = '';
  if (!form.reportValidity()) return;
  button.disabled = true;
  const data = Object.fromEntries(new FormData(form));
  try {
    const session = await window.admissionApi.request(endpoint, { method: 'POST', body: JSON.stringify(data) });
    window.admissionApi.saveSession(session);
    location.href = getNextPage();
  } catch (error) {
    feedback.textContent = error.message.includes('Failed to fetch')
      ? 'Could not reach the API. Start the server and make sure MongoDB is connected.'
      : error.message;
  } finally {
    button.disabled = false;
  }
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  handleAccountSubmit(loginForm, '/auth/login');
});
registerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  handleAccountSubmit(registerForm, '/auth/register');
});
