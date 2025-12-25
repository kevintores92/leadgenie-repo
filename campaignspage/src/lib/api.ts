const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

// Get auth token from localStorage or session
function getAuthToken() {
  return localStorage.getItem('auth_token') || '';
}

function getOrgId() {
  return localStorage.getItem('organization_id') || '';
}

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-organization-id': getOrgId(),
    ...options.headers,
  };

  const token = getAuthToken();
  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  // Add a timeout so UI doesn't hang indefinitely on network issues
  const controller = new AbortController();
  const timeoutMs = 15000; // 15s
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('Request timed out');
    throw new Error(e.message || 'Network error');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((error as any).error || `HTTP ${response.status}`);
  }

  // Try to parse JSON, but provide fallback
  return response.json().catch(() => ({}));
}

// Contacts
export async function uploadContacts(file: File, templateName?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (templateName) {
    formData.append('templateName', templateName);
  }

  const headers: any = {
    'x-organization-id': getOrgId(),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/contacts/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error((error as any).error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Campaigns
export async function createCampaign(data: any) {
  return apiRequest('/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function startCampaign(id: string, batchSize?: number, intervalMinutes?: number) {
  return apiRequest(`/campaigns/${id}/start`, {
    method: 'POST',
    body: JSON.stringify({ batchSize, intervalMinutes }),
  });
}

export async function getValidatedList(listId: string) {
  return apiRequest(`/lists/validated/${listId}`);
}

export async function createValidatedList(data: any) {
  return apiRequest('/lists/validated', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function validatePhoneNumbers(phoneNumbers: string[], onProgress?: (progress: number) => void) {
  const response = await apiRequest('/phone/validate/bulk', {
    method: 'POST',
    body: JSON.stringify({ phoneNumbers }),
  });
  
  if (onProgress) onProgress(100);
  return response;
}

export async function getWalletBalance() { return apiRequest('/wallet/balance'); }
export async function getOrganization() { return apiRequest('/organization'); }
export async function switchAreaCode(brandId: string, newAreaCode: string, confirmDataLoss: boolean = false) { return apiRequest('/organization/switch-area-code', { method: 'POST', body: JSON.stringify({ brandId, newAreaCode, confirmDataLoss }) }); }
export async function addMarketplace(areaCode: string) { return apiRequest('/organization/add-marketplace', { method: 'POST', body: JSON.stringify({ areaCode }) }); }
