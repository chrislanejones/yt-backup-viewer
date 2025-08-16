"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();

  const handleAnonymousSignIn = async () => {
    try {
      console.log("Attempting anonymous sign in...");
      toast.info("Signing in...");
      await signIn("anonymous");
      console.log("Anonymous sign in successful");
      toast.success("Signed in successfully!");
    } catch (error) {
      console.error("Anonymous sign in failed:", error);
      toast.error("Sign in failed: " + (error as Error).message);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Anonymous Authentication Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-100">Sign In</h3>
        <p className="text-sm text-gray-400 mb-4">
          Sign in anonymously to test the application.
        </p>
        <button 
          className="auth-button w-full"
          onClick={handleAnonymousSignIn}
        >
          Sign in anonymously
        </button>
      </div>
    </div>
  );
}
