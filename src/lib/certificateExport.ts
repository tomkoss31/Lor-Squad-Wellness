// =============================================================================
// certificateExport.ts — helpers shared pour exporter un certificat HTML
// vers PNG / JPEG / PDF (extraits de AcademyCertificatePage, 2026-11-04).
//
// Utilises par AcademyCertificatePage et FormationCertificatePage.
// =============================================================================

export type CertFormat = "a4" | "story";

/** Convertit un nom user en slug fichier safe. */
export function slugifyForFilename(name: string, fallback = "certificat"): string {
  return (name || fallback)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Capture un element HTML en canvas haute resolution via html2canvas. */
async function captureNode(node: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas")).default;
  return html2canvas(node, {
    scale: 2.5,
    backgroundColor: null,
    useCORS: true,
    logging: false,
  });
}

export async function downloadCertPng(node: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureNode(node);
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

export async function downloadCertJpeg(node: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureNode(node);
  await new Promise<void>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return resolve();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      },
      "image/jpeg",
      0.95,
    );
  });
}

export async function downloadCertPdf(
  node: HTMLElement,
  filename: string,
  format: CertFormat,
): Promise<void> {
  const canvas = await captureNode(node);
  const { default: jsPDF } = await import("jspdf");
  const pdfWidth = format === "a4" ? 210 : 90;
  const pdfHeight = format === "a4" ? 297 : 160;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: format === "a4" ? "a4" : [pdfWidth, pdfHeight],
    compress: true,
  });
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
  pdf.save(filename);
}
