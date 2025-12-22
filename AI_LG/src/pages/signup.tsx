import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/layout/AppLayout";
import { Shield, Eye, EyeOff, Loader2, CheckCircle2, MessageSquare, Phone, Zap } from "lucide-react";
import * as api from "@/lib/api";

export default function SignUp() {
  const [step, setStep] = useState<"account" | "subscription">("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

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
    
    // Move to subscription step
    setStep("subscription");
  };

  const handleSubscriptionSelect = async () => {
    setLoading(true);
    
    try {
      await api.signup(email, password, businessName);
      // After signup, user will be redirected to PayPal for subscription approval
      navigate("/business-info");
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl"
        >
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
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold mt-6"
                >
                  Continue to Plan Selection
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                By signing up, you agree to our Terms of Service
              </p>
            </div>
          ) : (
            // Step 2: Subscription Selection
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
                        <div className="font-medium">6-8 Dedicated Phone Numbers</div>
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
                        <span>SMS: $0.02 each (includes AI classification + replies)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-400" />
                        <span>Voice Calls: $0.20/minute (includes AI + carrier)</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubscriptionSelect}
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold text-lg"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating Account...
                      </span>
                    ) : (
                      "Start with $49/month"
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground mt-4">
                    💡 Cancel anytime. First month includes full platform access.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
