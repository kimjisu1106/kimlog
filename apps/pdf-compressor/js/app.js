// js/app.js

const MAX_FILES = 20;
const TEXT_DETECT_PAGES = 3;
const TEXT_ITEM_THRESHOLD = 120;
const QUALITIES = [0.82, 0.7, 0.58, 0.48, 0.4, 0.32, 0.26, 0.2, 0.16, 0.12];
// targetBytes per level: break early when compressed size drops below this
const TARGET_RATIO = { high: 0.8, mid: 0.5, low: 0.25 };

let files = [];
let selectedQuality = "high";
let resultBlob = null;
let resultFilename = "";

const el = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  document
    .querySelectorAll("#maxFilesText, #maxFilesText2")
    .forEach((s) => (s.textContent = MAX_FILES));

  const libOk = await ensureLibs();
  if (!libOk) {
    el("libStatus").textContent =
      "라이브러리 로드 실패. 새로고침 후 다시 시도해주세요.";
  }

  el("dropZone").addEventListener("click", (e) => {
    if (e.target.closest("#panel")) return;
    el("file").click();
  });

  el("file").addEventListener("change", (e) => addFiles(e.target.files));

  el("dropZone").addEventListener("dragover", (e) => {
    e.preventDefault();
    el("dropZone").classList.add("isOver");
  });
  el("dropZone").addEventListener("dragleave", () => {
    el("dropZone").classList.remove("isOver");
  });
  el("dropZone").addEventListener("drop", (e) => {
    e.preventDefault();
    el("dropZone").classList.remove("isOver");
    addFiles(e.dataTransfer.files);
  });

  el("btnAddPdfs").addEventListener("click", (e) => {
    e.stopPropagation();
    el("file").click();
  });
  el("btnReset").addEventListener("click", (e) => {
    e.stopPropagation();
    resetAll();
  });

  document.querySelectorAll(".btnQuality").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".btnQuality")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedQuality = btn.dataset.q;
    });
  });

  el("btnCompress").addEventListener("click", () => compress());

  el("btnDownload").addEventListener("click", () => {
    if (!resultBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(resultBlob);
    a.download = resultFilename;
    a.click();
  });

  el("btnBack").addEventListener("click", () => {
    resetAll();
    showView("viewForm");
  });

  el("btnClosePreview").addEventListener("click", () =>
    el("previewModal").classList.add("hidden"),
  );
  el("previewModal")
    .querySelector(".modalDim")
    .addEventListener("click", () =>
      el("previewModal").classList.add("hidden"),
    );
});

function addFiles(fileList) {
  const pdfs = Array.from(fileList).filter(
    (f) => f.type === "application/pdf",
  );
  for (const f of pdfs) {
    if (files.length >= MAX_FILES) break;
    if (files.some((e) => e.name === f.name && e.size === f.size)) continue;
    files.push(f);
  }
  renderPanel();
}

function resetAll() {
  files = [];
  resultBlob = null;
  resultFilename = "";
  el("file").value = "";
  renderPanel();
}

function renderPanel() {
  const count = files.length;
  el("pdfCount").textContent = count;

  if (count === 0) {
    el("dropText").classList.remove("hidden");
    el("panel").classList.add("hidden");
    el("dropZone").classList.remove("hasFiles");
    el("btnCompress").disabled = true;
    return;
  }

  el("dropText").classList.add("hidden");
  el("panel").classList.remove("hidden");
  el("dropZone").classList.add("hasFiles");
  el("btnCompress").disabled = false;
  el("pdfWarn").classList.toggle("hidden", count <= MAX_FILES);

  const list = el("pdfList");
  list.innerHTML = "";
  files.forEach((f, i) => {
    const item = document.createElement("div");
    item.className = "pdfItem";
    item.innerHTML = `
      <div class="pdfTop">
        <div class="pdfName">${escHtml(f.name)}</div>
        <div class="pdfMeta">${formatSize(f.size)}</div>
      </div>
      <div class="pdfActions">
        <button type="button" class="btnMini" data-preview="${i}">미리보기</button>
        <button type="button" class="btnMini btnDanger" data-remove="${i}">삭제</button>
      </div>`;
    list.appendChild(item);
  });

  list.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      files.splice(parseInt(btn.dataset.remove), 1);
      renderPanel();
    });
  });

  list.querySelectorAll("[data-preview]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      showPreview(files[parseInt(btn.dataset.preview)]);
    });
  });
}

async function showPreview(file) {
  if (!window.pdfjsLib) return;
  el("previewTitle").textContent = file.name;
  el("previewMeta").textContent = formatSize(file.size);
  el("previewHint").textContent = "1페이지 미리보기";
  el("previewModal").classList.remove("hidden");

  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const vp = page.getViewport({ scale: 1.5 });
    const canvas = el("previewCanvas");
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp })
      .promise;
  } catch (e) {
    el("previewHint").textContent = "미리보기 실패: " + e.message;
  }
}

