import { Suspense } from "react";
import { PostWizard } from "@/components/posts/PostWizard";

export default function NewPostPage() {
  return (
    <div className="px-6 py-8 sm:px-10 max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">New Post</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Create a video post with your avatar</p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <PostWizard />
      </Suspense>
    </div>
  );
}
