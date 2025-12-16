import React from 'react';

// `AppShell` is a lightweight page wrapper. The global layout from
// `pages/_app.js` already applies `AppLayout`, so `AppShell` must not
// re-wrap it (that caused the app to render the layout twice). Keep
// this component as a no-op wrapper to allow pages to opt-in without
// duplicating the global layout.
export default function AppShell({ children }) {
  return <>{children}</>;
}
