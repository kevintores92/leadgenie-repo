import React from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, Users, MessageSquare, PieChart, Settings, HelpCircle, Zap, Check,
  Rocket, Droplet, TrendingUp, LogOut
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function MainLayout({ children, title }: MainLayoutProps) {
  const [location] = useLocation();
  const { logout } = useAuthStore();

  const isActive = (path: string) => location === path;

  const handleLogout = () => {
    logout();
    window.location.href = '/auth';
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Global Sidebar - Icon Only / Slim */}
      <aside className="hidden md:flex flex-col w-16 border-r border-border bg-sidebar items-center py-6 space-y-6 z-50">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,180,216,0.5)]">
          <Zap className="text-white h-6 w-6" fill="currentColor" />
        </div>
        
        <nav className="flex-1 flex flex-col space-y-4 mt-6">
          <Link href="/dashboard">
            <SidebarIcon icon={<LayoutDashboard />} active={isActive("/dashboard")} tooltip="Dashboard" />
          </Link>
          <Link href="/messenger">
            <SidebarIcon icon={<MessageSquare />} active={isActive("/messenger")} tooltip="Messenger" />
          </Link>
          <Link href="/contacts">
            <SidebarIcon icon={<Users />} active={isActive("/contacts")} tooltip="Contacts" />
          </Link>
          <Link href="/campaigns">
            <SidebarIcon icon={<Rocket />} active={isActive("/campaigns")} tooltip="Campaigns" />
          </Link>
          <Link href="/drips">
            <SidebarIcon icon={<Droplet />} active={isActive("/drips")} tooltip="Drips" />
          </Link>
          <Link href="/status">
            <SidebarIcon icon={<TrendingUp />} active={isActive("/status")} tooltip="Status" />
          </Link>
          <Link href="/settings">
            <SidebarIcon icon={<Settings />} active={isActive("/settings")} tooltip="Settings" />
          </Link>
        </nav>

        <div className="flex flex-col space-y-4">
          <SidebarIcon icon={<HelpCircle />} tooltip="Help" />
          <button 
            onClick={handleLogout}
            className="p-3 rounded-xl transition-all cursor-pointer group relative text-muted-foreground hover:bg-white/5 hover:text-red-500"
            title="Logout"
          >
            <LogOut size={20} />
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-border">
              Logout
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Global Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/50 backdrop-blur-sm z-40 shrink-0">
          <h1 className="text-xl font-heading font-semibold text-foreground">Lead Genie</h1>
          
          
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-2 bg-gray-500/10 text-emerald-500 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/20">
              <CheckCircleMini />
              <span>100DLC Registration Status: Pending</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-primary hidden lg:inline-block">kevin@leadgenie.online</span>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">KT</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </div>
    </div>
  );
}

// Helpers
function SidebarIcon({ icon, active, tooltip }: { icon: React.ReactNode, active?: boolean, tooltip?: string }) {
  return (
    <div className={`p-3 rounded-xl transition-all cursor-pointer group relative ${active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
      {tooltip && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-border">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function CheckCircleMini() {
  return (
    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}