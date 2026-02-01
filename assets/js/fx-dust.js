/* fx-dust.js — Fine “sun-ray” dust + cursor swirl (NO backlight)
   - One canvas
   - Lots of fine particles
   - No falling/gravity; float field + gentle drift
   - Cursor swirl + repel (snow-like)
   - Fake glow (2-pass), no shadowBlur
   - DPR cap, pause on hidden, respects reduced motion
*/

(() => {
  const canvas = document.getElementById("fx-dust");
  if (!canvas) return;

  // Respect reduced motion
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion) return;

  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) return;

  // -----------------------------
  // TUNING
  // -----------------------------
  const FX = {
    dprCap: 2,

    // Particle count scaling
    maxParticles: 6000,

    // Fine dust dots
    rMin: 0.3,
    rMax: 1.2,  

    // Base float drift (very small, no falling)
    baseDrift: 5.5,      // px/sec baseline drift magnitude
    baseBiasX: 0.25,     // slight sideways bias
    baseBiasY: 0.05,     // tiny vertical bias (near zero)

    // Flow/turbulence (lightweight sin/cos)
    flowFreq: 0.00085,
    flowAmp: 22,

    // Velocity damping
    damping: 1.65,       // per second

    // Cursor vortex
    cursorRadius: 150,
    swirlStrength: 5,
    repelStrength: 0.2,
    cursorSmooth: 0.6,
    maxSpeed: 3,

    // Visibility
    globalAlphaMax: 1.0,
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function readCssNumber(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function readCssColor(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  // Theme colors
  function getPalette() {
    const cWhite = readCssColor("--accent-1", "rgba(255,255,255,0.95)");
    const cTint =
      readCssColor("--vegas-gold",
        readCssColor("--accent-2", "rgba(220,235,255,0.85)")
      );
    const cGlow = readCssColor("--accent-glow", "rgba(255,255,255,0.35)");
    return { cWhite, cTint, cGlow };
  }

  // -----------------------------
  // Canvas sizing
  // -----------------------------
  let w = 0, h = 0, dpr = 1;

  function resize() {
    dpr = Math.max(1, Math.min(FX.dprCap, window.devicePixelRatio || 1));
    w = Math.max(1, Math.floor(window.innerWidth));
    h = Math.max(1, Math.floor(window.innerHeight));

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    rebuildParticles(true);
  }

  window.addEventListener("resize", resize, { passive: true });

  // -----------------------------
  // Particles
  // -----------------------------
  let particles = [];

  function computeBaseCount() {
    const area = w * h;

    // small phone: ~600–1200
    // desktop: ~1400–2600
    const aMin = 360 * 640;
    const aMax = 2560 * 1440;
    const t = clamp((area - aMin) / (aMax - aMin), 0, 1);

    const mobile = lerp(600, 1200, t);
    const desk = lerp(1400, 2600, t);
    const wt = clamp((w - 420) / (1100 - 420), 0, 1);

    return Math.round(lerp(mobile, desk, wt));
  }

  function makeParticle() {
    const z = Math.pow(Math.random(), 1.75);

    const r = lerp(FX.rMin, FX.rMax, z) * rnd(0.9, 1.12);
    const a = lerp(0.12, 0.42, z) * rnd(0.8, 1.05);

    const x = rnd(0, w);
    const y = rnd(0, h);

    const angle = rnd(0, Math.PI * 2);
    const sp = rnd(0.15, 1.0) * lerp(0.25, 1.0, z);
    const vx = Math.cos(angle) * sp;
    const vy = Math.sin(angle) * sp;

    const ph1 = rnd(0, Math.PI * 2);
    const ph2 = rnd(0, Math.PI * 2);
    const tw = rnd(0.7, 1.35);

    const tint = Math.random() < 0.82 ? 1 : 0;

    return { x, y, vx, vy, r, a, z, ph1, ph2, tw, tint };
  }

  function rebuildParticles(force) {
    const density = clamp(readCssNumber("--dust-density", 1.0), 0, 8);
    const target = clamp(Math.round(computeBaseCount() * density), 0, FX.maxParticles);

    if (!force && particles.length && Math.abs(particles.length - target) < target * 0.12) {
      while (particles.length < target) particles.push(makeParticle());
      while (particles.length > target) particles.pop();
      return;
    }
    particles = new Array(target).fill(0).map(() => makeParticle());
  }

  // -----------------------------
  // Cursor (smoothed)
  // -----------------------------
  let tx = 0, ty = 0;
  let cx = 0, cy = 0;
  let cursorInit = false;

  window.addEventListener("pointermove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!cursorInit) {
      cx = tx; cy = ty;
      cursorInit = true;
    }
  }, { passive: true });

  // -----------------------------
  // Motion + draw
  // -----------------------------
  let last = performance.now();
  let rafId = 0;

  function tick(now) {
    const dt = clamp((now - last) / 1000, 0.001, 0.05);
    last = now;

    if (cursorInit) {
      cx += (tx - cx) * FX.cursorSmooth;
      cy += (ty - cy) * FX.cursorSmooth;
    }

    const opacityGlobal = clamp(readCssNumber("--dust-opacity", 0.95), 0, 1) * FX.globalAlphaMax;
    const sway = clamp(readCssNumber("--dust-sway", 1.3), 0, 6);
    const palette = getPalette();

    ctx.clearRect(0, 0, w, h);

    const damp = Math.exp(-FX.damping * dt);
    const R = FX.cursorRadius;
    const R2 = R * R;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      const t = now * FX.flowFreq * p.tw;
      const fx = (Math.sin(t + p.ph1) + Math.cos(t * 1.17 + p.ph2));
      const fy = (Math.cos(t * 0.93 + p.ph2) + Math.sin(t * 1.11 + p.ph1));

      const dk = lerp(0.22, 1.0, p.z);
      const flowX = fx * FX.flowAmp * sway * dk;
      const flowY = fy * FX.flowAmp * sway * dk;

      p.vx += (flowX * 0.04 + FX.baseBiasX) * dt;
      p.vy += (flowY * 0.04 + FX.baseBiasY) * dt;

      if (cursorInit) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist2 = dx * dx + dy * dy;

        if (dist2 < R2) {
          const dist = Math.sqrt(dist2) || 1;
          const tFall = 1 - dist / R;
          const t2 = tFall * tFall;
          const nx = dx / dist;
          const ny = dy / dist;

          const txp = -ny;
          const typ = nx;

          const swirl = FX.swirlStrength * t2 * lerp(0.35, 1.0, p.z);
          const repel = FX.repelStrength * t2 * lerp(0.35, 1.0, p.z);

          p.vx += txp * swirl;
          p.vy += typ * swirl;

          p.vx += nx * repel;
          p.vy += ny * repel;
        }
      }

      const sp = Math.hypot(p.vx, p.vy);
      if (sp > FX.maxSpeed) {
        const s = FX.maxSpeed / sp;
        p.vx *= s;
        p.vy *= s;
      }

      p.vx *= damp;
      p.vy *= damp;

      p.x += p.vx * (dt * FX.baseDrift);
      p.y += p.vy * (dt * FX.baseDrift);

      const pad = 60;
      if (p.x < -pad) p.x = w + pad;
      if (p.x > w + pad) p.x = -pad;
      if (p.y < -pad) p.y = h + pad;
      if (p.y > h + pad) p.y = -pad;

      const col = p.tint ? palette.cTint : palette.cWhite;
      const shimmer = 0.90 + 0.10 * Math.sin(now * 0.0012 * p.tw + p.ph1);
      const alpha = p.a * opacityGlobal * shimmer;

      // glow under-dot
      ctx.globalAlpha = alpha * 0.42;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // core dot
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!document.hidden) rafId = requestAnimationFrame(tick);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else {
      last = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  });

  // Init
  resize();
  rafId = requestAnimationFrame(tick);
})();
