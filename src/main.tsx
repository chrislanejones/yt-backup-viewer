import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import "./index.css";
import App from "./App";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  <ClerkProvider 
    publishableKey={clerkPubKey}
    appearance={{
      baseTheme: dark,
      variables: {
        colorPrimary: '#10b981',
        colorText: '#ffffff',
        colorBackground: '#1f2937',
        colorInputBackground: '#374151'
      }
    }}
  >
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </ClerkProvider>,
);
