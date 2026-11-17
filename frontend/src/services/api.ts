const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('shsms_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Session expired or invalid
    localStorage.removeItem('shsms_token');
    localStorage.removeItem('shsms_user');
    if (!window.location.pathname.includes('/login')) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<any>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async getDemoAccounts() {
    const res = await fetch(`${API_BASE}/auth/demo-accounts`);
    return handleResponse<any>(res);
  },

  // Items & Inventory
  async getItems(category?: string, search?: string) {
    const params = new URLSearchParams();
    if (category && category !== 'ALL') params.append('category', category);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE}/items?${params.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async getItemById(id: string) {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async getItemByQR(code: string) {
    const encoded = encodeURIComponent(code);
    const res = await fetch(`${API_BASE}/items/qr/${encoded}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async getItemBatches(id: string) {
    const res = await fetch(`${API_BASE}/items/${id}/batches`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async createItem(itemData: any) {
    const res = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(itemData),
    });
    return handleResponse<any>(res);
  },

  async updateItem(id: string, itemData: any) {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(itemData),
    });
    return handleResponse<any>(res);
  },

  async receiveStock(id: string, payload: { batchNumber?: string; quantity: number; expiryDate?: string; notes?: string }) {
    const res = await fetch(`${API_BASE}/items/${id}/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async issueStockDirect(id: string, payload: { quantity: number; purpose?: string; selectedBatchId?: string; overrideReason?: string }) {
    const res = await fetch(`${API_BASE}/items/${id}/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async adjustStock(id: string, payload: { batchId: string; quantityChange: number; reason: string }) {
    const res = await fetch(`${API_BASE}/items/${id}/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async getItemLedger(id: string) {
    const res = await fetch(`${API_BASE}/items/${id}/ledger`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async disposeBatch(batchId: string, reason: string) {
    const res = await fetch(`${API_BASE}/items/batches/${batchId}/dispose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ reason }),
    });
    return handleResponse<any>(res);
  },

  // Alerts & Notifications
  async getAlerts(isResolved: boolean = false) {
    const res = await fetch(`${API_BASE}/alerts?isResolved=${isResolved}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async resolveAlert(id: string) {
    const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  // Supply Requests
  async getRequests(status?: string) {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);

    const res = await fetch(`${API_BASE}/requests?${params.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async createRequest(payload: any) {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  // Purchase Orders
  async getPurchaseOrders(status?: string) {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);

    const res = await fetch(`${API_BASE}/purchase-orders?${params.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async createPurchaseOrder(payload: any) {
    const res = await fetch(`${API_BASE}/purchase-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async reviewRequest(id: string, payload: { decision: 'APPROVE' | 'REJECT'; rejectionReason?: string; items?: Array<{ id: string; approvedQty: number }> }) {
    const res = await fetch(`${API_BASE}/requests/${id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async issueRequest(id: string, items: Array<{ requestItemId: string; issueQty: number; selectedBatchId?: string; overrideReason?: string }>) {
    const res = await fetch(`${API_BASE}/requests/${id}/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ items }),
    });
    return handleResponse<any>(res);
  },

  async cancelRequest(id: string) {
    const res = await fetch(`${API_BASE}/requests/${id}/cancel`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async verifyDelivery(poId: string, deliveries: Array<{ poItemId: string; itemId: string; receivedQty: number; condition: string; batchNumber?: string; expiryDate?: string; discrepancyNote?: string }>) {
    const res = await fetch(`${API_BASE}/purchase-orders/${poId}/verify-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ deliveries }),
    });
    return handleResponse<any>(res);
  },

  // Reports (FR-6)
  async getReport(
    reportType: 'stock-availability' | 'consumption' | 'shortages' | 'procurement-performance' | 'wastage',
    params?: { startDate?: string; endDate?: string; category?: string }
  ) {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    if (params?.category && params.category !== 'ALL') qs.append('category', params.category);

    const res = await fetch(`${API_BASE}/reports/${reportType}?${qs.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },
};
