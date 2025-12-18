import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export function Home() {
  const [, setLocation] = useLocation();
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', color: '#fff' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem' }}>Lead Genie</h1>
        <p style={{ fontSize: '1.125rem', marginBottom: '2rem', color: '#999' }}>Scale Your Portfolio, Not Your Overhead</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={() => setLocation('/auth')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0084ff', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem' }}
          >
            Sign In
          </button>
          <button 
            onClick={() => setLocation('/auth')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', color: 'white', border: '1px solid #444', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem' }}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
