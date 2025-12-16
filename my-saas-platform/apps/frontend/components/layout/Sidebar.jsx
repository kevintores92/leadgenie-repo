import React from 'react';

export default function Sidebar() {
  // Sidebar is now hidden: its contents have been moved to the TopNav.
  // Keep a minimal, hidden container so layout flex children still work.
  return <div className="hidden" aria-hidden="true" />;
}
