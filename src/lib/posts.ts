import { POST_STATUS } from "@/lib/constants";
export function isPostEditable(post: { status: string; videoPath: string | null }) {
  return (
    !post.videoPath &&
    (post.status === POST_STATUS.DRAFT || post.status === POST_STATUS.FAILED)
  );
}
