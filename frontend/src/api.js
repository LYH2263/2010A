const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api';

function headers() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
}

export async function login(email, password) {
  const r = await fetch(BASE + '/login', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || '登录失败');
  }
  return r.json();
}

export async function logout() {
  const r = await fetch(BASE + '/logout', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getMe() {
  const r = await fetch(BASE + '/me', {
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) return null;
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getDashboard() {
  const r = await fetch(BASE + '/', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getProducts(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/products' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getProduct(id) {
  const r = await fetch(BASE + '/products/' + id, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function createProduct(data) {
  const r = await fetch(BASE + '/products', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.status === 204 ? null : r.json();
}

export async function updateProduct(id, data) {
  const r = await fetch(BASE + '/products/' + id, {
    method: 'PUT',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'PUT' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.status === 204 ? null : r.json();
}

export async function deleteProduct(id) {
  const r = await fetch(BASE + '/products/' + id, {
    method: 'DELETE',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'DELETE' },
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
}

export async function getCategories(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/categories' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getCategoriesAll() {
  const data = await getCategories({ per_page: 100 });
  return Array.isArray(data) ? data : (data.data || []);
}

export async function createCategory(data) {
  const r = await fetch(BASE + '/categories', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function updateCategory(id, data) {
  const r = await fetch(BASE + '/categories/' + id, {
    method: 'PUT',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'PUT' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function deleteCategory(id) {
  const r = await fetch(BASE + '/categories/' + id, {
    method: 'DELETE',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'DELETE' },
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const text = await r.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      if (j && j.message) msg = j.message;
    } catch (_) {}
    throw new Error(msg);
  }
}

export async function getOrders(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/orders' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getOrder(id) {
  const r = await fetch(BASE + '/orders/' + id, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function createOrder(data) {
  const r = await fetch(BASE + '/orders', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function updateOrderStatus(orderId, status) {
  const r = await fetch(BASE + '/orders/' + orderId + '/status', {
    method: 'PATCH',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getInventory(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/inventory' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function adjustInventory(productId, delta, reason = '', productSkuId = null) {
  const body = { delta, reason }
  if (productSkuId) body.product_sku_id = productSkuId
  const r = await fetch(BASE + '/inventory/' + productId + '/adjust', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getStockMovements(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/inventory/movements' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getProductsOnSale() {
  const r = await fetch(BASE + '/products?per_page=100', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  const data = await r.json();
  return data.data ?? data;
}

export async function getRefunds(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/refunds' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getRefund(id) {
  const r = await fetch(BASE + '/refunds/' + id, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function createRefund(orderId, data) {
  const r = await fetch(BASE + '/orders/' + orderId + '/refunds', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function approveRefund(refundId, auditRemark = '') {
  const r = await fetch(BASE + '/refunds/' + refundId + '/approve', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ audit_remark: auditRemark }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function rejectRefund(refundId, auditRemark) {
  const r = await fetch(BASE + '/refunds/' + refundId + '/reject', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ audit_remark: auditRemark }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}
