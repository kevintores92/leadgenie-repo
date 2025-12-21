import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  ArrowRight, 
  Bot, 
  Building2, 
  CheckCircle2, 
  MessageSquare, 
  Phone, 
  Rocket, 
  Shield,
  Upload,
  Zap,
  BarChart3,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.1 }
  }
};

export default function Landing() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [, navigate] = useLocation();
  const { scrollY } = useScroll();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignUp = () => navigate("/signup");

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Fixed Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-cyan-500/5 rounded-full blur-[80px]" />
      </div>

      {/* Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-background/80 backdrop-blur-lg border-b border-white/5" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="font-bold text-white text-lg">L</span>
            </div>
            <span className="font-bold text-lg tracking-tight">Lead Genie</span>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-muted-foreground hover:text-foreground hover:bg-white/5"
            >
              Log In
            </Button>
            <Button 
              onClick={handleSignUp}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold border border-white"
              data-testid="button-nav-signup"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        <div className="relative z-10 container mx-auto px-4 py-12">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="max-w-4xl mx-auto text-center"
          >
            {/* Badge */}
            <motion.div variants={fadeInUp} className="mb-6 flex justify-center">
              <div className="glass-card px-4 py-2 rounded-full border border-primary/30 inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Autonomous AI Lead Generation</span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              variants={fadeInUp}
              className="text-5xl md:text-7xl font-bold leading-tight mb-6"
            >
              REI Leads on <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400">Autopilot</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p 
              variants={fadeInUp}
              className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              Autonomous AI that calls, texts, and qualifies real estate prospects 24/7. Set it once, collect qualified leads forever.
            </motion.p>

            {/* Benefits */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap justify-center gap-6 mb-12"
            >
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>100% Hands-Off</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>10DLC Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>Real-time Analytics</span>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <Button
                onClick={handleSignUp}
                size="lg"
                className="h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold group border border-white"
                data-testid="button-hero-free-trial"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 border-white/10 hover:bg-white/5 font-semibold"
                data-testid="button-watch-demo"
              >
                Watch Demo
              </Button>
            </motion.div>

            <motion.p variants={fadeInUp} className="text-xs text-muted-foreground">
              No credit card required • Instant access • Results in minutes
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">3 Steps to Lead Generation</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From signup to qualified leads in minutes. Our system handles everything automatically.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                icon: <Shield className="w-8 h-8 text-blue-400" />,
                title: "Verify Business",
                description: "Provide your company details for A2P 10DLC compliance. We handle all regulatory requirements."
              },
              {
                step: "02",
                icon: <Upload className="w-8 h-8 text-purple-400" />,
                title: "Upload Leads",
                description: "Upload your skiptraced list. Our system validates and auto-formats everything."
              },
              {
                step: "03",
                icon: <Rocket className="w-8 h-8 text-cyan-400" />,
                title: "Launch & Relax",
                description: "Click launch. Our AI calls, texts, and qualifies prospects 24/7 while you rest."
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-8 border border-white/5 group hover:border-primary/30 transition-all duration-300"
              >
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/30 flex items-center justify-center mb-4 transition-all">
                    {item.icon}
                  </div>
                  <div className="text-3xl font-bold text-muted-foreground mb-2">{item.step}</div>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Superchargers Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block glass-card px-4 py-2 rounded-full border border-primary/30 mb-6">
              <span className="text-sm font-medium">AI Superchargers</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Automated at Every Step</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              While you focus on closing deals, our AI handles the heavy lifting of lead qualification and follow-up.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
            {[
              { icon: <Phone className="w-6 h-6" />, title: "AI Cold Caller", description: "Calls prospects 24/7 on landlines to discover opportunities." },
              { icon: <MessageSquare className="w-6 h-6" />, title: "AI Texter", description: "Sends contextual SMS responses to keep conversations alive." },
              { icon: <Bot className="w-6 h-6" />, title: "AI Classifier", description: "Analyzes responses and scores lead quality in real-time." },
              { icon: <Zap className="w-6 h-6" />, title: "AI Warm Caller", description: "Calls qualified leads to close and push to your CRM." }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 border border-white/5 group hover:border-primary/30 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 group-hover:border-primary/30 flex items-center justify-center mb-4 transition-all text-primary">
                  {item.icon}
                </div>
                <h4 className="font-bold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Result Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-8 md:p-12 border border-primary/30 text-center max-w-2xl mx-auto"
          >
            <BarChart3 className="w-12 h-12 text-primary mx-auto mb-6" />
            <h3 className="text-2xl md:text-3xl font-bold mb-3">The Result</h3>
            <p className="text-lg text-muted-foreground mb-6">
              Qualified, verified leads delivered directly to your CRM. No tire kickers. No follow-up needed.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Hot Leads Only
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                100% Verified
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Zero Setup
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-8 md:p-16 border border-primary/30 text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to Automate Your Lead Gen?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join REI pros who are closing more deals while spending less time on prospecting.
            </p>
            <Button
              onClick={handleSignUp}
              size="lg"
              className="h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold group border border-white"
              data-testid="button-cta-free-trial"
            >
              Start Your Free Trial Now
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card • Instant access • See results immediately
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="font-bold text-white text-lg">L</span>
              </div>
              <span className="font-bold">Lead Genie</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Lead Genie. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
