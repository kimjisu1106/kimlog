// js/app.js
window.addEventListener("DOMContentLoaded", () => {
  // ===== Views =====
  const viewForm = document.getElementById("viewForm");
  const viewLoading = document.getElementById("viewLoading");
  const viewDone = document.getElementById("viewDone");

  function showView(name) {
    viewForm.classList.add("hidden");
    viewLoading.classList.add("hidden");
    viewDone.classList.add("hidden");
    if (name === "form") viewForm.classList.remove("hidden");
    if (name === "loading") viewLoading.classList.remove("hidden");
    if (name === "done") viewDone.classList.remove("hidden");
  }

  // ===== Elements =====
  const fileEl = document.getElementById("file");
  const dropZone = document.getElementById("dropZone");
  const dropTextEl = document.getElementById("dropText");
  const panel = document.getElementById("panel");

  const pdfListEl = document.getElementById("pdfList");
  const pageListEl = document.getElementById("pageList");

  const pdfCountEl = document.getElementById("pdfCount");
  const pdfWarnEl = document.getElementById("pdfWarn");

  const btnAddPdfs = document.getElementById("btnAddPdfs");
  const btnReset = document.getElementById("btnReset");
  const btnExtract = document.getElementById("btnExtract");
  const btnBuild = document.getElementById("btnBuild");

  const chkSelectAll = document.getElementById("chkSelectAll");
  const totalPagesEl = document.getElementById("totalPages");

  const libStatus = document.getElementById("libStatus");
  const rangeInput = document.getElementById("rangeInput");
  const btnExtractRange = document.getElementById("btnExtractRange");

  // loading
  const bar = document.getElementById("bar");
  const loadingText = document.getElementById("loadingText");
  const loadingStep = document.getElementById("loadingStep");
  const loadingTitle = document.getElementById("loadingTitle");

  // done
  const doneTitle = document.getElementById("doneTitle");
  const doneInfo = document.getElementById("doneInfo");
  const btnDownload = document.getElementById("btnDownload");
  const btnBack = document.getElementById("btnBack");

  // preview modal
  const previewModal = document.getElementById("previewModal");
  const btnClosePreview = document.getElementById("btnClosePreview");
  const previewTitle = document.getElementById("previewTitle");
  const previewMeta = document.getElementById("previewMeta");
  const previewCanvas = document.getElementById("previewCanvas");
  const previewHint = document.getElementById("previewHint");

  // ===== Settings =====
  const MAX_PDFS = 20;
  const MAX_TOTAL_PAGES = 350;
  document.getElementById("maxFilesText").textContent = MAX_PDFS;
  document.getElementById("maxFilesText2").textContent = MAX_PDFS;

  // ===== State =====
  let sources = []; // { id, file, bytes, name, size, pageCount }
  let pages = []; // { id, srcId, srcPageIndex0, selected }

  let nextSrcId = 1;
  let nextPageId = 1;

  let dragPageId = null;
  let lastMovedPageId = null;

  let dragSrcId = null;

  let outBlobUrl = null;
  let outFilename = "output.pdf";
  let outBytes = 0;

  // ===== Utils =====
  let savingTicker = null;

  function startSavingTicker() {
    stopSavingTicker();
    const base = "저장 중";
    let dots = 0;

    savingTicker = setInterval(() => {
      dots = (dots + 1) % 4; // 0~3
      loadingStep.textContent = base + ".".repeat(dots);
    }, 400);
  }

  function stopSavingTicker() {
    if (savingTicker) {
      clearInterval(savingTicker);
      savingTicker = null;
    }
  }

  function bytesToSmart(bytes) {
    if (!Number.isFinite(bytes)) return "-";
    const KB = 1024,
      MB = KB * 1024,
      GB = MB * 1024;
    if (bytes >= GB) return (bytes / GB).toFixed(2) + " GB";
    if (bytes >= MB) return (bytes / MB).toFixed(2) + " MB";
    return Math.max(1, Math.round(bytes / KB)) + " KB";
  }

  function sanitizeBase(name) {
    let s = (name || "").trim();
    if (!s) s = "file";
    return s.replace(/[\\/:*?"<>|]+/g, "_");
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function setProgress(pct, label) {
    const v = Math.max(0, Math.min(100, Math.floor(pct)));
    bar.style.width = v + "%";

    if (String(label || "").includes("저장")) {
      loadingText.textContent = "작업 중…";
    } else {
      loadingText.textContent = v + "%";
    }

    if (label) loadingStep.textContent = label;
  }

  function hasAny() {
    return sources.length > 0 && pages.length > 0;
  }

  function updateButtons() {
    const any = hasAny();
    const anySelected = pages.some((p) => p.selected);

    btnBuild.disabled = !any;
    btnExtract.disabled = !anySelected;

    dropZone.classList.toggle("hasFiles", sources.length > 0);
    dropTextEl.style.display = sources.length ? "none" : "block";
    panel.classList.toggle("hidden", sources.length === 0);

    pdfCountEl.textContent = sources.length;
    pdfWarnEl.classList.toggle("hidden", sources.length <= MAX_PDFS);
  }

  function recomputeSelectAllCheckbox() {
    if (!pages.length) {
      chkSelectAll.checked = false;
      chkSelectAll.indeterminate = false;
      return;
    }
    const selectedCount = pages.filter((p) => p.selected).length;
    chkSelectAll.checked = selectedCount === pages.length;
    chkSelectAll.indeterminate =
      selectedCount > 0 && selectedCount < pages.length;
  }

  function parseRangeInput(str, max) {
    const s = String(str || "").replace(/\s+/g, "");
    if (!s) return [];

    const out = new Set();
    const parts = s.split(",");

    for (const part of parts) {
      if (!part) continue;

      if (part.includes("-")) {
        const [aRaw, bRaw] = part.split("-");
        const a = parseInt(aRaw, 10);
        const b = parseInt(bRaw, 10);
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

        const start = Math.min(a, b);
        const end = Math.max(a, b);

        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= max) out.add(i);
        }
      } else {
        const n = parseInt(part, 10);
        if (Number.isFinite(n) && n >= 1 && n <= max) out.add(n);
      }
    }
    return Array.from(out).sort((x, y) => x - y);
  }

  function rebuildPagesFromSources() {
    pages = [];
    nextPageId = 1;

    for (const s of sources) {
      for (let i = 0; i < s.pageCount; i++) {
        pages.push({
          id: String(nextPageId++),
          srcId: s.id,
          srcPageIndex0: i,
          selected: false,
        });
      }
    }

    chkSelectAll.checked = false;
    chkSelectAll.indeterminate = false;
  }

  // ===== Adding PDFs =====
  async function addPdfFiles(fileList) {
    const incoming = Array.from(fileList || []).filter(
      (f) => f && f.type === "application/pdf",
    );
    if (!incoming.length) return alert("PDF 파일만 가능합니다.");

    if (sources.length + incoming.length > MAX_PDFS) {
      alert(`PDF는 최대 ${MAX_PDFS}개까지 업로드 가능합니다.`);
      return;
    }

    const ok = await ensureLibs();
    libStatus.textContent = ok
      ? "라이브러리 준비됨 (pdf-lib / 미리보기는 pdf.js)"
      : "라이브러리 로드 실패 가능. 네트워크/CSP 확인.";
    if (!ok) return alert("라이브러리 로드 실패(pdf-lib).");

    try {
      for (const f of incoming) {
        const buf = await f.arrayBuffer();
        const bytes = new Uint8Array(buf);

        const { PDFDocument } = window.PDFLib;
        const doc = await PDFDocument.load(bytes, {
          ignoreEncryption: true,
        });
        const pageCount = doc.getPageCount();

        const srcId = String(nextSrcId++);
        sources.push({
          id: srcId,
          file: f,
          bytes,
          name: f.name,
          size: f.size,
          pageCount,
        });

        for (let i = 0; i < pageCount; i++) {
          pages.push({
            id: String(nextPageId++),
            srcId,
            srcPageIndex0: i,
            selected: false,
          });
        }
      }

      if (pages.length > MAX_TOTAL_PAGES) {
        alert(
          `총 페이지가 너무 많습니다. (${pages.length}p)\n${MAX_TOTAL_PAGES}p 이하로 줄여주세요.`,
        );
      }

      renderAll();
    } catch (e) {
      console.error(e);
      alert("PDF 읽기 실패: " + (e?.message || e));
    }
  }

  function removeSource(srcId) {
    if (
      !confirm("이 PDF를 삭제하면 포함된 페이지도 함께 삭제됩니다. 진행할까요?")
    )
      return;
    sources = sources.filter((s) => s.id !== srcId);
    pages = pages.filter((p) => p.srcId !== srcId);
    renderAll();
  }

  function resetAll() {
    sources = [];
    pages = [];
    nextSrcId = 1;
    nextPageId = 1;
    dragPageId = null;
    lastMovedPageId = null;
    dragSrcId = null;

    chkSelectAll.checked = false;
    chkSelectAll.indeterminate = false;
    rangeInput.value = "";

    if (outBlobUrl) {
      URL.revokeObjectURL(outBlobUrl);
      outBlobUrl = null;
    }

    renderAll();
  }

  // ===== PDF operations =====
  function moveSource(srcId, dir) {
    const idx = sources.findIndex((s) => s.id === srcId);
    if (idx < 0) return;
    const ni = idx + dir;
    if (ni < 0 || ni >= sources.length) return;

    if (
      !confirm(
        "PDF 순서를 바꾸면 현재 페이지 편집(삭제/순서/선택)이 초기화됩니다.\n계속할까요?",
      )
    ) {
      return;
    }

    const tmp = sources[idx];
    sources[idx] = sources[ni];
    sources[ni] = tmp;

    rebuildPagesFromSources();
    renderAll();
  }

  // ===== Page operations =====
  function togglePageSelected(pageId, val) {
    const p = pages.find((x) => x.id === pageId);
    if (!p) return;
    p.selected = !!val;
    renderPageList();
  }

  function deletePage(pageId) {
    pages = pages.filter((p) => p.id !== pageId);
    renderAll();
  }

  function movePage(pageId, dir) {
    const idx = pages.findIndex((p) => p.id === pageId);
    if (idx < 0) return;
    const ni = idx + dir;
    if (ni < 0 || ni >= pages.length) return;
    const tmp = pages[idx];
    pages[idx] = pages[ni];
    pages[ni] = tmp;
    lastMovedPageId = pageId;
    renderPageList();
  }

  // ===== Drag reorder pages =====
  function onPageDragStart(e, pageId) {
    dragPageId = pageId;
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", pageId);
    } catch {}
  }
  function onPageDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onPageDrop(e, targetId) {
    e.preventDefault();
    const fromId =
      dragPageId ||
      (() => {
        try {
          return e.dataTransfer.getData("text/plain");
        } catch {
          return null;
        }
      })();
    dragPageId = null;
    if (!fromId || fromId === targetId) return;

    const fromIdx = pages.findIndex((p) => p.id === fromId);
    const toIdx = pages.findIndex((p) => p.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const [moved] = pages.splice(fromIdx, 1);
    pages.splice(toIdx, 0, moved);
    lastMovedPageId = fromId;
    renderPageList();
  }

  // ===== Drag reorder sources =====
  function onSrcDragStart(e, srcId) {
    dragSrcId = srcId;
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", srcId);
    } catch {}
  }

  function onSrcDrop(e, targetSrcId) {
    e.preventDefault();
    const fromId =
      dragSrcId ||
      (() => {
        try {
          return e.dataTransfer.getData("text/plain");
        } catch {
          return null;
        }
      })();
    dragSrcId = null;

    if (!fromId || fromId === targetSrcId) return;

    if (
      !confirm(
        "PDF 순서를 바꾸면 현재 페이지 편집(삭제/순서/선택)이 초기화됩니다.\n계속할까요?",
      )
    ) {
      renderPdfList();
      return;
    }

    const fromIdx = sources.findIndex((s) => s.id === fromId);
    const toIdx = sources.findIndex((s) => s.id === targetSrcId);
    if (fromIdx < 0 || toIdx < 0) return;

    const [moved] = sources.splice(fromIdx, 1);
    sources.splice(toIdx, 0, moved);

    rebuildPagesFromSources();
    renderAll();
  }

  // ===== Rendering =====
  function renderPdfList() {
    pdfListEl.innerHTML = "";
    const total = sources.length;

    sources.forEach((s, i) => {
      const wrap = document.createElement("div");
      wrap.className = "pdfItem";
      wrap.setAttribute("draggable", "true");

      wrap.addEventListener("dragstart", (e) => onSrcDragStart(e, s.id));
      wrap.addEventListener("dragover", (e) => {
        e.preventDefault();
        wrap.classList.add("dropTarget");
      });
      wrap.addEventListener("dragleave", () =>
        wrap.classList.remove("dropTarget"),
      );
      wrap.addEventListener("drop", (e) => {
        wrap.classList.remove("dropTarget");
        onSrcDrop(e, s.id);
      });

      const top = document.createElement("div");
      top.className = "pdfTop";

      const handle = document.createElement("div");
      handle.className = "dragHandle";
      handle.title = "드래그해서 PDF 순서 변경(편집 초기화)";
      handle.textContent = "≡";

      const right = document.createElement("div");
      right.className = "pdfRight";

      const name = document.createElement("div");
      name.className = "pdfName";
      name.textContent = s.name;

      const meta = document.createElement("div");
      meta.className = "pdfMeta";
      meta.textContent = `페이지: ${s.pageCount}p · 크기: ${bytesToSmart(
        s.size,
      )}`;

      const act = document.createElement("div");
      act.className = "pdfActions";

      const btnUp = document.createElement("button");
      btnUp.type = "button";
      btnUp.className = "btnMini";
      btnUp.textContent = "⬆️";
      btnUp.disabled = i === 0;
      btnUp.title = "PDF 위로 이동(편집 초기화)";
      btnUp.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        moveSource(s.id, -1);
      });

      const btnDown = document.createElement("button");
      btnDown.type = "button";
      btnDown.className = "btnMini";
      btnDown.textContent = "⬇️";
      btnDown.disabled = i === total - 1;
      btnDown.title = "PDF 아래로 이동(편집 초기화)";
      btnDown.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        moveSource(s.id, +1);
      });

      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btnMini btnDanger";
      btnDel.textContent = "PDF 삭제";
      btnDel.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeSource(s.id);
      });

      act.appendChild(btnUp);
      act.appendChild(btnDown);
      act.appendChild(btnDel);

      right.appendChild(name);
      right.appendChild(meta);
      right.appendChild(act);

      top.appendChild(handle);
      top.appendChild(right);

      wrap.appendChild(top);
      pdfListEl.appendChild(wrap);
    });
  }

  function renderPageList() {
    pageListEl.innerHTML = "";
    totalPagesEl.textContent = pages.length;

    const total = pages.length;

    pages.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "pageItem";

      if (p.id === lastMovedPageId) {
        row.classList.add("flash");
        setTimeout(() => row.classList.remove("flash"), 900);
      }

      row.setAttribute("draggable", "true");

      row.addEventListener("dragstart", (e) => {
        row.classList.add("dragging");
        onPageDragStart(e, p.id);
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        dragPageId = null;
        pageListEl
          .querySelectorAll(".dropTarget")
          .forEach((el) => el.classList.remove("dropTarget"));
      });
      row.addEventListener("dragover", (e) => {
        onPageDragOver(e);
        row.classList.add("dropTarget");
      });
      row.addEventListener("dragleave", () =>
        row.classList.remove("dropTarget"),
      );
      row.addEventListener("drop", (e) => {
        row.classList.remove("dropTarget");
        onPageDrop(e, p.id);
      });

      const handle = document.createElement("div");
      handle.className = "dragHandle";
      handle.title = "드래그해서 순서 변경";
      handle.textContent = "≡";

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = !!p.selected;
      chk.title = "추출할 페이지 선택";
      chk.addEventListener("change", () =>
        togglePageSelected(p.id, chk.checked),
      );

      const main = document.createElement("div");
      main.className = "pageMain";

      const src = sources.find((s) => s.id === p.srcId);
      const srcName = src ? src.name : "unknown.pdf";
      const srcPage = p.srcPageIndex0 + 1;

      const t = document.createElement("div");
      t.className = "pageTitle";
      t.appendChild(document.createTextNode(`${i + 1}. `));
      const fn = document.createElement("span");
      fn.className = "fileWrap";
      fn.textContent = srcName;
      t.appendChild(fn);

      const m = document.createElement("div");
      m.className = "pageMeta";
      m.textContent = `원본 페이지: ${srcPage}`;

      main.appendChild(t);
      main.appendChild(m);

      // 클릭 미리보기(항상)
      main.style.cursor = "pointer";
      main.title = "클릭하면 미리보기";
      main.addEventListener("click", async (e) => {
        if (e.target.closest("button, input")) return;
        e.preventDefault();
        e.stopPropagation();
        await openPreviewByPageItem(p, i);
      });

      const actions = document.createElement("div");
      actions.className = "pageActions";

      const btnUp = document.createElement("button");
      btnUp.type = "button";
      btnUp.className = "btnMini";
      btnUp.textContent = "⬆️";
      btnUp.disabled = i === 0;
      btnUp.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        movePage(p.id, -1);
      });

      const btnDown = document.createElement("button");
      btnDown.type = "button";
      btnDown.className = "btnMini";
      btnDown.textContent = "⬇️";
      btnDown.disabled = i === total - 1;
      btnDown.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        movePage(p.id, +1);
      });

      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btnMini btnDanger";
      btnDel.textContent = "삭제";
      btnDel.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        deletePage(p.id);
      });

      actions.appendChild(btnUp);
      actions.appendChild(btnDown);
      actions.appendChild(btnDel);

      row.appendChild(handle);
      row.appendChild(chk);
      row.appendChild(main);
      row.appendChild(actions);

      pageListEl.appendChild(row);
    });

    lastMovedPageId = null;
    recomputeSelectAllCheckbox();
    updateButtons();
  }

  function renderAll() {
    renderPdfList();
    renderPageList();
  }

  // ===== Dropzone handling =====
  ["dragenter", "dragover"].forEach((evt) => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dropZone.classList.contains("hasFiles"))
        dropZone.classList.add("isOver");
    });
  });
  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("isOver");
  });
  dropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("isOver");
    const dt = e.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) return;
    await addPdfFiles(dt.files);
  });

  dropZone.addEventListener("click", (e) => {
    if (e.target.closest("button, a, input, select, textarea")) return;
    if (sources.length === 0) fileEl.click();
  });

  btnAddPdfs.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileEl.click();
  });

  btnReset.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("모든 PDF/페이지를 초기화하시겠습니까?")) resetAll();
  });

  fileEl.addEventListener("change", async () => {
    await addPdfFiles(fileEl.files);
    fileEl.value = "";
  });

  // select all
  chkSelectAll.addEventListener("change", () => {
    const v = chkSelectAll.checked;
    pages.forEach((p) => (p.selected = v));
    renderPageList();
  });

  // 범위 선택 -> 체크 반영
  btnExtractRange.addEventListener("click", () => {
    if (!pages.length) return alert("페이지가 없습니다.");

    const indices = parseRangeInput(rangeInput.value, pages.length);
    if (!indices.length) {
      alert("범위 입력이 비었습니다. 예: 1-3,7,10-12");
      return;
    }

    pages.forEach((p) => (p.selected = false));
    indices.forEach((n) => {
      const page = pages[n - 1];
      if (page) page.selected = true;
    });

    rangeInput.blur();
    renderPageList();
  });

  // ===== Preview =====
  btnClosePreview.addEventListener("click", () =>
    previewModal.classList.add("hidden"),
  );
  previewModal.querySelector(".modalDim").addEventListener("click", () => {
    previewModal.classList.add("hidden");
  });

  async function openPreviewByPageItem(pageItem, indexInList) {
    if (!window.pdfjsLib) await ensureLibs();
    if (!window.pdfjsLib) {
      alert("미리보기 라이브러리(pdf.js) 로드 실패. 네트워크/CSP 확인.");
      return;
    }

    const src = sources.find((s) => s.id === pageItem.srcId);
    if (!src) return;

    const srcPage = pageItem.srcPageIndex0 + 1;
    previewTitle.textContent = `페이지 미리보기`;
    previewMeta.textContent = `${src.name} · 원본 페이지 ${srcPage}`;
    previewHint.textContent = "미리보기 생성 중…";
    previewModal.classList.remove("hidden");

    const ctx = previewCanvas.getContext("2d", { alpha: false });
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    try {
      const task = pdfjsLib.getDocument({ data: src.bytes });
      const pdf = await task.promise;
      const page = await pdf.getPage(srcPage);

      const targetW = 760;
      const vp1 = page.getViewport({ scale: 1 });
      const scale = Math.min(2.0, Math.max(0.6, targetW / vp1.width));
      const viewport = page.getViewport({ scale });

      previewCanvas.width = Math.floor(viewport.width);
      previewCanvas.height = Math.floor(viewport.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      previewHint.textContent = `편집 목록 위치: ${indexInList + 1} / 총 ${
        pages.length
      }`;
      await pdf.destroy?.();
    } catch (e) {
      console.error(e);
      previewHint.textContent = "미리보기 실패(손상 PDF/메모리 부족 가능)";
    }
  }

  // ===== Build / Extract =====
  async function buildOutput(mode) {
    const ok = await ensureLibs();
    libStatus.textContent = ok
      ? "라이브러리 준비됨 (pdf-lib)"
      : "라이브러리 로드 실패(스크립트 차단 가능)";
    if (!ok) return alert("라이브러리 로드 실패(pdf-lib).");

    if (!pages.length) return alert("페이지가 없습니다.");

    const chosen =
      mode === "extract" ? pages.filter((p) => p.selected) : pages.slice();
    if (!chosen.length) return alert("선택된 페이지가 없습니다.");

    // ✅ 제한 정책
    // - extract: 선택된 페이지 수 기준
    // - build: 전체 페이지 수 기준 (사실 chosen이 전체라 동일하지만 의도를 명확히)
    const limitCount = mode === "extract" ? chosen.length : pages.length;

    if (limitCount > MAX_TOTAL_PAGES) {
      return alert(
        `페이지가 너무 많습니다. (${limitCount}p)\n${MAX_TOTAL_PAGES}p 이하로 줄여주세요.`,
      );
    }

    // ✅ 이전 결과 URL 정리
    if (outBlobUrl) {
      URL.revokeObjectURL(outBlobUrl);
      outBlobUrl = null;
    }

    // ✅ 로딩 화면 진입
    showView("loading");
    loadingTitle.textContent =
      mode === "extract" ? "페이지 추출 중" : "PDF 합치는 중";
    setProgress(0, "시작…");

    const start = Date.now();
    const MIN_LOADING_MS = 10000;

    try {
      const bytes = await buildPdfFromPageItems(chosen, (pct, label) =>
        setProgress(pct, label),
      );

      const elapsed = Date.now() - start;
      if (elapsed < MIN_LOADING_MS) await sleep(MIN_LOADING_MS - elapsed);

      outBytes = bytes.byteLength;
      const blob = new Blob([bytes], { type: "application/pdf" });
      outBlobUrl = URL.createObjectURL(blob);

      const base =
        sources.length >= 1
          ? sanitizeBase((sources[0].name || "output").replace(/\.pdf$/i, ""))
          : "output";

      outFilename =
        mode === "extract" ? `${base}.extract.pdf` : `${base}.edited.pdf`;

      doneTitle.textContent =
        mode === "extract" ? "추출 결과 PDF" : "편집 결과 PDF";
      doneInfo.textContent = `페이지 ${chosen.length}p · 결과 크기: ${bytesToSmart(outBytes)}`;

      setProgress(100, "완료");
      showView("done");
    } catch (e) {
      console.error(e);
      alert("처리 중 오류: " + (e?.message || e));
      showView("form");
    }
  }

  async function buildPdfFromPageItems(pageItems, progressCb) {
    const { PDFDocument } = window.PDFLib;

    const report = (pct, label) => {
      if (typeof progressCb === "function") progressCb(pct, label);
    };

    report(3, "문서 생성…");
    const outDoc = await PDFDocument.create();

    const srcDocCache = new Map();

    for (let i = 0; i < pageItems.length; i++) {
      const it = pageItems[i];
      const src = sources.find((s) => s.id === it.srcId);
      if (!src) continue;

      const pct = 5 + (i / pageItems.length) * 85;
      report(pct, `페이지 복사 중… (${i + 1}/${pageItems.length})`);

      let srcDoc = srcDocCache.get(src.id);
      if (!srcDoc) {
        srcDoc = await PDFDocument.load(src.bytes, {
          ignoreEncryption: true,
        });
        srcDocCache.set(src.id, srcDoc);
      }

      const [copied] = await outDoc.copyPages(srcDoc, [it.srcPageIndex0]);
      outDoc.addPage(copied);
    }

    if (typeof progressCb === "function") progressCb(92, "저장 중");
    await new Promise((r) => requestAnimationFrame(r));
    startSavingTicker();

    let outBytes;
    try {
      outBytes = await outDoc.save({ useObjectStreams: false });
    } finally {
      stopSavingTicker();
    }

    report(98, "마무리…");
    return outBytes;
  }

  btnExtract.addEventListener("click", async () => {
    await buildOutput("extract");
  });

  btnBuild.addEventListener("click", async () => {
    await buildOutput("build");
  });

  // ===== Done actions =====
  btnDownload.addEventListener("click", () => {
    if (!outBlobUrl) return;
    const a = document.createElement("a");
    a.href = outBlobUrl;
    a.download = outFilename || "output.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  btnBack.addEventListener("click", () => {
    if (outBlobUrl) {
      URL.revokeObjectURL(outBlobUrl);
      outBlobUrl = null;
    }
    fileEl.value = "";
    bar.style.width = "0%";
    loadingText.textContent = "0%";
    loadingStep.textContent = "";
    doneInfo.textContent = "";
    resetAll();
    showView("form");
  });

  // ===== Init =====
  (async function init() {
    const ok = await ensureLibs();
    libStatus.textContent = ok
      ? "라이브러리 준비됨 (pdf-lib / 미리보기는 pdf.js)"
      : "라이브러리 로드 실패 가능. 네트워크/CSP 확인.";
    renderAll();
  })();
});
