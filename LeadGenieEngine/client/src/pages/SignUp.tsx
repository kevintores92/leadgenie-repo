import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/layout/AppLayout";
import { Shield, Lock, Eye, EyeOff } from "lucide-react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    setLoading(true);
    // Simulate signup
    setTimeout(() => {
      navigate("/register");
    }, 1000);
  };

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-8 rounded-2xl">
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

            <form onSubmit={handleSubmit} className="space-y-4">
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
                data-testid="button-signup"
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold mt-6"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6">
              By signing up, you agree to our Terms of Service
            </p>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
