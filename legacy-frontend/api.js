// Change this value if the Express API runs on a different address.
window.ADMISSION_API_URL = 'http://localhost:5000/api';

window.admissionApi = {
  token() { return localStorage.getItem('northfield-token'); },
  user() {
    try { return JSON.parse(localStorage.getItem('northfield-user') || 'null'); }
    catch { return null; }
  },
  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = this.token();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${window.ADMISSION_API_URL}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Request failed (${response.status}).`);
    return data;
  },
  saveSession(data) {
    localStorage.setItem('northfield-token', data.token);
    localStorage.setItem('northfield-user', JSON.stringify(data.user));
  },
  clearSession() {
    localStorage.removeItem('northfield-token');
    localStorage.removeItem('northfield-user');
  }
};
