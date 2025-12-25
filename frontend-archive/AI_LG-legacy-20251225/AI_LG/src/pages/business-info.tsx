import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function BusinessInfo() {
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [company, setCompany] = useState("");
  const [ein, setEin] = useState("");

  useEffect(() => {
    try {
      const v = localStorage.getItem('signup_success');
      if (v === 'true') {
        setSignupSuccess(true);
        localStorage.removeItem('signup_success');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: call API to save business info for 10DLC
    alert('Business info submitted (placeholder)');
  }

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-200px)] flex items-start justify-center py-12">
        <div className="w-full max-w-3xl glass-card p-8 rounded-2xl">
          {signupSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              Account created successfully! Please complete your Business Info for 10DLC registration.
            </div>
          )}

          <h1 className="text-2xl font-bold mb-4">Business Info (10DLC)</h1>
          <p className="text-sm text-muted-foreground mb-6">Complete this form so we can register your brand and campaign for A2P 10DLC compliance.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company / DBA</label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">EIN / Tax ID</label>
              <Input value={ein} onChange={(e) => setEin(e.target.value)} required />
            </div>

            <div className="flex justify-end">
              <Button type="submit">Save Business Info</Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
