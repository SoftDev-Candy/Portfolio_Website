(() => {
  window.__FLUIDS_ASSET_BASE__ = "./Fluids_v3/js/";

  const body = document.body;
  if (body) {
    body.style.setProperty("background-image", "none", "important");
    body.style.setProperty("background", "var(--base-bg, #0a0d14)", "important");
    body.style.setProperty("background-color", "var(--base-bg, #0a0d14)", "important");
  }

  const fluidCanvas = document.getElementById("fx-fluid") || document.getElementById("fx-dust");
  if (fluidCanvas) {
    fluidCanvas.style.position = "fixed";
    fluidCanvas.style.inset = "0";
    fluidCanvas.style.width = "100vw";
    fluidCanvas.style.height = "100vh";
    fluidCanvas.style.zIndex = "1";
    fluidCanvas.style.pointerEvents = "none";
    fluidCanvas.setAttribute("aria-hidden", "true");
  }
})();
