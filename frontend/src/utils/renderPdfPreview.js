/**
 * Renders page 1 of a PDF to a PNG in the browser (pdf.js), so the server
 * can build the public preview without PDF software. Loaded on demand:
 * only the certificate admin page pays for pdf.js.
 *
 * @param {File} file a PDF
 * @param {number} targetWidth pixel width to render at (server downsizes to 1200)
 * @returns {Promise<Blob>} PNG of the first page
 */
export async function renderPdfFirstPage(file, targetWidth = 2000) {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  try {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(4, targetWidth / base.width) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Render failed"))), "image/png"));
  } finally {
    pdf.destroy();
  }
}
