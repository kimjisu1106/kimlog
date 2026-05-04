// js/app.js

const MAX_FILES = 20;
// JPEG quality per compression level
// text-heavy pages get max(q, 0.75) to avoid blurry text
const QUALITY_MAP = { high: 0.82, mid: 0.55, low: 0.18 };

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

  const quality = QUALITY_MAP[selectedQuality] || 0.82;
  const results = [];

  for (let fi = 0; fi < files.length; fi++) {
    const f = files[fi];
    setLoading(
      `(${fi + 1}/${files.length}) ${f.name}`,
      (fi / files.length) * 90,
    );

    try {
      const compressed = await compressOne(f, quality, (pagePct) => {
        const base = fi / files.length;
        const step = 1 / files.length;
        setLoading(
          `(${fi + 1}/${files.length}) ${f.name} — ${pagePct}%`,
          (base + (step * pagePct) / 100) * 90,
        );
      });
      results.push({
        name: f.name.replace(/\.pdf$/i, "_compressed.pdf"),
        blob: compressed,
        original: f.size,
      });
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

  if (results.length === 1) {
    resultBlob = successful[0].blob;
    resultFilename = successful[0].name;
  } else if (window.JSZip) {
    const zip = new JSZip();
    for (const r of successful) zip.file(r.name, r.blob);
    resultBlob = await zip.generateAsync({ type: "blob" });
    resultFilename = "compressed.zip";
  } else {
    // JSZip 로드 실패 시 첫 번째 파일만 다운로드
    resultBlob = successful[0].blob;
    resultFilename = successful[0].name;
  }

  setLoading("완료", 100);

  const totalOriginal = successful.reduce((s, r) => s + r.original, 0);
  const totalCompressed = resultBlob.size;
  const ratio = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);

  el("doneTitle").textContent =
    results.length > 1 ? `${successful.length}개 파일 압축 완료` : "압축 완료";
  el("doneInfo").innerHTML =
    `원본: ${formatSize(totalOriginal)} → 압축 후: ${formatSize(totalCompressed)} (${ratio}% 감소)` +
    (results.some((r) => r.error)
      ? `<br><span class="warn">${results.filter((r) => r.error).length}개 실패</span>`
      : "");

  showView("viewDone");
}

async function compressOne(file, quality, onProgress) {
  const buf = await file.arrayBuffer();
  const pdfJs = await pdfjsLib.getDocument({ data: buf }).promise;
  const pageCount = pdfJs.numPages;
  const outPdf = await PDFLib.PDFDocument.create();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  for (let i = 1; i <= pageCount; i++) {
    onProgress(Math.round((i / pageCount) * 100));

    const page = await pdfJs.getPage(i);
    const vp = page.getViewport({ scale: 2.0 });
    canvas.width = vp.width;
    canvas.height = vp.height;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    // text-heavy pages get higher quality to avoid blurry text
    const textContent = await page.getTextContent();
    const pageQuality =
      textContent.items.length > 150 ? Math.max(quality, 0.75) : quality;

    const dataUrl = canvas.toDataURL("image/jpeg", pageQuality);
    const jpgBytes = dataUrlToBytes(dataUrl);
    const img = await outPdf.embedJpg(jpgBytes);

    // output at half the render scale = original dimensions
    const w = vp.width / 2;
    const h = vp.height / 2;
    const outPage = outPdf.addPage([w, h]);
    outPage.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }

  const bytes = await outPdf.save();
  return new Blob([bytes], { type: "application/pdf" });
}

function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(",")[1];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
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
