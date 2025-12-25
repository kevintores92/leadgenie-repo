import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  id: string;
  label: string;
  path: string;
}

const steps: Step[] = [
  { id: "1", label: "Sign Up", path: "/" },
  { id: "2", label: "Business Info", path: "/register" },
  { id: "3", label: "Upload List", path: "/upload" },
  { id: "4", label: "Start Campaign", path: "/campaign/new" },
];

export function ProgressStepper() {
  const [location] = useLocation();

  // Find current step index
  const currentStepIndex = steps.findIndex((step) => step.path === location);
  // If we are on dashboard, we are "done" with this flow
  const isDashboard = location.startsWith("/dashboard");
  const activeIndex = isDashboard ? steps.length : currentStepIndex;

  if (isDashboard) return null; // Don't show on dashboard

  return (
    <div className="w-full py-6 px-4 mb-8">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex justify-between">
          {/* Background Line */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -translate-y-1/2 rounded-full" />
          
          {/* Active Progress Line */}
          <motion.div 
            className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 -translate-y-1/2 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />

          {steps.map((step, index) => {
            const isActive = index === activeIndex;
            const isCompleted = index < activeIndex;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center group">
                <Link href={step.path}>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 cursor-pointer bg-background",
                    isCompleted ? "border-primary bg-primary text-white" : 
                    isActive ? "border-primary text-primary shadow-[0_0_15px_rgba(168,85,247,0.5)]" : 
                    "border-white/20 text-muted-foreground hover:border-white/40"
                  )}>
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-bold font-mono">{step.id}</span>
                    )}
                  </div>
                </Link>
                <span className={cn(
                  "absolute top-12 text-xs font-medium whitespace-nowrap transition-colors duration-300",
                  isActive || isCompleted ? "text-white" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isDashboard = location.startsWith("/dashboard");

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-cyan-500/5 rounded-full blur-[80px]" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} 
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        {!isDashboard && (
          <header className="border-b border-white/5 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="font-bold text-white text-lg">L</span>
                </div>
                <span className="font-bold text-lg tracking-tight">Lead Genie</span>
              </div>
              <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                 {/* Placeholder Nav items from landing page if needed */}
              </div>
            </div>
          </header>
        )}

        <ProgressStepper />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
