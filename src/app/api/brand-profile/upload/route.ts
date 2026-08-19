import { type NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { writeFile } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const session = await verifySession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((v): v is File => v instanceof File);
    const fileType = formData.get("fileType") as string;

    console.log(
      `[upload] Received ${files.length} files, fileType: ${fileType}, userId: ${session.userId}`,
    );

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (!fileType || !["logo", "pattern", "font"].includes(fileType)) {
      return NextResponse.json({ error: "Invalid fileType" }, { status: 400 });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `brand-assets/${session.userId}/${fileType}/${timestamp}-${sanitizedName}`;

      console.log(`[upload] Saving file to: ${storagePath}, size: ${buffer.byteLength} bytes`);
      await writeFile(storagePath, Buffer.from(buffer));
      console.log(`[upload] Successfully saved file: ${storagePath}`);

      uploadedFiles.push({
        id: `${timestamp}-${file.name}`,
        name: sanitizedName,
        storagePath,
        size: file.size,
        type: file.type,
      });
    }

    console.log(`[upload] Returning ${uploadedFiles.length} uploaded files`);
    return NextResponse.json({ files: uploadedFiles });
  } catch (error) {
    console.error("Error uploading brand files:", error);
    return NextResponse.json({ error: "Failed to upload files" }, { status: 500 });
  }
}
