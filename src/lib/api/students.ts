import { apiRequest } from "./client";
export async function uploadResume(file: File) {
  if (file.type !== "application/pdf" || file.size > 5 * 1024 * 1024)
    throw new Error("Choose a PDF up to 5 MB.");
  const body = new FormData();
  body.append("file", file);
  await apiRequest("/students/me/resume", { method: "POST", body });
}
export async function downloadResume() {
  const response = await apiRequest("/students/me/resume");
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "resume.pdf";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
