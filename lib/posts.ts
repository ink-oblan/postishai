export function isPostEditable(post: { status: string; videoPath: string | null }) {
  return !post.videoPath && (post.status === "DRAFT" || post.status === "FAILED");
}
