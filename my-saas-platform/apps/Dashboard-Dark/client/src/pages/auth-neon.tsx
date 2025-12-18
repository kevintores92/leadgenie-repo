import { useLocation } from 'wouter';
import { AuthView } from '@neondatabase/neon-js/auth/react';

export function Auth() {
  const [location] = useLocation();
  const pathname = location.split('/').pop() || '';
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md">
        <AuthView mode={pathname as 'sign-in' | 'sign-up'} />
      </div>
    </div>
  );
}
