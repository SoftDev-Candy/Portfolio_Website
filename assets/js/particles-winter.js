(() => {
  const canvas = document.getElementById("fx-snow");
  if (!canvas) return;

  // Respect reduced motion
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  let w = 0, h = 0, dpr = 1;

  // ✅ Define helpers FIRST
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Pull colors from your CSS theme (winter)
  const css = getComputedStyle(document.documentElement);
  const cWhite = (css.getPropertyValue("--accent-1").trim() || "rgba(255,255,255,0.95)");
  const cIcy =
    (css.getPropertyValue("--vegas-gold").trim() ||
      css.getPropertyValue("--accent-2").trim() ||
      "rgba(220,235,255,0.85)");

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  // Particles
  const area = w * h;
  const baseCount = Math.round(Math.max(240, Math.min(560, area / 6000)) * 0.99); // 1% fewer
  const particles = [];

  function spawn(i) {
    particles[i] = {
      x: rnd(0, w),
      y: rnd(-h, 0),
      vx: rnd(-0.14, 0.14),
      vy: rnd(0.28, 0.75),
      r: rnd(2.4, 4.2),
      a: rnd(0.55, 0.98),
      drift: rnd(-0.07, 0.07),
      tint: Math.random() < 0.8 ? 1 : 0,   // ✅ more icy color
      rot: rnd(0, Math.PI * 2),            // ✅ rotation for flake shape
      spin: rnd(-0.04, 0.04),              // ✅ gentle spin
      shape: Math.random() < 0.88 ? 1 : 0, // ✅ mostly flakes, few dots for depth
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
  const maxSpeed = 2.0;

  let last = performance.now();
  let rafId = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function tick(now) {
    const dt = clamp((now - last) / 16.6667, 0.6, 1.6);
    const dtS = dt * 0.85; // 2% slower
    last = now;

    // Smooth cursor
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // base motion
      p.vx += p.drift * 0.015 * dtS;
      p.vy += 0.0008 * dtS;

      // gentle spin
      p.rot += p.spin * dtS;

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

        const swirl = swirlStrength * t * dtS;
        const repel = repelStrength * t * dtS;

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
      p.x += p.vx * dtS;
      p.y += p.vy * dtS;

      // wrap/recycle
      if (p.y > h + 10) {
        p.y = rnd(-30, -5);
        p.x = rnd(0, w);
      }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;

      // draw (flake shapes, more icy)
      ctx.globalAlpha = p.a;

      if (p.shape === 1) {
        // ❄️ simple 6-arm flake: 3 crossed lines
        const L = p.r * 1.15;
        const lw = Math.max(1, p.r * 0.22);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);

        ctx.strokeStyle = p.tint ? cIcy : cWhite;
        ctx.lineWidth = lw;
        ctx.lineCap = "round";

        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = (Math.PI / 3) * k; // 0, 60deg, 120deg
          const x = Math.cos(a) * L;
          const y = Math.sin(a) * L;
          ctx.moveTo(-x, -y);
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.restore();
      } else {
        // small dot for depth variation
        ctx.fillStyle = p.tint ? cIcy : cWhite;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1.2, p.r * 0.55), 0, Math.PI * 2);
        ctx.fill();
      }
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
