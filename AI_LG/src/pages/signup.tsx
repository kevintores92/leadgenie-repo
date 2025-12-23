import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/layout/AppLayout";
import { Shield, Eye, EyeOff, Loader2, CheckCircle2, MessageSquare, Phone, Zap } from "lucide-react";
import * as api from "@/lib/api";

// PayPal types
declare global {
  interface Window {
    paypal: any;
  }
}

export default function SignUp() {
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [step, setStep] = useState<"account" | "subscription">("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const paypalRef = useRef<HTMLDivElement>(null);
  const [paypalRendered, setPaypalRendered] = useState(false);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    // Skip verification and go directly to subscription
    setStep("subscription");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // verification removed

  const handleSubscriptionApproval = async (subscriptionId: string) => {
    setLoading(true);
    
    try {
      // Create account after subscription approval and attach subscription
      await api.signup(email, password, businessName, subscriptionId, 'PAYPAL');
      // Store subscription ID locally
      try { localStorage.setItem('paypal_subscription_id', subscriptionId); } catch (_) {}
      // Flag for showing a success message on the Business Info page
      try { localStorage.setItem('signup_success', 'true'); } catch(_) {}
      navigate("/register");
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Render PayPal subscription button when on subscription step
  useEffect(() => {
    if (step === "subscription" && paypalRef.current && !paypalRendered && window.paypal) {
      setPaypalRendered(true);
      
      window.paypal.Buttons({
        style: {
          shape: 'rect',
          color: 'gold',
          layout: 'vertical',
          label: 'subscribe',
          height: 48
        },
        createSubscription: function(data: any, actions: any) {
          return actions.subscription.create({
            plan_id: 'P-3KG33042G61540411NFE25OI'
          });
        },
        onApprove: function(data: any) {
          handleSubscriptionApproval(data.subscriptionID);
        },
        onError: function(err: any) {
          console.error('PayPal subscription error:', err);
          setError('Failed to process subscription. Please try again.');
          setPaypalRendered(false);
        }
      }).render(paypalRef.current);
    }
  }, [step, paypalRendered]);

  // Reset rendered flag when leaving subscription so PayPal can re-render when navigating back
  useEffect(() => {
    if (step !== 'subscription' && paypalRendered) {
      setPaypalRendered(false);
    }
  }, [step]);

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl"
        >
            {/* Tabs: Sign Up / Sign In */}
            <div className="flex gap-2 mb-6 max-w-md mx-auto">
              <button
                className={`flex-1 h-10 rounded-md ${authMode === 'signup' ? 'bg-primary text-white' : 'bg-card'}`}
                onClick={() => setAuthMode('signup')}
                aria-pressed={authMode === 'signup'}
              >
                Sign Up
              </button>
              <button
                className={`flex-1 h-10 rounded-md ${authMode === 'signin' ? 'bg-primary text-white' : 'bg-card'}`}
                onClick={() => setAuthMode('signin')}
                aria-pressed={authMode === 'signin'}
              >
                Sign In
              </button>
            </div>

            {authMode === 'signin' ? (
              <div className="glass-card p-8 rounded-2xl max-w-md mx-auto">
                <h2 className="text-2xl font-bold mb-4">Sign In</h2>
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
                )}
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                    <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                    <Input id="signin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full">{loading ? 'Signing in...' : 'Sign In'}</Button>
                  <div className="text-center text-sm text-muted-foreground mt-3">
                    <button type="button" className="underline" onClick={() => setAuthMode('signup')}>Create an account</button>
                  </div>
                </form>
              </div>
            ) : (
              // existing signup flow continues
              <>
          {step === "account" ? (
            // Step 1: Account Creation
            <div className="glass-card p-8 rounded-2xl max-w-md mx-auto">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-primary/30 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-center mb-2">Create Account</h1>
              <p className="text-center text-muted-foreground mb-8">
                Start your autonomous lead generation journey
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-sm font-medium">
                    Business Name
                  </Label>
                  <Input
                    id="businessName"
                    data-testid="input-businessname"
                    type="text"
                    placeholder="Your Company LLC"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    data-testid="input-email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                  />
                </div>

                {/* Phone/email verification removed */}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      data-testid="input-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="glass-card border-white/10 focus:border-primary focus:bg-white/5 pr-10"
                    />
                    <button
                      type="button"
                      data-testid="button-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    data-testid="input-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                  />
                </div>

                <Button
                  data-testid="button-continue"
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold mt-6"
                >
                  {loading ? "Processing..." : "Continue to Subscription"}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                By signing up, you agree to our Terms of Service
              </p>
            </div>
          ) : (
            // Step 3: Subscription Selection
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <button
                  onClick={() => setStep("account")}
                  className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2"
                >
                  ← Back
                </button>
                <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Simple, transparent pricing. Get started with AI-powered lead generation.
                </p>
              </motion.div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm max-w-2xl mx-auto">
                  {error}
                </div>
              )}

              {/* Subscription Plan Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-2xl p-8 border-2 border-primary/50 relative overflow-hidden max-w-2xl mx-auto"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-sm font-medium text-primary mb-2">Monthly Subscription</div>
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold">$49</span>
                        <span className="text-muted-foreground ml-2">/month</span>
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-primary/30 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">10DLC Registration</div>
                        <div className="text-sm text-muted-foreground">Brand + Campaign compliance ($19 carrier fee at cost)</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">8-12 Dedicated Phone Numbers</div>
                        <div className="text-sm text-muted-foreground">Voice + SMS numbers for campaigns</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">Platform Access</div>
                        <div className="text-sm text-muted-foreground">Dashboard, analytics, campaign management</div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-4 rounded-lg border border-white/10 mb-6">
                    <div className="text-sm font-medium mb-3">Usage-Based Charges (Pay As You Go)</div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        <span>SMS: $0.025 each Includes SMS Service($0.01), Carrier Fees($0.005), AI Classification & AI Replies ($0.005), Phone Verification & A portion goes to Lead Genie.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-400" />
                        <span>Voice Calls: $0.20/minute (includes AI + carrier)</span>
                      </div>
                    </div>
                  </div>

                  {/* PayPal Subscription Button */}
                  <div ref={paypalRef} className="w-full min-h-[48px]" />
                  
                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating your account...
                    </div>
                  )}

                  <p className="text-center text-xs text-muted-foreground mt-4">
                    💡 Cancel anytime. Secure payment processed by PayPal.
                  </p>
                </div>
              </motion.div>
            </div>
            </>
            )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
