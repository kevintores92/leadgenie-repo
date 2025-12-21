const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth
export async function login(email: string, password: string) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  if (data.token) {
    localStorage.setItem('auth_token', data.token);
  }
  if (data.organizationId) {
    localStorage.setItem('organization_id', data.organizationId);
  }
  
  return data;
}

export async function signup(email: string, password: string, businessName: string) {
  const data = await apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, businessName }),
  });
  
  if (data.token) {
    localStorage.setItem('auth_token', data.token);
  }
  if (data.organizationId) {
    localStorage.setItem('organization_id', data.organizationId);
  }
  
  return data;
}

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('organization_id');
}

// Contacts
export async function getContacts(filters?: any) {
  const queryParams = new URLSearchParams(filters).toString();
  return apiRequest(`/contacts${queryParams ? `?${queryParams}` : ''}`);
}

export async function uploadContacts(file: File, templateName?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (templateName) {
    formData.append('templateName', templateName);
  }

  const headers = {
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
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Campaigns
export async function getCampaigns() {
  return apiRequest('/campaigns');
}

export async function getCampaign(id: string) {
  return apiRequest(`/campaigns/${id}`);
}

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

export async function simulateCampaign(id: string) {
  return apiRequest(`/campaigns/${id}/simulate`, {
    method: 'POST',
  });
}

// Dashboard Stats
export async function getDashboardStats() {
  return apiRequest('/stats/dashboard');
}

export async function getSmsStats(campaignId?: string) {
  const query = campaignId ? `?campaignId=${campaignId}` : '';
  return apiRequest(`/stats/sms${query}`);
}

export async function getLeadsBreakdown(campaignId?: string) {
  const query = campaignId ? `?campaignId=${campaignId}` : '';
  return apiRequest(`/stats/leads${query}`);
}

// Settings
export async function getSettings() {
  return apiRequest('/settings');
}

export async function updateSettings(settings: any) {
  return apiRequest('/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

// Wallet
export async function getWalletBalance() {
  return apiRequest('/wallet/balance');
}

export async function getUsageSummary() {
  return apiRequest('/wallet/usage/summary');
}

export async function topupWallet(amount: number) {
  return apiRequest('/wallet/topup', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}
