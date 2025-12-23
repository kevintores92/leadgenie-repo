const API_URL = import.meta.env.VITE_API_URL || 'https://api.leadgenie.online';

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

export async function signup(email: string, password: string, businessName: string, subscriptionId?: string, subscriptionProvider?: string, planId?: string) {
  const body: any = {
    username: email.split('@')[0], // Use email prefix as username
    email,
    password,
    organizationName: businessName
  };
  if (subscriptionId) {
    body.subscriptionId = subscriptionId;
    if (subscriptionProvider) body.subscriptionProvider = subscriptionProvider;
    if (planId) body.planId = planId;
  }

  const data = await apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  if (data.token) {
    localStorage.setItem('auth_token', data.token);
  }
  // Backend returns user.orgId, not organizationId
  if (data.user?.orgId) {
    localStorage.setItem('organization_id', data.user.orgId);
  } else if (data.organization?.id) {
    localStorage.setItem('organization_id', data.organization.id);
  }
  
  return data;
}

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('organization_id');
}

// Verification APIs
export async function sendPhoneVerification(phoneNumber: string) {
  return await apiRequest('/verification/phone/send', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
}

export async function verifyPhone(phoneNumber: string, code: string) {
  return await apiRequest('/verification/phone/verify', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, code }),
  });
}

export async function sendEmailVerification(email: string) {
  return await apiRequest('/verification/email/send', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyEmail(email: string, code: string) {
  return await apiRequest('/verification/email/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
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

export async function pauseCampaign(id: string) {
  return apiRequest(`/campaigns/${id}/pause`, {
    method: 'POST',
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

// Organization / Business Info
export async function updateBusinessInfo(data: {
  legalName: string;
  dbaName?: string;
  businessType: string;
  ein?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
}) {
  return apiRequest('/organization/business-info', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getBusinessInfo() {
  return apiRequest('/organization/business-info');
}

// Validated Lists
export async function saveValidatedList(data: {
  fileName: string;
  totalRows: number;
  verifiedMobile: number;
  verifiedLandline: number;
  validatedData: any[];
}) {
  return apiRequest('/lists/validated', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createValidatedList(data: {
  fileName: string;
  totalRows: number;
  verifiedMobile: number;
  verifiedLandline: number;
  validatedData: string;
}) {
  return apiRequest('/lists/validated', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getValidatedList(listId: string) {
  return apiRequest(`/lists/validated/${listId}`);
}

export async function getValidatedLists() {
  return apiRequest('/lists/validated');
}

// Phone Validation
export async function validatePhoneNumbers(phoneNumbers: string[], onProgress?: (progress: number) => void) {
  const response = await apiRequest('/phone/validate/bulk', {
    method: 'POST',
    body: JSON.stringify({ phoneNumbers }),
  });
  
  // Simulate progress if callback provided
  if (onProgress) {
    onProgress(100);
  }
  
  return response;
}

// Organization
export async function getOrganization() {
  return apiRequest('/organization');
}

export async function switchAreaCode(brandId: string, newAreaCode: string, confirmDataLoss: boolean = false) {
  return apiRequest('/organization/switch-area-code', {
    method: 'POST',
    body: JSON.stringify({ brandId, newAreaCode, confirmDataLoss }),
  });
}

export async function addMarketplace(areaCode: string) {
  return apiRequest('/organization/add-marketplace', {
    method: 'POST',
    body: JSON.stringify({ areaCode }),
  });
}

export async function addSubaccount(businessInfo: any) {
  return apiRequest('/organization/add-subaccount', {
    method: 'POST',
    body: JSON.stringify(businessInfo),
  });
}

// Voice
export async function getVoiceToken(identity?: string) {
  return apiRequest('/voice/token', {
    method: 'POST',
    body: JSON.stringify({ identity }),
  });
}
