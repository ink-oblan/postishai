import { Suspense } from "react";
import { PostWizard } from "@/components/posts/PostWizard";

export default function NewPostPage() {
  return (
    <div className="max-w-3xl space-y-8 px-6 py-8 sm:px-10">
      <div>
        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">New Post</h1>
        <p className="mt-1.5 text-muted-foreground text-sm">Create a video post with your avatar</p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Loading...</div>}>
        <PostWizard />
      </Suspense>
    </div>
  );
}
