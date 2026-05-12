import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandLogo href="/" className="mt-8 mb-4 text-2xl" />
        <p className="text-muted-foreground text-sm">AI-powered social media content creation</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
