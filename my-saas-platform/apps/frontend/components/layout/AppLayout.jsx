import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/queryClient';
import { Toaster } from '../ui/toaster';
import { TooltipProvider } from '../ui/tooltip';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function AppLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopNav />
            <div className="flex-1 flex overflow-hidden">{children}</div>
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
