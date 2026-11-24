// Change this if your backend runs somewhere other than localhost:3000
// const API_URL = 'https://event-management-backend-jnpc.onrender.com';
const API_URL = 'https://event-management-live.onrender.com';
function getToken() {
  return localStorage.getItem('token');
}
function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Redirects to login if not authenticated as the required role.
// Call at the top of every dashboard page. Returns the current user, or null (and redirects) if invalid.
function requireRole(role) {
  const token = getToken();
  const user = getUser();
  if (!token || !user || user.role !== role) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

// Generic JSON request
async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

// Multipart request (for image upload)
async function apiRequestForm(path, { method = 'POST', formData, auth = true } = {}) {
  const headers = {};
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: formData });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

const api = {
  // auth
  login: (email, password) => apiRequest('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (name, email, password, role) =>
    apiRequest('/api/auth/register', { method: 'POST', body: { name, email, password, role }, auth: false }),
  me: () => apiRequest('/api/auth/me'),

  // events
  getEvents: () => apiRequest('/api/events'),
  getMyEvents: () => apiRequest('/api/events/my'),
  createEvent: (formData) => apiRequestForm('/api/events', { formData }),
  getEventRegistrations: (id) => apiRequest(`/api/events/${id}/registrations`),
  getEventStats: (id) => apiRequest(`/api/events/${id}/stats`),
  notifyEvent: (id, message) => apiRequest(`/api/events/${id}/notify`, { method: 'POST', body: { message } }),
  registerForEvent: (id) => apiRequest(`/api/events/${id}/register`, { method: 'POST' }),

  // registrations
  getMyRegistrations: () => apiRequest('/api/registrations/my'),

  // notifications
  getMyNotifications: () => apiRequest('/api/notifications/my'),

  // admin
  getOrganizers: (status = 'all') => apiRequest(`/api/admin/organizers?status=${status}`),
  approveOrganizer: (id) => apiRequest(`/api/admin/organizers/${id}/approve`, { method: 'PUT' }),
  revokeOrganizer: (id) => apiRequest(`/api/admin/organizers/${id}/revoke`, { method: 'PUT' }),
  getStudents: () => apiRequest('/api/admin/students'),
  getAllEventsAdmin: () => apiRequest('/api/admin/events'),
  getDashboard: () => apiRequest('/api/admin/dashboard'),
  updateEventImage: (id, formData) => apiRequestForm(`/api/admin/events/${id}/image`, { method: 'PUT', formData }),
};
