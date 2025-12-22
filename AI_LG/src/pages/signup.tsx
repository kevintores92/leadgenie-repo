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
  const [step, setStep] = useState<"account" | "verify" | "subscription">("account");
  const [verificationType, setVerificationType] = useState<"phone" | "email">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
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
    
    // Move to verification step
    setLoading(true);
    try {
      if (verificationType === "phone") {
        if (!phone) {
          setError("Phone number is required");
          setLoading(false);
          return;
        }
        await api.sendPhoneVerification(phone);
      } else {
        await api.sendEmailVerification(email);
      }
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (verificationType === "phone") {
        const result = await api.verifyPhone(phone, verificationCode);
        if (!result.verified) {
          setError("Invalid verification code");
          setLoading(false);
          return;
        }
      } else {
        const result = await api.verifyEmail(email, verificationCode);
        if (!result.verified) {
          setError("Invalid verification code");
          setLoading(false);
          return;
        }
      }
      
      // Verification successful, move to subscription
      setStep("subscription");
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionApproval = async (subscriptionId: string) => {
    setLoading(true);
    
    try {
      // Create account after subscription approval
      await api.signup(email, password, businessName);
      // Store subscription ID
      localStorage.setItem('paypal_subscription_id', subscriptionId);
      navigate("/business-info");
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
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Phone Number (Optional - for SMS verification)
                  </Label>
                  <Input
                    id="phone"
                    data-testid="input-phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                  />
                </div>

                {/* Verification Method Toggle */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Verify via</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={verificationType === "email" ? "default" : "outline"}
                      onClick={() => setVerificationType("email")}
                      className="flex-1"
                    >
                      Email
                    </Button>
                    <Button
                      type="button"
                      variant={verificationType === "phone" ? "default" : "outline"}
                      onClick={() => setVerificationType("phone")}
                      disabled={!phone}
                      className="flex-1"
                    >
                      SMS
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {verificationType === "phone" 
                      ? "We'll send a verification code to your phone" 
                      : "We'll send a verification code to your email"}
                  </p>
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
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold mt-6"
                >
                  {loading ? "Sending Code..." : "Continue to Verification"}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                By signing up, you agree to our Terms of Service
              </p>
            </div>
          ) : step === "verify" ? (
            // Step 2: Verification
            <div className="glass-card p-8 rounded-2xl max-w-md mx-auto">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-blue-600/20 border border-green-500/30 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-green-400" />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-center mb-2">Verify Your {verificationType === "phone" ? "Phone" : "Email"}</h1>
              <p className="text-center text-muted-foreground mb-8">
                Enter the verification code sent to<br />
                <span className="font-semibold">{verificationType === "phone" ? phone : email}</span>
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerificationSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-sm font-medium">
                    Verification Code
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    required
                    className="glass-card border-white/10 focus:border-primary focus:bg-white/5 text-center text-2xl tracking-widest"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full h-11 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 font-semibold"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setStep("account")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleAccountSubmit}
                    disabled={loading}
                    className="text-primary hover:text-primary/80"
                  >
                    Resend Code
                  </button>
                </div>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Code expires in 10 minutes
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
                  onClick={() => setStep("verify")}
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
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