async function compress() {
  if (files.length === 0) return;

  showView("viewLoading");

  const targetRatio = TARGET_RATIO[selectedQuality] || 0.5;
  const results = [];

  for (let fi = 0; fi < files.length; fi++) {
    const f = files[fi];
    const fileProgress = (sub) =>
      setLoading(
        `(${fi + 1}/${files.length}) ${f.name}${sub ? " — " + sub : ""}`,
        (fi / files.length) * 90,
      );

    fileProgress("");

    try {
      const result = await compressOne(f, targetRatio, fi, files.length);
      results.push(result);
    } catch (e) {
      results.push({ name: f.name, error: e.message });
    }
  }

  const successful = results.filter((r) => !r.error);

  if (successful.length === 0) {
    showView("viewForm");
    alert("압축 실패: " + results.map((r) => r.error).join(", "));
    return;
  }

  setLoading("파일 준비 중…", 95);

  if (successful.length === 1) {
    resultBlob = successful[0].blob;
    resultFilename = successful[0].name;
  } else if (window.JSZip) {
    const zip = new JSZip();
    for (const r of successful) zip.file(r.name, r.blob);
    resultBlob = await zip.generateAsync({ type: "blob" });
    resultFilename = "compressed.zip";
  } else {
    resultBlob = successful[0].blob;
    resultFilename = successful[0].name;
  }

  setLoading("완료", 100);

  const totalOriginal = successful.reduce((s, r) => s + r.originalSize, 0);
  const totalOut = resultBlob.size;
  const ratio = ((1 - totalOut / totalOriginal) * 100).toFixed(1);
  const skipped = successful.filter((r) => r.skipped).length;

  el("doneTitle").textContent =
    successful.length > 1
      ? `${successful.length}개 파일 완료`
      : "완료";
  el("doneInfo").innerHTML =
    `원본: ${formatSize(totalOriginal)} → ${formatSize(totalOut)} (${ratio}% 감소)` +
    (skipped > 0 ? `<br>${skipped}개 파일은 텍스트/벡터 문서로 판단되어 원본 반환` : "") +
    (results.some((r) => r.error)
      ? `<br><span class="warn">${results.filter((r) => r.error).length}개 실패</span>`
      : "");

  showView("viewDone");
}

async function compressOne(file, targetRatio, fileIndex, fileTotal) {
  const inputBuf = await file.arrayBuffer();
  const base = sanitizeBase(file.name.replace(/\.pdf$/i, ""));

  const pdf = await pdfjsLib.getDocument({ data: inputBuf.slice() }).promise;

  // 텍스트 위주 문서면 원본 그대로 반환
  const textHeavy = await isTextHeavyPdf(pdf);
  if (textHeavy) {
    await pdf.destroy?.();
    setLoading(
      `스킵: 텍스트 문서 (${fileIndex + 1}/${fileTotal})`,
      ((fileIndex + 1) / fileTotal) * 90,
    );
    return {
      name: `${base}.original.pdf`,
      blob: new Blob([inputBuf], { type: "application/pdf" }),
      originalSize: file.size,
      skipped: true,
    };
  }

  // 모든 페이지를 canvas로 렌더링
  const pageCount = pdf.numPages;
  const canvases = [];
  for (let i = 1; i <= pageCount; i++) {
    setLoading(
      `렌더링 중… (${fileIndex + 1}/${fileTotal}) ${i}/${pageCount}p`,
      (fileIndex / fileTotal + (i / pageCount) * 0.4 / fileTotal) * 90,
    );
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    await page.cleanup?.();
    canvases.push(canvas);
  }
  await pdf.destroy?.();

  const targetBytes = file.size * targetRatio;
  let bestBytes = Infinity;
  let bestPdfBytes = null;

  // 품질을 순서대로 시도, 목표 크기 이하가 되면 조기 종료
  for (let qi = 0; qi < QUALITIES.length; qi++) {
    const q = QUALITIES[qi];
    setLoading(
      `압축 중… (${fileIndex + 1}/${fileTotal}) 품질=${q.toFixed(2)}`,
      (fileIndex / fileTotal + (0.4 + qi / QUALITIES.length * 0.5) / fileTotal) * 90,
    );

    const pdfDoc = await PDFLib.PDFDocument.create();
    for (const canvas of canvases) {
      const jpgBytes = await canvasToJpegBytes(canvas, q);
      const img = await pdfDoc.embedJpg(jpgBytes);
      const w = canvas.width * 0.75;
      const h = canvas.height * 0.75;
      const page = pdfDoc.addPage([w, h]);
      page.drawImage(img, { x: 0, y: 0, width: w, height: h });
    }

    const outBytes = await pdfDoc.save();
    const size = outBytes.byteLength;
    if (size < bestBytes) {
      bestBytes = size;
      bestPdfBytes = outBytes;
    }
    if (size <= targetBytes) break;
  }

  // 압축 결과가 원본보다 크면 원본 반환
  if (bestBytes >= file.size) {
    return {
      name: `${base}.original.pdf`,
      blob: new Blob([inputBuf], { type: "application/pdf" }),
      originalSize: file.size,
      skipped: true,
    };
  }

  return {
    name: `${base}.compressed.pdf`,
    blob: new Blob([bestPdfBytes], { type: "application/pdf" }),
    originalSize: file.size,
    skipped: false,
  };
}

async function isTextHeavyPdf(pdf) {
  const n = Math.min(pdf.numPages, TEXT_DETECT_PAGES);
  if (n <= 0) return false;

  let total = 0;
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent({ disableCombineTextItems: false });
    total += (tc.items || []).reduce((acc, it) => {
      const s = it && it.str ? String(it.str).trim() : "";
      return acc + (s ? 1 : 0);
    }, 0);
    await page.cleanup?.();
  }

  return total / n >= TEXT_ITEM_THRESHOLD;
}

function canvasToJpegBytes(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(
      async (blob) => {
        const buf = await blob.arrayBuffer();
        resolve(new Uint8Array(buf));
      },
      "image/jpeg",
      quality,
    );
  });
}

function sanitizeBase(name) {
  return name.replace(/[^\w\-_.]/g, "_");
}

function setLoading(step, pct) {
  el("loadingStep").textContent = step;
  const p = Math.min(Math.round(pct), 100);
  el("bar").style.width = p + "%";
  el("loadingText").textContent = p + "%";
}

function showView(id) {
  ["viewForm", "viewLoading", "viewDone"].forEach((v) => {
    el(v).classList.toggle("hidden", v !== id);
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
