import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useAuthActions } from "@convex-dev/auth/react";

export function SSOCallback() {
  const { getToken } = useAuth();
  const { signIn } = useAuthActions();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = await getToken({ template: "convex" });
        if (token) {
          await signIn("clerk", { token });
          window.location.href = "/";
        }
      } catch (error) {
        console.error("SSO callback error:", error);
        window.location.href = "/";
      }
    };

    handleCallback();
  }, [getToken, signIn]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-white">Completing sign in...</div>
    </div>
  );
}