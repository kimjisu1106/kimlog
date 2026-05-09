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
    // pdf.js (렌더링용 - 필수)
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
          console.error("pdf.js load failed", e1, e2);
          return false;
        }
      }
    }
    if (window.pdfjsLib?.GlobalWorkerOptions) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";
    }

    // pdf-lib (PDF 생성 - 필수)
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

    // JSZip (다중 파일 ZIP 다운로드용 - 선택)
    if (!window.JSZip) {
      try {
        await loadScript(
          "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
        );
      } catch (e1) {
        try {
          await loadScript(
            "https://unpkg.com/jszip@3.10.1/dist/jszip.min.js",
          );
        } catch (e2) {
          console.warn("JSZip load failed (다중 파일 다운로드 불가)", e1, e2);
        }
      }
    }

    return !!(window.pdfjsLib && window.PDFLib);
  } catch (e) {
    console.error("ensureLibs fatal", e);
    return false;
  }
}
