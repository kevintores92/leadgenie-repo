import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { authClient } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import bgImage from "@assets/generated_images/abstract_dark_blue_tech_background.png";

// Use API base from `queryClient.ts` (via VITE_API_URL or proxy). Removed local API_URL to avoid duplicate configs.

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id === "signup-email" ? "email" : id === "signup-password" ? "password" : id === "name" ? "name" : id]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
      // Dev preset shortcut: allow immediate login with known dev credentials
      // (useful while backend is unavailable). Credentials: admin@example.com / supersecret
      const DEV_PRESET = { username: import.meta.env.VITE_DEV_AUTH_EMAIL || 'admin@example.com', password: import.meta.env.VITE_DEV_AUTH_PASSWORD || 'supersecret' };
      if (formData.email === DEV_PRESET.username && formData.password === DEV_PRESET.password) {
        const user = { id: 'dev-subscriber', username: DEV_PRESET.username, orgId: 'org-dev', activeBrandId: null };
        const token = 'dev-token-subscriber';
        login(user as any, token);
        toast({ title: 'Success', description: 'Logged in (dev preset)' });
        setLoading(false);
        setLocation('/dashboard');
        return;
      }
    
    try {
      // Try Neon Auth client sign-in
      // adapter may return { error, session, user } or similar
      const res: any = await authClient.signIn?.email?.({ email: formData.email, password: formData.password });

      if (res?.error) {
        throw new Error(res.error?.message || 'Sign in failed');
      }

      // Prefer session token if available
      const token = res?.session?.access_token || res?.access_token || null;
      const user = res?.user || res?.session?.user || null;

      if (token && user) {
        login(user, token);
        toast({ title: 'Success', description: 'You have logged in successfully' });
        setLocation('/dashboard');
      } else {
        toast({ title: 'Error', description: 'Login failed', variant: 'destructive' });
      }
    } catch (error: any) {
      // Fallback to backend auth endpoint if Neon Auth fails
      try {
        const response = await apiRequest('POST', '/auth/login', { username: formData.email, password: formData.password });
        const data = await response.json();
        if (data.token && data.user) {
          login(data.user, data.token);
          toast({ title: 'Success', description: 'You have logged in successfully (fallback)' });
          setLocation('/dashboard');
          return;
        }
      } catch (be: any) {
        // ignore, will show original error
      }

      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // For dev: create a local user and log in without contacting backend
    try {
      const userId = `dev-user-${Date.now()}`;
      const user = { id: userId, username: formData.email, orgId: `org-${Date.now()}`, activeBrandId: null };
      const token = `dev-token-${Date.now()}`;
      login(user as any, token);
      toast({ title: 'Success', description: 'Account created (dev)' });
      setLocation('/dashboard');
      setLoading(false);
      return;
    } catch (err) {
      // fall through to existing signup flow if something unusual happens
    }

    try {
      // Try Neon Auth client sign-up
      const res: any = await authClient.signUp?.email?.({ email: formData.email, password: formData.password, name: formData.name });

      if (res?.error) {
        throw new Error(res.error?.message || 'Signup failed');
      }

      const token = res?.session?.access_token || res?.access_token || null;
      const user = res?.user || res?.session?.user || null;

      if (token && user) {
        login(user, token);
        toast({ title: 'Success', description: 'Account created successfully' });
        setLocation('/dashboard');
      } else {
        toast({ title: 'Error', description: 'Signup failed', variant: 'destructive' });
      }
    } catch (error: any) {
      // Fallback to backend signup if Neon Auth fails
      try {
        const response = await apiRequest('POST', '/auth/signup', { username: formData.email, email: formData.email, password: formData.password, name: formData.name });
        const data = await response.json();
        if (data.token && data.user) {
          login(data.user, data.token);
          toast({ title: 'Success', description: 'Account created successfully (fallback)' });
          setLocation('/dashboard');
          return;
        }
      } catch (be: any) {
        // ignore
      }

      toast({
        title: "Error",
        description: error.message || "Signup failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground overflow-hidden">
      {/* DEBUG: temporary banner to verify rendering - remove after debugging */}
      <div style={{position: 'fixed', top: 8, left: 8, zIndex: 9999, background: '#ff4d4f', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12}}>
        DEBUG: auth.tsx rendered
      </div>
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-heading font-bold tracking-tight text-white">Lead Genie</h1>
            <p className="text-muted-foreground">Scale Your Portfolio, Not Your Overhead.</p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/20">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <Card className="border-none bg-transparent shadow-none">
                <CardHeader className="px-0">
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>Enter your credentials to access your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-0">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="name@example.com" 
                        required 
                        value={formData.email}
                        onChange={handleInputChange}
                        className="bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
                      </div>
                      <div className="relative">
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"} 
                          required 
                          value={formData.password}
                          onChange={handleInputChange}
                          className="bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20 pr-10" 
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_20px_rgba(0,180,216,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,180,216,0.5)]"
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="px-0 flex flex-col gap-4">
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full bg-secondary/30 border-border/50 hover:bg-secondary/50">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.17c-.22-.66-.35-1.36-.35-2.17s.13-1.51.35-2.17V7.01H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.99l3.66-2.82z" fill="#FBBC05" />
                      <path d="M12 4.81c1.62 0 3.15.56 4.34 1.7l3.25-3.25C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.01l3.66 2.82c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="signup">
               <Card className="border-none bg-transparent shadow-none">
                <CardHeader className="px-0">
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>Start your 14-day free trial today</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-0">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        placeholder="John Doe" 
                        value={formData.name}
                        onChange={handleInputChange}
                        className="bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input 
                        id="signup-email" 
                        type="email" 
                        placeholder="name@example.com" 
                        value={formData.email}
                        onChange={handleInputChange}
                        className="bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input 
                        id="signup-password" 
                        type="password" 
                        value={formData.password}
                        onChange={handleInputChange}
                        className="bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20" 
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_20px_rgba(0,180,216,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,180,216,0.5)]"
                    >
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex w-1/2 relative bg-muted items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={bgImage} 
            alt="Background" 
            className="w-full h-full object-cover opacity-60" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent opacity-50" />
        </div>

        <div className="relative z-10 max-w-lg space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              New: Lead Genie OS v2.0
            </div>
            
            <h2 className="text-5xl font-heading font-bold leading-tight text-white">
              Replace Your Entire <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-200">VA Team with AI</span>
            </h2>
            
            <p className="text-xl text-muted-foreground/80 leading-relaxed">
              The first autonomous operating system for Real Estate Investors. Replace manual prospecting with intelligent, 24/7 automation.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                "AI Classification", "Inbound AI Calls", 
                "Smart Context", "Real-time Analytics"
              ].map((feature, i) => (
                <div key={i} className="flex items-center space-x-2 text-sm font-medium text-white/80">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}