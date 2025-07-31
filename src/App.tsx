import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { YouTubeHistoryViewer } from "./YouTubeHistoryViewer";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <header className="sticky top-0 z-10 bg-gray-800/90 backdrop-blur-sm h-16 flex justify-between items-center border-b border-gray-700 shadow-sm px-4">
        <h2 className="text-xl font-semibold text-blue-400">Youtube Backup Viewer</h2>
        <SignOutButton />
      </header>
      <main className="flex-1 p-4">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Authenticated>
        <YouTubeHistoryViewer />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-64 gap-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-blue-400 mb-4">Youtube Backup Viewer</h1>
            <p className="text-xl text-gray-400">Sign in to view and search your YouTube history</p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}