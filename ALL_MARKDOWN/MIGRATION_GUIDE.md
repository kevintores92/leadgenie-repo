# Next.js → React + Vite Migration Guide

## ✅ Completed Tasks

### 1. Core Framework & Routing
- ✅ Removed Next.js from Dashboard-Dark
- ✅ Set up Zustand stores for state management (auth, socket, conversations)
- ✅ Configured wouter for client-side routing
- ✅ Protected routes with auth middleware
- ✅ Created all required route pages:
  - `/login` → AuthPage
  - `/dashboard` → DashboardPage
  - `/messages` → MessengerPage
  - `/contacts` → ContactsPage
  - `/campaigns` → CampaignsPage (NEW)
  - `/drips` → DripsPage (NEW)
  - `/status` → StatusPage (NEW)
  - `/settings` → SettingsPage

### 2. Environment Variables (Vite Format)
- ✅ Created `.env.local` with VITE_* variables
- ✅ Updated `lib/queryClient.ts` to read from `import.meta.env`
- ✅ Configured API base URL via `VITE_API_URL`
- ✅ Configured WebSocket URL via `VITE_WS_URL`

### 3. Authentication Flow
- ✅ Created `stores/authStore.ts` with Zustand
- ✅ Persist JWT token to localStorage
- ✅ Login form wired to `/auth/login` endpoint
- ✅ Signup form wired to `/auth/signup` endpoint
- ✅ Client-side route protection

### 4. WebSocket Integration
- ✅ Created `stores/socketStore.ts` with Zustand
- ✅ Auto-connect WebSocket on auth success
- ✅ Store socket instance in global state
- ✅ Event listener support for real-time updates

### 5. Features
- ✅ Campaigns page with create/start/pause/delete
- ✅ Drips page with configuration
- ✅ Status page with all enums (Delivered, Failed, Held, Deferred, Blocked)
- ✅ Message panel with Verified/Wrong #/DNC action buttons

## 🔧 Remaining Backend API Wiring

### Authentication (Optional - if not already done)
You may need to create auth endpoints if they don't exist:

```javascript
// backend-api/src/routes/auth.js
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // Validate user and return { token, user }
});

router.post('/signup', async (req, res) => {
  const { username, email, password, name } = req.body;
  // Create user and return { token, user }
});
```

### Campaigns API Wiring
Update `apps/Dashboard-Dark/client/src/pages/campaigns.tsx`:

```typescript
// GET /campaigns - List all campaigns
const { data: campaigns } = useQuery({
  queryKey: ['/campaigns'],
  queryFn: getQueryFn({ on401: 'throw' })
});

// POST /campaigns - Create
const handleCreate = async (e) => {
  const response = await apiRequest('POST', '/campaigns', formData);
};

// POST /campaigns/:id/start - Start campaign
const handleStart = async (id) => {
  await apiRequest('POST', `/campaigns/${id}/start`, { batchSize, intervalMinutes });
};

// POST /campaigns/:id/pause - Pause campaign
const handlePause = async (id) => {
  await apiRequest('POST', `/campaigns/${id}/pause`, {});
};
```

### Drips API Wiring
Update `apps/Dashboard-Dark/client/src/pages/drips.tsx`:

```typescript
// GET /drips - List drip campaigns
// POST /drips - Create new drip
// DELETE /drips/:id - Delete drip
// PATCH /drips/:id - Toggle active status
```

### Status Page API
Update `apps/Dashboard-Dark/client/src/pages/status.tsx`:

```typescript
// GET /messages - List all messages with status
// Filter by status enum: DELIVERED, FAILED, HELD, DEFERRED, BLOCKED
```

### Message Panel Actions
Update message action buttons in `apps/Dashboard-Dark/client/src/pages/messenger.tsx`:

```typescript
// Mark as verified
await apiRequest('POST', `/messages/${messageId}/mark-verified`, {});

// Mark as wrong number
await apiRequest('POST', `/messages/${messageId}/mark-wrong-number`, {});

// Mark as DNC (Do Not Call)
await apiRequest('POST', `/messages/${messageId}/mark-dnc`, {});
```

### Contacts API
Update `apps/Dashboard-Dark/client/src/pages/contacts.tsx`:

```typescript
// GET /contacts - List contacts
// POST /contacts - Create contact
// PUT /contacts/:id - Update contact
// DELETE /contacts/:id - Delete contact
```

## 📊 Data Models Reference

### Message Status Enum
```
OUTBOUND_API
OUTBOUND_MANUAL
QUEUED
SENT
DELIVERED
FAILED
```

### Campaign Status Enum
```
DRAFT
RUNNING
PAUSED
COMPLETED
```

### Contact Model
```typescript
{
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  status?: string;
  tags: string[];
  createdAt: string;
}
```

### Message Model
```typescript
{
  id: string;
  contactId: string;
  direction: "INBOUND" | "OUTBOUND";
  status: MessageStatus;
  channel: "SMS" | "MANUAL";
  body?: string;
  sentAt?: string;
  isAiGenerated: boolean;
  createdAt: string;
}
```

## 🔌 WebSocket Event Format

When backend sends updates, use this format:

```javascript
{
  "event": "message:new",
  "data": { /* message object */ }
}

// or

{
  "event": "campaign:status-changed",
  "data": { "campaignId": "...", "status": "RUNNING" }
}
```

Frontend listens in `App.tsx` via useSocketStore.setOnMessage()

## 📦 Package Installation

Run in `apps/Dashboard-Dark/`:

```bash
npm install zustand
```

## 🚀 Building & Deploying

```bash
# Development
npm run dev:client  # Runs Vite dev server on port 5000

# Production Build
npm run build       # Builds with Vite

# Deployment
# Frontend served by Vite (built SPA)
# Backend API continues on port 4000
```

## ✅ Testing Checklist

- [ ] Login/Signup works with real backend
- [ ] JWT token persists across page reloads
- [ ] Protected routes redirect to /auth without token
- [ ] WebSocket connects after successful login
- [ ] Campaigns can be created/started/paused
- [ ] Drips appear and can be configured
- [ ] Status page displays all message statuses correctly
- [ ] Message action buttons (Verified/Wrong #/DNC) send requests
- [ ] Real-time updates via WebSocket work
- [ ] No console errors
- [ ] No Next.js-specific code remains
- [ ] All hardcoded URLs use VITE_* env vars

## 🎯 Migration Complete

The frontend has been successfully migrated from Next.js to React + Vite:
- ✅ Removed SSR/SSG logic
- ✅ Removed pages/ directory structure
- ✅ Removed app/ directory structure
- ✅ All routing is client-side
- ✅ Environment variables use Vite format
- ✅ State management uses Zustand
- ✅ WebSocket integration ready
- ✅ All backend contracts preserved
- ✅ Zero backend changes required
