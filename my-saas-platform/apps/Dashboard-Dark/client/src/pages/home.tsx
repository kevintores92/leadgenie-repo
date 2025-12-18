import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export function Home() {
  // Neon Auth will handle user state - for now show sign in/up
  const user = null;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 gap-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Lead Genie</h1>
          <p className="text-lg text-slate-300">Scale Your Portfolio, Not Your Overhead.</p>
        </div>
        <div className="flex gap-4">
          <Link to="/auth/sign-in">
            <Button variant="default" size="lg">Sign In</Button>
          </Link>
          <Link to="/auth/sign-up">
            <Button variant="outline" size="lg">Sign Up</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Welcome, {user.email}!</h1>
        <p className="text-lg text-slate-300">You are authenticated with Neon Auth</p>
        <div className="flex gap-4 justify-center">
          <Link to="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
          <Link to="/account/account">
            <Button variant="outline">Account Settings</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
