import { CONTENT_STATUS } from "@/lib/sse-constants";
export function isPostEditable(post: { status: string; videoPath: string | null }) {
  return (
    !post.videoPath &&
    (post.status === CONTENT_STATUS.DRAFT || post.status === CONTENT_STATUS.FAILED)
  );
}
