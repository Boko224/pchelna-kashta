const TOKEN_KEY = 'admin_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

async function request(method, url, body, auth = false) {
  const headers = {};
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new Error('Няма връзка със сървъра');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (auth && res.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event('admin-logout'));
    }
    throw new Error(data?.error || `Грешка ${res.status}`);
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
};

const A = '/api/admin';
export const adminApi = {
  get: (url) => request('GET', A + url, undefined, true),
  post: (url, body) => request('POST', A + url, body, true),
  put: (url, body) => request('PUT', A + url, body, true),
  patch: (url, body) => request('PATCH', A + url, body, true),
  delete: (url) => request('DELETE', A + url, undefined, true),
};

export async function adminLogin(email, password) {
  const data = await request('POST', `${A}/login`, { email, password });
  setToken(data.token);
  return data.admin;
}

export function adminLogout() {
  setToken(null);
}
