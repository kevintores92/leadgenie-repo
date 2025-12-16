"use client"

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Search, Bell } from "lucide-react";
import { navigationItems, currentUser } from '../../features/messenger/data';

export default function TopNav() {
  const [balance, setBalance] = useState(null);
  const ORG = 'demo-org-id';
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const res = await fetch('/wallet/usage/summary', { headers: { 'x-organization-id': ORG } });
        const j = await res.json();
        if (!mounted) return;
        setBalance(Number(j.balance || 0));
        setTodayCount(j.todayCount || 0);
        setMonthCount(j.monthCount || 0);
      } catch (e) {
        console.error(e);
      }
    }
    fetchData();
    const id = setInterval(fetchData, 15000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    setMounted(true)
  }, [])

  const router = useRouter();

  return (
    <div className="h-16 border-b flex items-center justify-between px-6 shrink-0 z-10 font-inter" style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
      {/* Top nav now uses the sidebar background color and contains moved items */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-green-400 flex items-center justify-center shrink-0 shadow-lg shadow-green-900/20">
          <span className="text-black font-bold text-sm tracking-tight">LG</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-bold leading-tight">Lead Genie</span>
          <span className="text-[10px] tracking-[0.15em] font-medium uppercase mt-0.5" style={{ color: 'hsl(var(--primary))' }}>REI Lead Engine</span>
        </div>
      </div>    
      {/* Left area - reserved for any existing left elements (kept empty for now) */}
      <div className="flex items-center gap-4" />
        
      {/* Center: main navigation links + search */}
      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-1">
          {navigationItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all ${isActive ? 'bg-[#1F2937] text-white font-medium' : 'muted-text hover:bg-[#1F2937]/50 hover:text-white'}`}
              >
                <item.icon className="w-4 h-4 opacity-90" strokeWidth={1.5} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: user profile + existing right elements (balance + notifications) */}
      <div className="flex items-center gap-4">
        

        <div className="text-right text-sm mr-4 pl-4" style={{ borderLeft: '1px solid hsl(var(--border) / 0.6)' }}>
          <div className="text-[12px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Balance</div>
          <div className="font-mono text-sm">${balance === null ? '...' : balance.toFixed(2)}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => mounted ? setTheme(theme === 'dark' ? 'light' : 'dark') : null}
            aria-label="Toggle theme"
            className="p-2 rounded-full transition-colors"
            style={{ color: 'hsl(var(--foreground))', background: 'transparent' }}
          >
            {mounted && theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <button className="p-2 muted-text hover:text-white hover:bg-[#1F2937] rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#111827]"></span>
          </button>
        </div>
        
        <div className="flex items-center gap-3 pr-2 border-l border-border pl-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm shadow-lg ${currentUser.avatarColor ?? 'bg-indigo-600'}`}>
            {currentUser.initials || currentUser.name?.split(' ').map(n => n[0]).join('').slice(0,2)}
          </div>
          <div className="hidden md:flex flex-col text-sm leading-tight">
            <span className="text-white text-[13px] font-semibold truncate">{currentUser.name}</span>
            <span className="text-[11px] muted-text">Test Account</span>
          </div>
        </div>
      </div>
    </div>
  );
}

