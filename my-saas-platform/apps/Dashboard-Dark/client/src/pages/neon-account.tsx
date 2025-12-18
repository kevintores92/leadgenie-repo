import { AccountView } from '@neondatabase/neon-js/auth/react';
import { useLocation } from 'wouter';

export function Account() {
  const [location] = useLocation();
  const pathname = location || '';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <AccountView pathname={pathname} />
      </div>
    </div>
  );
}
