(() => {
  const canvas = document.getElementById("fx-snow");
  if (!canvas) return;

  // Respect reduced motion
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  let w = 0, h = 0, dpr = 1;

  // ✅ Define helpers FIRST (so resize/initGlows can use them)
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Pull colors from your CSS theme (winter)
  const css = getComputedStyle(document.documentElement);
  const cWhite = (css.getPropertyValue("--accent-1").trim() || "rgba(255,255,255,0.95)");
  const cIcy =
    (css.getPropertyValue("--vegas-gold").trim() ||
      css.getPropertyValue("--accent-2").trim() ||
      "rgba(220,235,255,0.85)");

  // ✅ Glows live OUTSIDE tick (shared by resize + tick)
  let glows = [];
  function initGlows() {
    glows = Array.from({ length: 7 }, () => ({
      x: rnd(0, w),
      y: rnd(0, h),
      r: rnd(70, 160),
      a: rnd(0.015, 0.05),
      vx: rnd(-0.06, 0.06),
      vy: rnd(-0.04, 0.04),
      p: rnd(0, Math.PI * 2),
    }));
  }

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    initGlows(); // ✅ now safe
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  // Particles
  const area = w * h;
  const baseCount = Math.round(Math.max(140, Math.min(320, area / 9000)));
  const particles = [];

  function spawn(i) {
    particles[i] = {
      x: rnd(0, w),
      y: rnd(-h, 0),
      vx: rnd(-0.25, 0.25),
      vy: rnd(0.55, 1.35),
      r: rnd(0.9, 2.6),
      a: rnd(0.45, 0.95),
      drift: rnd(-0.12, 0.12),
      tint: Math.random() < 0.4 ? 1 : 0,
    };
  }
  for (let i = 0; i < baseCount; i++) spawn(i);

  // Cursor (smoothed)
  let tx = w * 0.5, ty = h * 0.4;
  let cx = tx, cy = ty;

  window.addEventListener(
    "pointermove",
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
    },
    { passive: true }
  );

  // Vortex params
  const R = 220;
  const swirlStrength = 0.095;
  const repelStrength = 0.018;
  const maxSpeed = 3.0;

  let last = performance.now();
  let rafId = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function tick(now) {
    const dt = clamp((now - last) / 16.6667, 0.6, 1.6);
    last = now;

    // Smooth cursor
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;

    ctx.clearRect(0, 0, w, h);

    // ✅ draw soft glows behind snow
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const g of glows) {
      g.p += 0.012 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;

      // wrap
      if (g.x < -g.r) g.x = w + g.r;
      if (g.x > w + g.r) g.x = -g.r;
      if (g.y < -g.r) g.y = h + g.r;
      if (g.y > h + g.r) g.y = -g.r;

      const pulse = 0.6 + 0.4 * Math.sin(g.p);
      ctx.globalAlpha = g.a * pulse;
      ctx.fillStyle = cIcy;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // base motion
      p.vx += p.drift * 0.015 * dt;
      p.vy += 0.002 * dt;

      // Cursor interaction
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist2 = dx * dx + dy * dy;

      if (dist2 < R * R) {
        const dist = Math.sqrt(dist2) || 1;
        const t = 1 - dist / R;
        const nx = dx / dist;
        const ny = dy / dist;

        const txp = -ny;
        const typ = nx;

        const swirl = swirlStrength * t * dt;
        const repel = repelStrength * t * dt;

        p.vx += txp * swirl;
        p.vy += typ * swirl;

        p.vx += nx * repel;
        p.vy += ny * repel;
      }

      // clamp speed
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > maxSpeed) {
        const s = maxSpeed / sp;
        p.vx *= s;
        p.vy *= s;
      }

      // integrate
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // wrap/recycle
      if (p.y > h + 10) {
        p.y = rnd(-30, -5);
        p.x = rnd(0, w);
      }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;

      // draw
      ctx.fillStyle = p.tint ? cIcy : cWhite;

      ctx.globalAlpha = p.a * 0.22;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 2.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!document.hidden) rafId = requestAnimationFrame(tick);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      last = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  });

  rafId = requestAnimationFrame(tick);
})();
