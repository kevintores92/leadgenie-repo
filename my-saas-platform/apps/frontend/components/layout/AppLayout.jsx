import React from 'react';
import { useRouter } from 'next/router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/queryClient';
import { Toaster } from '../ui/toaster';
import { TooltipProvider } from '../ui/tooltip';
import { LayoutDashboard, Users, MessageSquare, PieChart, Settings, HelpCircle, Zap } from 'lucide-react';

export default function AppLayout({ children }) {
  const router = useRouter();

  const navItems = [
    { icon: LayoutDashboard, href: '/app/dashboard', label: 'Dashboard' },
    { icon: Users, href: '/app/contacts', label: 'Contacts' },
    { icon: MessageSquare, href: '/app/messenger', label: 'Messenger' },
    { icon: PieChart, href: '/app/reports', label: 'Reports' },
    { icon: Settings, href: '/app/settings', label: 'Settings' },
  ];

  const isActive = (href) => router.pathname === href;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
          {/* Sidebar */}
          <aside className="hidden md:flex flex-col w-16 border-r border-border bg-sidebar items-center py-6 space-y-6">
            {/* Logo */}
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,180,216,0.5)]">
              <Zap className="text-white h-6 w-6" fill="currentColor" />
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 flex flex-col space-y-4 mt-6">
              {navItems.slice(0, 5).map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`p-3 rounded-xl transition-all cursor-pointer ${
                    isActive(item.href)
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  }`}
                  title={item.label}
                >
                  <item.icon size={20} />
                </button>
              ))}
            </nav>

            {/* Bottom Actions */}
            <div className="flex flex-col space-y-4">
              <button className="p-3 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all" title="Help">
                <HelpCircle size={20} />
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary ring-2 ring-primary/20">
                O
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
