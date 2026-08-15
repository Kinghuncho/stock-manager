/* Stock Manager API client — Phase 5.4 */
const API_BASE = window.STOCK_MANAGER_API_URL || 'https://stock-manager-api-1kc3.onrender.com';

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

window.StockManagerAPI = {
  health: () => apiRequest('/health'),
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => apiRequest('/auth/me'),
  stores: () => apiRequest('/auth/stores'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  products: (storeId) => apiRequest(`/stores/${encodeURIComponent(storeId)}/products`),
  createProduct: (storeId, product) => apiRequest(`/stores/${encodeURIComponent(storeId)}/products`, { method: 'POST', body: JSON.stringify(product) }),
  updateProduct: (storeId, productId, product) => apiRequest(`/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}`, { method: 'PATCH', body: JSON.stringify(product) }),
  deleteProduct: (storeId, productId) => apiRequest(`/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}`, { method: 'DELETE' }), purchases: (storeId) => apiRequest(`/stores/${encodeURIComponent(storeId)}/purchases`), createPurchase: (storeId,payload) => apiRequest(`/stores/${encodeURIComponent(storeId)}/purchases`, {method:'POST',body:JSON.stringify(payload)}), sales: (storeId) => apiRequest(`/stores/${encodeURIComponent(storeId)}/sales`), createSale: (storeId,payload) => apiRequest(`/stores/${encodeURIComponent(storeId)}/sales`, {method:'POST',body:JSON.stringify(payload)}), expenses: (storeId) => apiRequest(`/stores/${encodeURIComponent(storeId)}/expenses`), createExpense: (storeId,payload) => apiRequest(`/stores/${encodeURIComponent(storeId)}/expenses`, {method:'POST',body:JSON.stringify(payload)}), dashboard: (storeId) => apiRequest(`/stores/${encodeURIComponent(storeId)}/dashboard`), reports: (storeId,from='',to='') => apiRequest(`/stores/${encodeURIComponent(storeId)}/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  purchases: (storeId, params='') => apiRequest(`/stores/${encodeURIComponent(storeId)}/purchases${params}`),
  createPurchase: (storeId, payload) => apiRequest(`/stores/${encodeURIComponent(storeId)}/purchases`, {method:'POST', body:JSON.stringify(payload)}),
  sales: (storeId, params='') => apiRequest(`/stores/${encodeURIComponent(storeId)}/sales${params}`),
  createSale: (storeId, payload) => apiRequest(`/stores/${encodeURIComponent(storeId)}/sales`, {method:'POST', body:JSON.stringify(payload)}),
  expenses: (storeId, params='') => apiRequest(`/stores/${encodeURIComponent(storeId)}/expenses${params}`),
  createExpense: (storeId, payload) => apiRequest(`/stores/${encodeURIComponent(storeId)}/expenses`, {method:'POST', body:JSON.stringify(payload)})
};

