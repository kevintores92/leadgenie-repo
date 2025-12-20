import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  ArrowRight, 
  Bot, 
  Building2, 
  CheckCircle2, 
  Cpu, 
  DollarSign, 
  LayoutDashboard, 
  MessageSquare, 
  Phone, 
  Rocket, 
  ShieldCheck, 
  Sparkles, 
  Upload, 
  Wallet, 
  Zap 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Use a repo-local public asset to avoid missing files during deploy.
// Replace with a dedicated hero image when available.
const heroBgCustom = "/opengraph.jpg";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-background/80 backdrop-blur-md border-b border-white/10 py-4" : "bg-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold font-heading tracking-tight text-white">Lead Genie</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden md:flex text-slate-300 hover:text-white hover:bg-white/5">
              Log In
            </Button>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 rounded-full px-6">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-background/30 z-10" />
          <img 
            src={heroBgCustom} 
            alt="Background" 
            className="w-full h-full object-cover object-center opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-background/20 z-10" />
        </div>

        <div className="container mx-auto px-6 relative z-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="max-w-2xl"
            >
              <motion.div variants={fadeInUp} className="mb-6">
                <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/50 text-primary bg-primary/10 backdrop-blur-sm text-sm font-medium">
                  <Sparkles className="w-3.5 h-3.5 mr-2 inline-block" />
                  Now with AI Warm Caller
                </Badge>
              </motion.div>
              
              <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-bold font-heading leading-tight mb-3">
                Autonomous <span className="text-gradient">REI Lead Genie Engine</span>
              </motion.h1>
              
              <motion.p variants={fadeInUp} className="text-3xl md:text-4xl font-bold font-heading mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                with AI Superchargers
              </motion.p>
              
              <motion.p variants={fadeInUp} className="text-xl text-slate-400 mb-8 leading-relaxed max-w-lg">
                Stop chasing leads. Our fully automated AI platform that calls and texts prospects, qualifying them 24/7 while you sleep.
              </motion.p>
              
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border-2 border-transparent bg-clip-padding shadow-lg shadow-purple-500/10 relative overflow-hidden group backdrop-blur-sm" style={{
                    backgroundImage: 'linear-gradient(rgb(15, 23, 42), rgb(15, 23, 42)), linear-gradient(90deg, rgb(168, 85, 247), rgb(236, 72, 153))',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}>
                    <span className="relative z-10 flex items-center text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 font-bold">
                      Start Your Free Trial
                      <ArrowRight className="ml-2 w-5 h-5 text-purple-300" />
                    </span>
                  </Button>
                </Link>
              </motion.div>

              <motion.div variants={fadeInUp} className="mt-12 flex items-center gap-8 text-slate-500 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>100% Automated</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>A2P 10DLC Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Real-time Analytics</span>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 relative bg-background/50">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6">Zero Human Intervention</h2>
            <p className="text-slate-400 text-lg">
              Set it and forget it. Our autonomous system handles the entire lead generation lifecycle from cold outreach to qualification.
            </p>
          </div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/0 via-blue-500/50 to-blue-500/0 hidden lg:block" />

            <div className="space-y-24">
              <Step 
                number="01" 
                title="Sign Up & Registry" 
                description="Provide Company/Business info for A2P 10DLC Brand and Campaign Registry. We handle the compliance heavy lifting."
                icon={<ShieldCheck className="w-8 h-8 text-blue-400" />}
                align="left"
              />
              <Step 
                number="02" 
                title="Upload List" 
                description="Simply upload your skiptraced list of properties. Our system automatically validates and formats the data."
                icon={<Upload className="w-8 h-8 text-purple-400" />}
                align="right"
              />
              <Step 
                number="03" 
                title="Start Campaign" 
                description="Launch your campaign with one click. This is where the magic happens and our AI takes over completely."
                icon={<Rocket className="w-8 h-8 text-orange-400" />}
                align="right"
              />
            </div>
          </div>
        </div>
      </section>

      {/* AI Superchargers Section */}
      <section id="features" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-purple-900/10" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/20">AI Superchargers</Badge>
            <h2 className="text-4xl md:text-5xl font-bold font-heading mb-6">While You Wait... <br/>The AI Gets to Work</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Don't lose time waiting for 10DLC approval. Our parallel processing AI engine starts working immediately.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={<Phone className="w-6 h-6 text-blue-400" />}
              title="AI Cold Caller"
              description="While waiting for 10DLC, our AI immediately starts calling landlines to uncover opportunities."
              delay={0}
            />
            <FeatureCard 
              icon={<Bot className="w-6 h-6 text-purple-400" />}
              title="AI Classification"
              description="Instantly categorizes responses. Determines intent and interest level with near-human accuracy."
              delay={0.1}
            />
            <FeatureCard 
              icon={<MessageSquare className="w-6 h-6 text-pink-400" />}
              title="AI Replies"
              description="Engages prospects with context-aware text responses to keep the conversation going 24/7."
              delay={0.2}
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-yellow-400" />}
              title="AI Warm Caller"
              description="The closer. Calls interested prospects to verify details and push qualified leads to your CRM."
              delay={0.3}
            />
          </div>

          <div className="mt-20 p-8 md:p-12 rounded-3xl bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-white/10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="relative z-10">
              <h3 className="text-3xl font-bold font-heading mb-4">The Result?</h3>
              <p className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-8">
                Qualified Leads pushed directly to your CRM.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="secondary" className="px-4 py-2 text-base">Hot Leads Only</Badge>
                <Badge variant="secondary" className="px-4 py-2 text-base">No Tire Kickers</Badge>
                <Badge variant="secondary" className="px-4 py-2 text-base">100% Hands-Off</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Trial Section */}
      <section id="free-trial" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-blue-900/5" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge className="mb-4 bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20 px-4 py-2 text-lg font-semibold">
                Start Free Today
              </Badge>
              <h2 className="text-5xl md:text-6xl font-bold font-heading mb-6">Try Lead Genie Risk-Free</h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Experience the power of autonomous lead generation with real AI interactions. No credit card required.
              </p>
            </motion.div>

            {/* What You Get Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8"
              >
                <div className="text-4xl font-black text-white mb-4">📋</div>
                <h3 className="text-2xl font-bold font-heading mb-3">Upload Contacts</h3>
                <p className="text-slate-400 mb-4">Add 10-20 of your own numbers from your skiptraced list.</p>
                <p className="text-xs text-slate-400 font-light mb-3">Include your own numbers...</p>
                <div className="text-sm text-green-400 font-semibold">See for yourself</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8"
              >
                <div className="text-4xl font-black text-white mb-4">☎️</div>
                <h3 className="text-2xl font-bold font-heading mb-3">See It In Action</h3>
                <p className="text-slate-400 mb-4">
                  <span className="font-semibold text-blue-300">Landline:</span> Listen to our AI Cold Caller make calls
                </p>
                <p className="text-slate-400">
                  <span className="font-semibold text-purple-300">Mobile:</span> Receive AI texts and warm calls
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8"
              >
                <div className="text-4xl font-black text-white mb-4">✨</div>
                <h3 className="text-2xl font-bold font-heading mb-3">100% Risk-Free</h3>
                <p className="text-slate-400 mb-4">Not convinced? No problem. Cancel anytime, no questions asked, no hidden fees.</p>
                <div className="text-sm text-green-400 font-semibold">Cancel anytime</div>
              </motion.div>
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <Link href="/signup">
                <Button size="lg" className="h-16 px-12 text-xl rounded-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-2xl shadow-green-500/30 border border-white/10">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <p className="mt-8 text-sm text-slate-400 font-medium">
                <span className="text-green-400 font-semibold">No credit card required</span> • Instant access • See real results
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black/20">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="text-blue-500 w-5 h-5" />
              <span className="text-lg font-bold font-heading text-white">Lead Genie</span>
            </div>
            <div className="text-slate-500 text-sm">
              © 2024 Lead Genie. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, title, description, icon, align }: { number: string, title: string, description: string, icon: React.ReactNode, align: 'left' | 'right' }) {
  return (
    <div className={`flex flex-col lg:flex-row items-center gap-8 ${align === 'right' ? 'lg:flex-row-reverse' : ''}`}>
      <div className={`flex-1 text-center ${align === 'left' ? 'lg:text-right' : 'lg:text-left'}`}>
        <motion.div 
          initial={{ opacity: 0, x: align === 'left' ? -20 : 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6 glass-card relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:bg-primary/40 transition-all duration-500" />
            <div className="relative z-10">{icon}</div>
          </div>
          <h3 className="text-2xl font-bold font-heading mb-3">{title}</h3>
          <p className="text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0 inline-block">
            {description}
          </p>
        </motion.div>
      </div>
      
      <div className="relative flex items-center justify-center w-12 h-12 shrink-0 z-10">
        <div className="w-12 h-12 rounded-full bg-background border-4 border-slate-800 flex items-center justify-center text-sm font-bold text-slate-500 shadow-lg">
          {number}
        </div>
      </div>
      
      <div className="flex-1 hidden lg:block" />
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
    >
      <Card className="h-full bg-white/5 border-white/10 hover:bg-white/10 transition-colors duration-300">
        <CardContent className="p-6">
          <div className="mb-4 p-3 rounded-xl bg-background/50 w-fit border border-white/5">
            {icon}
          </div>
          <h4 className="text-xl font-bold font-heading mb-3">{title}</h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            {description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
