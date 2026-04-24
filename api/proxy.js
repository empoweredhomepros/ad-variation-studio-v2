export const config = { runtime: "edge" };

function extractDriveFileId(url) {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  try { return new URL(url).searchParams.get("id"); } catch { return null; }
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const driveUrl = searchParams.get("url");

  if (!driveUrl) return new Response("Missing url parameter", { status: 400 });

  const fileId = extractDriveFileId(driveUrl);
  if (!fileId) return new Response("Could not extract Drive file ID", { status: 400 });

  const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=t`;

  const response = await fetch(downloadUrl);
  if (!response.ok) return new Response(`Drive fetch failed: ${response.status}`, { status: response.status });

  const headers = {
    "Content-Type": response.headers.get("content-type") || "video/mp4",
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
  const contentLength = response.headers.get("content-length");
  if (contentLength) headers["Content-Length"] = contentLength;

  return new Response(response.body, { headers });
}
