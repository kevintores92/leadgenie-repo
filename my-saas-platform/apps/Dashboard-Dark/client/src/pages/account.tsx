import { useLocation } from 'wouter';
import { AccountView } from '@neondatabase/neon-js/auth/react';

export function Account() {
  const [location] = useLocation();
  const pathname = location.split('/').pop() || '';
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md">
        <AccountView mode={pathname as 'account' | 'reset-password'} />
      </div>
    </div>
  );
}
