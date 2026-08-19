import { type NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { readFile } from "@/lib/storage";

export async function GET(request: NextRequest) {
  const session = await verifySession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    console.log(`[file GET] Fetching file: ${filePath}, userId: ${session?.userId}`);

    if (!filePath) {
      console.log("[file GET] Missing path parameter");
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    // Verify the file belongs to the user (path must contain userId)
    if (!session?.userId || !filePath.includes(session.userId)) {
      console.log(`[file GET] Access denied: path doesn't contain userId`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buffer = await readFile(filePath);
    console.log(`[file GET] Successfully read file: ${filePath}, size: ${buffer.length} bytes`);

    // Determine content type based on file extension
    const ext = filePath.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";

    if (ext === "png" || ext === "jpg" || ext === "jpeg") {
      contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;
    } else if (ext === "webp") {
      contentType = "image/webp";
    } else if (ext === "gif") {
      contentType = "image/gif";
    } else if (ext === "ttf") {
      contentType = "font/ttf";
    } else if (ext === "otf") {
      contentType = "font/otf";
    } else if (ext === "woff") {
      contentType = "font/woff";
    } else if (ext === "woff2") {
      contentType = "font/woff2";
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000", // 1 year cache
      },
    });
  } catch (error) {
    console.error("Error fetching brand file:", error);
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}
