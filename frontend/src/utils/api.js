export const STUDENT_TOKEN = 'northfield-token';
export const STUDENT_USER = 'northfield-user';
export const ADMIN_TOKEN = 'northfield-admin-token';
export const ADMIN_USER = 'northfield-admin-user';

export async function api(path, options = {}, admin = false) {
  const token = localStorage.getItem(admin ? ADMIN_TOKEN : STUDENT_TOKEN);
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status}).`);
  return data;
}

