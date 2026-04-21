import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="font-bold text-2xl">PostishAI</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          AI-powered social media content creation
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
