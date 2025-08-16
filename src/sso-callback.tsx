import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

export function SSOCallback() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Clerk authentication is complete, redirect to home
      window.location.href = "/";
    }
  }, [isLoaded, isSignedIn]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-white">Completing sign in...</div>
    </div>
  );
}