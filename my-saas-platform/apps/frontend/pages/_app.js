import React from 'react';
import { ThemeProvider } from 'next-themes'
import { useRouter } from 'next/router';
import Head from 'next/head';
import AppLayout from '../components/AppLayout';
import '../index.css';
import DripPopupHost from '../components/DripPopupHost'

export default function MyApp({ Component, pageProps }) {
  // Wrap all pages in the common providers (AppLayout). Individual pages
  // decide whether to include the AppShell (sidebar/topnav) or not.
  return (
    <>
      <Head>
        {/* PayPal SDK Script - Loaded once globally */}
        <script
          src="https://www.paypal.com/sdk/js?client-id=BAAfosOZHkNtMvoC4_3JIOby8GMaVR7pexbUmaJN1PpPflXgHnCRy1nmtjFBvmTIiVQeRBnrhb3z9yLLks&components=hosted-buttons&disable-funding=venmo&currency=USD"
          crossOrigin="anonymous"
          async
        ></script>
      </Head>

      <ThemeProvider attribute="class" defaultTheme="system">
        <AppLayout>
          <Component {...pageProps} />
          <DripPopupHost />
        </AppLayout>
      </ThemeProvider>

      {/* PayPal Button Renderer Script - Load once globally */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener("DOMContentLoaded", (event) => {
              if (window.paypal && window.paypal.HostedButtons) {
                const containers = document.querySelectorAll('[data-paypal-hosted-button-id]');
                containers.forEach(container => {
                  const buttonId = container.getAttribute('data-paypal-hosted-button-id');
                  const containerId = container.getAttribute('data-paypal-container-id');
                  if (buttonId && containerId) {
                    window.paypal.HostedButtons({
                      hostedButtonId: buttonId
                    }).render("#" + containerId);
                  }
                });
              }
            });
          `,
        }}
      />
    </>
  );
}
