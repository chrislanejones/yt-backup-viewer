"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    try {
      await signIn("password", formData);
      toast.success(isSignUp ? "Account created successfully!" : "Signed in successfully!");
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error(isSignUp ? "Failed to create account" : "Failed to sign in");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Email/Password Authentication Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-100">
          {isSignUp ? "Create an Account" : "Sign In"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <input type="hidden" name="flow" value={isSignUp ? "signUp" : "signIn"} />
          <button type="submit" className="auth-button w-full">
            {isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 text-sm text-blue-400 hover:text-blue-300 underline w-full text-center"
        >
          {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
        </button>
      </div>

      {/* Anonymous Authentication Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-100">Guest Access</h3>
        <p className="text-sm text-gray-400 mb-4">
          Try the app without creating an account
        </p>
        <button 
          className="auth-button w-full"
          onClick={() => void signIn("anonymous")}
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
}
