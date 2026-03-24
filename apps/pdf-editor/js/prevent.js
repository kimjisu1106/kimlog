// 브라우저 기본 Drag&Drop(파일 열기) 방지 //
(function preventBrowserFileOpen() {
  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  window.addEventListener("dragover", stop, { passive: false });
  window.addEventListener("drop", stop, { passive: false });
  document.addEventListener("dragover", stop, { passive: false });
  document.addEventListener("drop", stop, { passive: false });
})();
