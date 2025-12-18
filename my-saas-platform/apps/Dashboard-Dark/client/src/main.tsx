import { StrictMode } from 'react';
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { authClient } from "./lib/auth";
let Root = App;

const useNeon = import.meta.env.VITE_USE_NEON === 'true';
if (useNeon) {
  // dynamically import Neon provider to avoid loading it when not desired
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { NeonAuthUIProvider } = require('@neondatabase/neon-js/auth/react');
  Root = function WithNeon() {
    return (
      // eslint-disable-next-line react/jsx-no-undef
      <NeonAuthUIProvider authClient={authClient}>
        <App />
      </NeonAuthUIProvider>
    );
  };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
