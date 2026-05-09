// js/libs.js
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensureLibs() {
  try {
    // pdf-lib (필수)
    if (!window.PDFLib) {
      try {
        await loadScript(
          "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
        );
      } catch (e1) {
        try {
          await loadScript(
            "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js",
          );
        } catch (e2) {
          console.error("pdf-lib load failed", e1, e2);
          return false;
        }
      }
    }

    // pdf.js (미리보기용)
    if (!window.pdfjsLib) {
      try {
        await loadScript(
          "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js",
        );
      } catch (e1) {
        try {
          await loadScript(
            "https://unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.min.js",
          );
        } catch (e2) {
          console.warn("pdf.js load failed (optional)", e1, e2);
        }
      }
    }

    if (window.pdfjsLib?.GlobalWorkerOptions) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";
    }

    return !!window.PDFLib;
  } catch (e) {
    console.error("ensureLibs fatal", e);
    return false;
  }
}
