import { createRoot } from "react-dom/client";
// import the TSX file explicitly to avoid name collisions with server `app.js` on case-sensitive filesystems
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
