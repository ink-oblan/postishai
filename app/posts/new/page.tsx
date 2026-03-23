import { Suspense } from "react";
import { PostWizard } from "@/components/posts/PostWizard";

export default function NewPostPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Post</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a video post with your avatar</p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <PostWizard />
      </Suspense>
    </div>
  );
}
