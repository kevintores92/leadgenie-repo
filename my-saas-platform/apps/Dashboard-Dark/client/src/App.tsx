import { useEffect, useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/authStore";
import { useSocketStore } from "@/stores/socketStore";

import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import MessengerPage from "@/pages/messenger";
import ContactsPage from "@/pages/contacts";
import SettingsPage from "@/pages/settings";
import CampaignsPage from "@/pages/campaigns";
import DripsPage from "@/pages/drips";
import StatusPage from "@/pages/status";
import NotFound from "@/pages/not-found";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const WS_URL = import.meta.env.VITE_WS_URL || undefined;

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Redirect to="/auth" />;
  }
  
  return <Component />;
}

function Router() {
  const { isAuthenticated } = useAuthStore();
  const { socket, connect } = useSocketStore();

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !socket) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const defaultWs = (() => {
          if (WS_URL) return WS_URL;
          try {
            const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
            return `${proto}://${window.location.host}`;
          } catch (e) {
            return 'ws://localhost:4000';
          }
        })();

        const wsUrl = `${defaultWs}?token=${token}`;
        connect(wsUrl).catch(err => console.error('WebSocket connection failed:', err));
      }
    }
  }, [isAuthenticated, socket, connect]);

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      {isAuthenticated ? (
        <>
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/messages" component={MessengerPage} />
          <Route path="/messenger" component={MessengerPage} />
          <Route path="/contacts" component={ContactsPage} />
          <Route path="/campaigns" component={CampaignsPage} />
          <Route path="/drips" component={DripsPage} />
          <Route path="/status" component={StatusPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/" component={DashboardPage} />
          <Route component={NotFound} />
        </>
      ) : (
        <>
          <Route path="/">
            <Redirect to="/auth" />
          </Route>
          <Route path="/:rest*">
            <Redirect to="/auth" />
          </Route>
        </>
      )}
    </Switch>
  );
}

function App() {
  const [initialized, setInitialized] = useState(false);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const authStore = useAuthStore.getState();
      authStore.setToken(token);
    } else {
      // Ensure persisted auth is cleared when no token present
      const authStore = useAuthStore.getState();
      authStore.logout();
      localStorage.removeItem('auth_token');
    }
    setInitialized(true);
  }, []);

  if (!initialized) return null; // Wait for auth to initialize

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
