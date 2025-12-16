import React from 'react';
import { ThemeProvider } from 'next-themes'
import { useRouter } from 'next/router';
import AppLayout from '../components/AppLayout';
import '../index.css';
import DripPopupHost from '../components/DripPopupHost'

export default function MyApp({ Component, pageProps }) {
  // Wrap all pages in the common providers (AppLayout). Individual pages
  // decide whether to include the AppShell (sidebar/topnav) or not.
  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      <AppLayout>
        <Component {...pageProps} />
        <DripPopupHost />
      </AppLayout>
    </ThemeProvider>
  );
}
