(() => {
  window.__FLUIDS_ASSET_BASE__ = "./Fluids_v3/js/";

  const body = document.body;
  if (body) {
    body.style.setProperty("background-image", "none", "important");
    body.style.setProperty("background", "var(--base-bg, #0a0d14)", "important");
    body.style.setProperty("background-color", "var(--base-bg, #0a0d14)", "important");
  }

  const canvas = document.getElementById("fx-fluid") || document.getElementById("fx-dust");
  if (canvas) {
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.zIndex = "1";
    canvas.style.pointerEvents = "none";
    canvas.setAttribute("aria-hidden", "true");
  }
})();
