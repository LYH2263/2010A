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
    if (j.errors) {
      const msgs = Object.values(j.errors).flat().join('；');
      throw new Error(msgs);
    }
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
    if (j.errors) {
      const msgs = Object.values(j.errors).flat().join('；');
      throw new Error(msgs);
    }
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

export async function adjustInventory(productId, delta, reason = '', productSkuId = null, warehouseId = null) {
  const body = { delta, reason };
  if (productSkuId) body.product_sku_id = productSkuId;
  if (warehouseId) body.warehouse_id = warehouseId;
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

export async function getCoupons(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/coupons' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getCouponCreateMeta() {
  const r = await fetch(BASE + '/coupons/create', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getCouponEditMeta(id) {
  const r = await fetch(BASE + '/coupons/' + id + '/edit', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function createCoupon(data) {
  const r = await fetch(BASE + '/coupons', {
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

export async function updateCoupon(id, data) {
  const r = await fetch(BASE + '/coupons/' + id, {
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

export async function toggleCouponStatus(id) {
  const r = await fetch(BASE + '/coupons/' + id + '/toggle', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function validateCoupon(code, items) {
  const r = await fetch(BASE + '/coupons/validate', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ code, items }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return '/' + url.replace(/^\/+/, '');
}

export async function getProductImageConfig() {
  const r = await fetch(BASE + '/product-images/config', {
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function uploadProductImage(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('image', file);

    const apiBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api';

    xhr.open('POST', apiBase + '/product-images/upload', true);
    xhr.withCredentials = true;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = xhr.status >= 200 && xhr.status < 300 ? JSON.parse(xhr.responseText) : null;
        if (xhr.status >= 200 && xhr.status < 300 && data) {
          resolve(data);
        } else {
          let msg = '上传失败';
          try {
            const err = JSON.parse(xhr.responseText);
            if (err?.message) msg = err.message;
          } catch (_) {}
          reject(new Error(msg));
        }
      } catch (e) {
        reject(new Error('上传响应解析失败'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('网络错误，上传失败')));
    xhr.addEventListener('abort', () => reject(new Error('上传已取消')));

    xhr.send(formData);
  });
}

export async function deleteProductImage(id) {
  const r = await fetch(BASE + '/product-images/' + id, {
    method: 'DELETE',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'DELETE' },
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
}

export async function getSalesReport(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/sales-report' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export function exportSalesReportUrl(params = {}) {
  const q = new URLSearchParams(params).toString();
  return BASE + '/sales-report/export' + (q ? '?' + q : '');
}

export async function getSuppliers(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/suppliers' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getSuppliersActive() {
  const r = await fetch(BASE + '/suppliers/active', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getSupplierCreateMeta() {
  const r = await fetch(BASE + '/suppliers/create', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getSupplierEditMeta(id) {
  const r = await fetch(BASE + '/suppliers/' + id + '/edit', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function createSupplier(data) {
  const r = await fetch(BASE + '/suppliers', {
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

export async function updateSupplier(id, data) {
  const r = await fetch(BASE + '/suppliers/' + id, {
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

export async function deleteSupplier(id) {
  const r = await fetch(BASE + '/suppliers/' + id, {
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

export async function getPurchaseOrders(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/purchase-orders' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getPurchaseOrder(id) {
  const r = await fetch(BASE + '/purchase-orders/' + id, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getPurchaseOrderCreateMeta() {
  const r = await fetch(BASE + '/purchase-orders/create', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getPurchaseOrderEditMeta(id) {
  const r = await fetch(BASE + '/purchase-orders/' + id + '/edit', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function createPurchaseOrder(data) {
  const r = await fetch(BASE + '/purchase-orders', {
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

export async function updatePurchaseOrder(id, data) {
  const r = await fetch(BASE + '/purchase-orders/' + id, {
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

export async function deletePurchaseOrder(id) {
  const r = await fetch(BASE + '/purchase-orders/' + id, {
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

export async function submitPurchaseOrder(id) {
  const r = await fetch(BASE + '/purchase-orders/' + id + '/submit', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function stockInPurchaseOrder(id) {
  const r = await fetch(BASE + '/purchase-orders/' + id + '/stock-in', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getCustomers(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/customers' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getCustomer(id, withOrders = false) {
  const url = BASE + '/customers/' + id + (withOrders ? '?with_orders=1' : '');
  const r = await fetch(url, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getCustomerCreateMeta() {
  const r = await fetch(BASE + '/customers/create', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getCustomerEditMeta(id) {
  const r = await fetch(BASE + '/customers/' + id + '/edit', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function createCustomer(data) {
  const r = await fetch(BASE + '/customers', {
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

export async function updateCustomer(id, data) {
  const r = await fetch(BASE + '/customers/' + id, {
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

export async function deleteCustomer(id) {
  const r = await fetch(BASE + '/customers/' + id, {
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

export async function searchCustomers(keyword = '') {
  const q = new URLSearchParams({ keyword }).toString();
  const r = await fetch(BASE + '/customers/search' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getNotifications(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/notifications' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getNotificationSummary() {
  const r = await fetch(BASE + '/notifications/summary', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getNotificationUnreadCount() {
  const r = await fetch(BASE + '/notifications/unread-count', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getNotification(id) {
  const r = await fetch(BASE + '/notifications/' + id, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function markNotificationRead(id) {
  const r = await fetch(BASE + '/notifications/' + id + '/read', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function markAllNotificationsRead() {
  const r = await fetch(BASE + '/notifications/read-all', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getWarehouses(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/warehouses' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getWarehousesActive() {
  const r = await fetch(BASE + '/warehouses/active', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getWarehouseCreateMeta() {
  const r = await fetch(BASE + '/warehouses/create', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getWarehouse(id) {
  const r = await fetch(BASE + '/warehouses/' + id, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getWarehouseEditMeta(id) {
  const r = await fetch(BASE + '/warehouses/' + id + '/edit', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function createWarehouse(data) {
  const r = await fetch(BASE + '/warehouses', {
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

export async function updateWarehouse(id, data) {
  const r = await fetch(BASE + '/warehouses/' + id, {
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

export async function deleteWarehouse(id) {
  const r = await fetch(BASE + '/warehouses/' + id, {
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

