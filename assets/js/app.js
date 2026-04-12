// assets/js/app.js
const $ = (sel, root = document) => root.querySelector(sel);
const el = (id) => document.getElementById(id);

const DATA = {
  site: "./assets/data/site.json",
  profile: "./assets/data/profile.json",
  about: "./assets/data/about.json",
  services: "./assets/data/services.json",
  references: "./assets/data/references.json",
  resume: "./assets/data/resume.json",
  portfolio: "./assets/data/portfolio.json",
  projects: "./assets/data/projects.json",
  contact: "./assets/data/contact.json",
  music: "./assets/data/music.json",
};

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

function safeText(node, value) {
  if (!node) return;
  node.textContent = value ?? "";
}

function normalizeKey(s) {
  return String(s ?? "").trim().toLowerCase();
}

function unwrapPayload(payload, key) {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && key in payload) {
    return payload[key];
  }
  return payload;
}

function getLoaderConfig(siteData) {
  const cfg = siteData?.loader ?? {};
  return {
    eyebrow: String(cfg.eyebrow ?? "// Booting spring build"),
    title: String(cfg.title ?? siteData?.title ?? "Swastik Toprani"),
    loadingText: String(cfg.loadingText ?? "Streaming interface assets..."),
    readyText: String(cfg.readyText ?? "Launch sequence complete"),
  };
}

function setLoaderCopy(config) {
  safeText(el("site-loader-label"), config?.eyebrow);
  safeText(el("site-loader-title"), config?.title);
}

function setLoaderStatus(text) {
  safeText(el("site-loader-status"), text);
}

function setLoaderProgress(value) {
  const clamped = Math.max(0, Math.min(1, Number(value) || 0));
  const progressBar = el("site-loader-progress-bar");
  const progressText = el("site-loader-progress-text");

  if (progressBar) progressBar.style.transform = `scaleX(${clamped.toFixed(4)})`;
  if (progressText) progressText.textContent = `${Math.round(clamped * 100)}%`;
}

function hideLoader() {
  const loader = el("site-loader");
  document.body?.classList.remove("is-loading");
  document.body?.classList.add("is-ready");
  if (!loader) return;

  loader.classList.add("is-hidden");
  window.setTimeout(() => {
    loader.setAttribute("aria-hidden", "true");
  }, 520);
}

function showLoaderFailure(message) {
  setLoaderStatus(message ?? "Loader sync failed");
  setLoaderProgress(1);
  document.body?.classList.remove("is-loading");
}

function collectImageUrls(input, bag = new Set()) {
  if (!input) return bag;

  if (typeof input === "string") {
    const value = input.trim();
    if (/\.(png|jpe?g|webp|gif|svg|ico|avif)(\?|#|$)/i.test(value)) {
      bag.add(value);
    }
    return bag;
  }

  if (Array.isArray(input)) {
    input.forEach((item) => collectImageUrls(item, bag));
    return bag;
  }

  if (typeof input === "object") {
    Object.values(input).forEach((value) => collectImageUrls(value, bag));
  }

  return bag;
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    const finish = () => resolve(url);
    img.decoding = "async";
    img.onload = finish;
    img.onerror = finish;
    img.src = url;
  });
}

async function warmupVisualAssets(payloads, onProgress = () => {}) {
  const urls = Array.from(
    payloads.reduce((bag, payload) => collectImageUrls(payload, bag), new Set())
  );

  if (!urls.length) {
    onProgress(1, 0);
    return [];
  }

  let completed = 0;
  onProgress(0, urls.length);

  await Promise.all(
    urls.map(async (url) => {
      await preloadImage(url);
      completed += 1;
      onProgress(completed / urls.length, urls.length);
    })
  );

  return urls;
}

function waitForFluidReady(timeoutMs = 2200) {
  if (document.documentElement.dataset.fluidReady === "true") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const handleReady = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("fluid-ready", handleReady);
    };

    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    window.addEventListener("fluid-ready", handleReady);
  });
}

function nextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

// -----------------------------
// NAV + PAGE SWITCH
// -----------------------------
function setActivePage(pageKey) {
  const key = normalizeKey(pageKey);

  document.querySelectorAll("article[data-page]").forEach((a) => {
    a.classList.toggle("active", normalizeKey(a.dataset.page) === key);
  });

  document.querySelectorAll(".navbar-link[data-page]").forEach((b) => {
    b.classList.toggle("active", normalizeKey(b.dataset.page) === key);
  });
}

function renderNav(nav) {
  const list = el("nav-list");
  if (!list) return;

  list.innerHTML = "";
  const items = nav?.items ?? [];

  items.forEach((item) => {
    const page = normalizeKey(item.page);
    const li = document.createElement("li");
    li.className = "navbar-item";

    const btn = document.createElement("button");
    btn.className = "navbar-link";
    btn.type = "button";
    btn.dataset.navLink = "";
    btn.dataset.page = page;
    btn.textContent = item.label ?? item.page ?? "Page";

    btn.addEventListener("click", () => setActivePage(page));

    li.appendChild(btn);
    list.appendChild(li);
  });

  // initial active
  setActivePage(nav?.active ?? nav?.defaultPage ?? items[0]?.page ?? "portfolio");
}

// -----------------------------
// SIDEBAR
// -----------------------------
function wireSidebarToggle() {
  const sidebar = document.querySelector(".sidebar[data-sidebar]");
  const btn = document.querySelector("[data-sidebar-btn]");
  if (!sidebar || !btn) return;

  btn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });
}

function renderProfile(profile) {
  safeText(el("profile-name"), profile?.name);

  const avatar = el("profile-avatar");
  if (avatar && profile?.avatar) {
    avatar.src = profile.avatar;
    avatar.alt = profile?.name ?? "Avatar";
  }

  // roles
  const rolesWrap = el("profile-roles");
  if (rolesWrap) {
    rolesWrap.innerHTML = "";
    (profile?.roles ?? []).forEach((r) => {
      const p = document.createElement("p");
      p.className = "title";
      p.textContent = r;
      rolesWrap.appendChild(p);
    });
  }

  // contacts
  const contacts = el("contacts-list");
  if (contacts) {
    contacts.innerHTML = "";
    (profile?.contacts ?? []).forEach((c) => {
      const li = document.createElement("li");
      li.className = "contact-item";

      const iconBox = document.createElement("div");
      iconBox.className = "icon-box";
      const icon = document.createElement("ion-icon");
      icon.setAttribute("name", c.icon ?? "mail-outline");
      iconBox.appendChild(icon);

      const info = document.createElement("div");
      info.className = "contact-info";

      const title = document.createElement("p");
      title.className = "contact-title";
      title.textContent = c.title ?? "";

      info.appendChild(title);

      if (c.href) {
        const a = document.createElement("a");
        a.className = "contact-link";
        a.href = c.href;
        a.textContent = c.value ?? "";
        info.appendChild(a);
      } else if (c.value) {
        const addr = document.createElement("address");
        addr.textContent = c.value;
        info.appendChild(addr);
      }

      li.appendChild(iconBox);
      li.appendChild(info);
      contacts.appendChild(li);
    });
  }

  // social
  const socials = el("social-list");
  if (socials) {
    socials.innerHTML = "";
    (profile?.social ?? profile?.socials ?? []).forEach((s) => {
      const li = document.createElement("li");
      li.className = "social-item";
      const a = document.createElement("a");
      a.className = "social-link outline-grow-social";
      a.target = "_blank";
      a.rel = "noreferrer";
      a.href = s.href ?? "#";
      const socialLabel = String(s.label ?? "Social link");
      a.setAttribute("aria-label", socialLabel);
      a.title = socialLabel;
      const icon = document.createElement("ion-icon");
      icon.setAttribute("name", s.icon ?? "logo-github");
      a.appendChild(icon);
      li.appendChild(a);
      socials.appendChild(li);
    });
  }
}

function normalizeMusicTrack(track, index) {
  return {
    id: String(track?.id ?? `track-${index + 1}`),
    title: String(track?.title ?? `Track ${index + 1}`),
    artist: String(track?.artist ?? track?.subtitle ?? "Unknown artist"),
    src: String(track?.src ?? track?.url ?? track?.file ?? "").trim(),
    logo: String(track?.logo ?? track?.cover ?? track?.artwork ?? "").trim(),
  };
}

function renderMusicPlayer(musicCfg) {
  const socials = el("social-list");
  const dock = el("music-dock");
  if (!socials || !dock) return;

  const launcherLi = document.createElement("li");
  launcherLi.className = "social-item social-item--music";

  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "social-link social-link--music outline-grow-social";
  launcher.setAttribute("aria-label", musicCfg?.label ?? "Open music player");
  launcher.title = musicCfg?.label ?? "Open music player";
  launcher.setAttribute("aria-controls", "music-dock");

  const launcherLogo = String(musicCfg?.launcherLogo ?? "").trim();
  if (launcherLogo) {
    const logo = document.createElement("img");
    logo.className = "social-link__logo";
    logo.src = launcherLogo;
    logo.alt = musicCfg?.label ?? "Music player";
    logo.loading = "lazy";
    launcher.appendChild(logo);
  } else {
    const icon = document.createElement("ion-icon");
    icon.setAttribute("name", musicCfg?.launcherIcon ?? "musical-notes-outline");
    launcher.appendChild(icon);
  }

  launcherLi.appendChild(launcher);
  socials.appendChild(launcherLi);

  const dockCover = el("music-dock-cover");
  const dockTrack = el("music-dock-track");
  const dockArtist = el("music-dock-artist");
  const dockAudio = el("music-dock-audio");
  const dockEmpty = el("music-dock-empty");
  const dockClose = el("music-dock-close");
  const dockPrev = el("music-dock-prev");
  const dockNext = el("music-dock-next");
  const dockHide = el("music-dock-hide");
  const dockPlay = el("music-dock-play");
  const dockPlayIcon = el("music-dock-play-icon");
  const dockVolUp = el("music-dock-vol-up");
  const dockVolDown = el("music-dock-vol-down");
  const dockViz = el("music-dock-viz");
  const dockSeek = el("music-dock-seek");
  const dockCurrentTime = el("music-dock-current-time");
  const dockDuration = el("music-dock-duration");

  if (
    !dockCover ||
    !dockTrack ||
    !dockArtist ||
    !dockAudio ||
    !dockEmpty ||
    !dockClose ||
    !dockPrev ||
    !dockNext ||
    !dockHide ||
    !dockPlay ||
    !dockPlayIcon ||
    !dockVolUp ||
    !dockVolDown ||
    !dockViz ||
    !dockSeek ||
    !dockCurrentTime ||
    !dockDuration
  ) {
    return;
  }

  const tracks = Array.isArray(musicCfg?.tracks)
    ? musicCfg.tracks.map(normalizeMusicTrack)
    : [];

  const state = {
    open: false,
    index: 0,
    tracks,
    defaultLogo: String(musicCfg?.defaultLogo ?? "").trim(),
    volumeStep: 0.12,
    isSeeking: false,
    visualizer: {
      canvas: dockViz,
      ctx: dockViz.getContext("2d", { alpha: true }),
      audioContext: null,
      analyser: null,
      source: null,
      data: null,
      rafId: 0,
      active: false,
      supported: typeof window !== "undefined" && ("AudioContext" in window || "webkitAudioContext" in window),
      barCount: 16,
      pixelRatio: 1,
      traces: [[], [], [], [], []],
      lastPaint: 0,
      fpsInterval: 1000 / 24,
    },
  };

  const viz = state.visualizer;

  const formatPlaybackTime = (seconds) => {
    const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const syncTimelineState = (previewTime = null) => {
    const duration = Number.isFinite(dockAudio.duration) ? dockAudio.duration : 0;
    const time = previewTime ?? (Number.isFinite(dockAudio.currentTime) ? dockAudio.currentTime : 0);
    const safeDuration = duration > 0 ? duration : 0;
    const clampedTime = Math.max(0, Math.min(time, safeDuration || Math.max(time, 0)));
    const progress = safeDuration > 0 ? clampedTime / safeDuration : 0;

    dockCurrentTime.textContent = formatPlaybackTime(clampedTime);
    dockDuration.textContent = safeDuration > 0 ? formatPlaybackTime(safeDuration) : "0:00";
    dockSeek.disabled = !state.tracks.length || safeDuration <= 0;
    dockSeek.value = String(Math.round(progress * 1000));
    dockSeek.style.setProperty("--seek-progress", `${(progress * 100).toFixed(2)}%`);
  };

  const getVisualizerPalette = () => {
    const styles = getComputedStyle(document.documentElement);
    return {
      accent: styles.getPropertyValue("--accent-2").trim() || "#ffffff",
      accentSoft: styles.getPropertyValue("--accent-1").trim() || "#cfcfcf",
      highlight: styles.getPropertyValue("--white-1").trim() || "#ffffff",
      whiteSoft: styles.getPropertyValue("--white-2").trim() || "#e8e8e8",
      rail: styles.getPropertyValue("--accent-3").trim() || "#222222",
      glow: styles.getPropertyValue("--accent-glow").trim() || "rgba(255,255,255,0.24)",
    };
  };

  const syncVisualizerCanvasSize = () => {
    if (!viz.canvas) return;

    const rect = viz.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (viz.canvas.width !== width || viz.canvas.height !== height) {
      viz.canvas.width = width;
      viz.canvas.height = height;
      viz.pixelRatio = dpr;
    }
  };

  const drawVisualizerLines = (traces, palette) => {
    if (!viz.ctx) return;

    const ctx = viz.ctx;
    const width = viz.canvas.width;
    const height = viz.canvas.height;
    const dpr = viz.pixelRatio || 1;
    const insetX = 4 * dpr;

    ctx.clearRect(0, 0, width, height);

    const smoothstep = (edge0, edge1, value) => {
      if (edge0 === edge1) return value < edge0 ? 0 : 1;
      const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    const edgeEnvelope = (t) => {
      const head = smoothstep(0.06, 0.2, t);
      const tail = smoothstep(0.06, 0.2, 1 - t);
      return head * tail;
    };

    const buildPoints = (levels, baseY, amplitude, mode = "wave", energy = 0) => {
      const count = levels.length;
      if (!count) return [];
      const step = count > 1 ? (width - insetX * 2) / (count - 1) : 0;
      const phase = energy * Math.PI * 1.5;

      return levels.map((level, index) => {
        const x = insetX + step * index;
        const t = count > 1 ? index / (count - 1) : 0;
        const envelope = edgeEnvelope(t);
        const intensity = (Math.max(0, level ?? 0) * 0.88 + energy * 0.12) * envelope;
        const harmonic = Math.sin(t * Math.PI * (3.6 + energy * 3.4) + phase);
        let y = baseY;

        if (mode === "wave-up") {
          y = baseY - amplitude * (intensity * 0.9 + harmonic * 0.08 * envelope);
        }

        if (mode === "wave-down") {
          y = baseY + amplitude * (intensity * 0.84 + harmonic * 0.06 * envelope);
        }

        if (mode === "alternate") {
          y = baseY + (index % 2 === 0 ? -1 : 1) * amplitude * (intensity * 0.86) + harmonic * amplitude * 0.08 * envelope;
        }

        if (mode === "ribbon") {
          y = baseY - amplitude * (intensity * 0.64) + harmonic * amplitude * 0.2 * envelope;
        }

        if (mode === "shimmer") {
          y = baseY + harmonic * amplitude * 0.26 * envelope - amplitude * intensity * 0.14;
        }

        return { x, y };
      });
    };

    const strokeSmooth = (points, gradient, lineWidth, alpha, glow) => {
      if (points.length < 2) return;
      ctx.save();
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = glow;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = alpha;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let index = 1; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;
        ctx.quadraticCurveTo(current.x, current.y, midX, midY);
      }

      const penultimate = points[points.length - 2];
      const last = points[points.length - 1];
      ctx.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y);
      ctx.stroke();
      ctx.restore();
    };

    const strokeSpikes = (levels, baseY, amplitude, gradient, lineWidth, alpha, glow, directionMode = "alternate") => {
      if (!levels.length) return;
      const spikeCount = levels.length;
      const step = (width - insetX * 2) / spikeCount;

      ctx.save();
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = glow;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = alpha;
      ctx.lineCap = "round";
      ctx.lineJoin = "miter";
      ctx.beginPath();
      ctx.moveTo(insetX, baseY);

      for (let index = 0; index < spikeCount; index += 1) {
        const startX = insetX + step * index;
        const peakX = startX + step * 0.58;
        const endX = startX + step;
        const t = spikeCount > 1 ? index / (spikeCount - 1) : 0;
        const level = (levels[index] ?? 0) * edgeEnvelope(t);

        let direction = -1;
        if (directionMode === "down") direction = 1;
        if (directionMode === "alternate") direction = index % 2 === 0 ? -1 : 1;

        ctx.lineTo(startX + step * 0.18, baseY);
        const peakY = baseY + direction * amplitude * level;
        ctx.lineTo(peakX, peakY);
        ctx.lineTo(endX, baseY);
      }

      ctx.stroke();
      ctx.restore();
    };

    const rawTraceDefs = [
      {
        levels: traces[0] ?? [],
        baseY: height * 0.78,
        amplitude: height * 0.24,
        colorA: palette.accent,
        colorB: palette.highlight,
        alpha: 0.72,
        width: 1.22 * dpr,
        glow: 8 * dpr,
        shape: "spike",
        mode: "up",
      },
      {
        levels: traces[1] ?? [],
        baseY: height * 0.64,
        amplitude: height * 0.16,
        colorA: palette.accentSoft,
        colorB: palette.highlight,
        alpha: 0.52,
        width: 1.04 * dpr,
        glow: 6 * dpr,
        shape: "ripple",
        mode: "ribbon",
      },
      {
        levels: traces[2] ?? [],
        baseY: height * 0.5,
        amplitude: height * 0.18,
        colorA: palette.whiteSoft,
        colorB: palette.highlight,
        alpha: 0.78,
        width: 1.26 * dpr,
        glow: 9 * dpr,
        shape: "wave",
        mode: "alternate",
      },
      {
        levels: traces[3] ?? [],
        baseY: height * 0.38,
        amplitude: height * 0.17,
        colorA: palette.accentSoft,
        colorB: palette.accent,
        alpha: 0.68,
        width: 1.08 * dpr,
        glow: 8 * dpr,
        shape: "spike",
        mode: "down",
      },
      {
        levels: traces[4] ?? [],
        baseY: height * 0.26,
        amplitude: height * 0.12,
        colorA: palette.highlight,
        colorB: palette.accentSoft,
        alpha: 0.5,
        width: 0.9 * dpr,
        glow: 5 * dpr,
        shape: "wave",
        mode: "shimmer",
      },
    ];

    const traceDefs = rawTraceDefs
      .map((trace) => {
        const energy = trace.levels.length
          ? trace.levels.reduce((total, value) => total + value, 0) / trace.levels.length
          : 0;
        const dominance = 0.7 + Math.pow(energy, 0.84) * 1.55;

        return {
          ...trace,
          energy,
          amplitude: trace.amplitude * dominance,
          alpha: Math.min(1, trace.alpha + energy * 0.34),
          width: trace.width + energy * 0.5 * dpr,
          glow: trace.glow + energy * 5.6 * dpr,
        };
      })
      .sort((left, right) => left.energy - right.energy);

    traceDefs.forEach((trace) => {
      if (!trace.levels.length) return;

      const gradient = ctx.createLinearGradient(insetX, 0, width - insetX, 0);
      gradient.addColorStop(0, trace.colorA);
      gradient.addColorStop(0.5, trace.colorB);
      gradient.addColorStop(1, trace.colorA);

      if (trace.shape === "spike") {
        strokeSpikes(trace.levels, trace.baseY, trace.amplitude, gradient, trace.width, trace.alpha, trace.glow, trace.mode);
        return;
      }

      const points = buildPoints(trace.levels, trace.baseY, trace.amplitude, trace.mode, trace.energy);

      if (trace.shape === "ripple") {
        const ripplePoints = points.map((point, index) => ({
          x: point.x,
          y: point.y + (index % 2 === 0 ? -1 : 1) * trace.amplitude * 0.1,
        }));
        strokeSmooth(ripplePoints, gradient, trace.width, trace.alpha, trace.glow);
        return;
      }

      strokeSmooth(points, gradient, trace.width, trace.alpha, trace.glow);
    });

    ctx.globalAlpha = 1;
  };

  const setOpen = (open) => {
    state.open = open;
    dock.classList.toggle("is-open", open);
    dock.setAttribute("aria-hidden", open ? "false" : "true");
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) stopVisualizer();
  };

  const drawIdleVisualizer = () => {
    if (!viz.ctx) return;

    const palette = getVisualizerPalette();
    syncVisualizerCanvasSize();
    drawVisualizerLines(
      [
        Array.from({ length: viz.barCount }, (_, index) => 0.28 + Math.sin(index * 0.58) * 0.24),
        Array.from({ length: viz.barCount }, (_, index) => 0.38 + Math.cos(index * 0.84) * 0.28),
        Array.from({ length: viz.barCount }, (_, index) => 0.42 + Math.sin(index * 1.04 + 0.6) * 0.3),
        Array.from({ length: viz.barCount }, (_, index) => 0.3 + Math.cos(index * 1.18 + 0.35) * 0.2),
        Array.from({ length: viz.barCount }, (_, index) => 0.22 + Math.sin(index * 1.42 + 1.1) * 0.16),
      ],
      palette
    );
  };

  const ensureVisualizer = () => {
    if (!viz.supported || !viz.ctx) return false;
    if (viz.audioContext && viz.analyser && viz.source && viz.data) return true;

    const ContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!ContextCtor) return false;

    try {
      viz.audioContext = viz.audioContext || new ContextCtor();
      viz.source = viz.source || viz.audioContext.createMediaElementSource(dockAudio);
      viz.analyser = viz.analyser || viz.audioContext.createAnalyser();
      viz.analyser.fftSize = 128;
      viz.analyser.smoothingTimeConstant = 0.44;
      viz.data = viz.data || new Uint8Array(viz.analyser.frequencyBinCount);

      viz.source.connect(viz.analyser);
      viz.analyser.connect(viz.audioContext.destination);
      return true;
    } catch (error) {
      viz.supported = false;
      return false;
    }
  };

  const renderVisualizerFrame = () => {
    if (!viz.ctx) return;

    const palette = getVisualizerPalette();
    syncVisualizerCanvasSize();

    if (!viz.analyser || !viz.data) {
      drawIdleVisualizer();
      return;
    }

    viz.analyser.getByteFrequencyData(viz.data);
    const bandConfigs = [
      { start: 0.01, end: 0.15, gain: 2.85, floor: 0.07, traceIndex: 0, smoothing: 0.48 },
      { start: 0.08, end: 0.28, gain: 2.45, floor: 0.06, traceIndex: 1, smoothing: 0.46 },
      { start: 0.22, end: 0.54, gain: 2.55, floor: 0.055, traceIndex: 2, smoothing: 0.34 },
      { start: 0.48, end: 0.78, gain: 2.65, floor: 0.05, traceIndex: 3, smoothing: 0.4 },
      { start: 0.72, end: 0.98, gain: 2.25, floor: 0.045, traceIndex: 4, smoothing: 0.46 },
    ];

    const traces = bandConfigs.map((config) => {
      const startBin = Math.floor(viz.data.length * config.start);
      const endBin = Math.max(startBin + 1, Math.floor(viz.data.length * config.end));
      const span = Math.max(1, endBin - startBin);
      const segmentWidth = span / viz.barCount;
      const previousTrace = viz.traces[config.traceIndex] ?? [];
      const levels = [];

      for (let index = 0; index < viz.barCount; index += 1) {
        const segmentStart = startBin + Math.floor(segmentWidth * index);
        const segmentEnd = Math.max(segmentStart + 1, startBin + Math.floor(segmentWidth * (index + 1)));
        let sum = 0;

        for (let cursor = segmentStart; cursor < Math.min(segmentEnd, viz.data.length); cursor += 1) {
          sum += viz.data[cursor];
        }

        const average = sum / Math.max(1, Math.min(segmentEnd, viz.data.length) - segmentStart);
        const normalized = Math.min(1, Math.pow(average / 255, 0.68) * config.gain);
        const previous = previousTrace[index] ?? config.floor;
        const smoothed = previous * config.smoothing + Math.max(config.floor, normalized) * (1 - config.smoothing);
        levels.push(smoothed);
      }

      viz.traces[config.traceIndex] = levels;
      return levels;
    });

    drawVisualizerLines(traces, palette);
  };

  const tickVisualizer = (timestamp = 0) => {
    if (!viz.active) return;
    if (timestamp - viz.lastPaint >= viz.fpsInterval) {
      viz.lastPaint = timestamp;
      renderVisualizerFrame();
    }
    viz.rafId = window.requestAnimationFrame(tickVisualizer);
  };

  const startVisualizer = async () => {
    if (!state.open || !viz.supported || !ensureVisualizer()) return;

    if (viz.audioContext?.state === "suspended") {
      try {
        await viz.audioContext.resume();
      } catch (error) {
        return;
      }
    }

    if (viz.active) return;
    viz.active = true;
    viz.lastPaint = 0;
    syncVisualizerCanvasSize();
    tickVisualizer();
  };

  const stopVisualizer = () => {
    viz.active = false;
    if (viz.rafId) {
      window.cancelAnimationFrame(viz.rafId);
      viz.rafId = 0;
    }
    drawIdleVisualizer();
  };

  const syncPlaybackState = () => {
    const isPlaying = Boolean(dockAudio.currentSrc) && !dockAudio.paused && !dockAudio.ended;
    dock.classList.toggle("music-dock--playing", isPlaying);
    dockPlayIcon.setAttribute("name", isPlaying ? "pause-outline" : "play-outline");
    dockPlay.setAttribute("aria-label", isPlaying ? "Pause current track" : "Play current track");
    dockPlay.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    dock.classList.toggle("music-dock--muted", dockAudio.volume <= 0.001);
    if (isPlaying && state.open) {
      startVisualizer();
    } else {
      stopVisualizer();
    }
  };

  const syncControlAvailability = () => {
    const disabled = !state.tracks.length;
    dockClose.disabled = disabled && !state.open;
    dockPrev.disabled = disabled;
    dockNext.disabled = disabled;
    dockPlay.disabled = disabled;
    dockVolUp.disabled = disabled;
    dockVolDown.disabled = disabled;
    dockSeek.disabled = disabled || !(Number.isFinite(dockAudio.duration) && dockAudio.duration > 0);
  };

  const syncVolumeState = () => {
    const volume = Math.round((dockAudio.volume ?? 1) * 100);
    dockVolUp.setAttribute("aria-label", `Increase volume, current ${volume}%`);
    dockVolDown.setAttribute("aria-label", `Decrease volume, current ${volume}%`);
    dockVolUp.setAttribute("title", `Volume ${volume}%`);
    dockVolDown.setAttribute("title", `Volume ${volume}%`);
  };

  const syncTrack = ({ autoPlay = false } = {}) => {
    const track = state.tracks[state.index] ?? null;
    const hasTracks = Boolean(track);
    const hasSource = Boolean(track?.src);
    const coverSrc = track?.logo || state.defaultLogo;

    dock.classList.toggle("music-dock--empty", !hasTracks);
    dockEmpty.hidden = hasTracks;
    dockEmpty.textContent = musicCfg?.emptyState ?? "No tracks loaded yet. Add music in assets/data/music.json.";

    dockTrack.textContent = hasTracks ? track.title : "No track loaded";
    dockArtist.textContent = hasTracks
      ? track.artist
      : (musicCfg?.emptyState ?? "Add title, artist, src, and logo to music.json.");

    if (coverSrc) {
      dockCover.src = coverSrc;
      dockCover.alt = hasTracks ? `${track.title} cover art` : "Music cover art";
      dockCover.hidden = false;
      dockCover.parentElement?.classList.remove("is-placeholder");
    } else {
      dockCover.removeAttribute("src");
      dockCover.alt = "";
      dockCover.hidden = true;
      dockCover.parentElement?.classList.add("is-placeholder");
    }

    if (hasSource) {
      if (dockAudio.dataset.src !== track.src) {
        dockAudio.src = track.src;
        dockAudio.dataset.src = track.src;
        dockAudio.load();
      }
    } else {
      dockAudio.pause();
      dockAudio.removeAttribute("src");
      dockAudio.dataset.src = "";
      dockAudio.load();
    }

    syncControlAvailability();
    syncPlaybackState();
    syncVolumeState();
    syncTimelineState(0);

    if (hasSource && autoPlay) {
      dockAudio.play().catch(() => {});
    }
  };

  const changeTrack = (nextIndex, forcePlay = false) => {
    if (!state.tracks.length) return;
    const count = state.tracks.length;
    state.index = (nextIndex + count) % count;
    syncTrack({ autoPlay: forcePlay });
  };

  const togglePlayback = () => {
    if (!state.tracks.length) return;
    if (!dockAudio.currentSrc) {
      syncTrack({ autoPlay: true });
      return;
    }

    if (dockAudio.paused) {
      dockAudio.play().catch(() => {});
    } else {
      dockAudio.pause();
    }
  };

  const adjustVolume = (delta) => {
    if (!state.tracks.length) return;
    const currentVolume = Number.isFinite(dockAudio.volume) ? dockAudio.volume : 1;
    const nextVolume = Math.max(0, Math.min(1, currentVolume + delta));
    dockAudio.volume = Math.round(nextVolume * 100) / 100;
    syncPlaybackState();
    syncVolumeState();
  };

  launcher.addEventListener("click", () => {
    setOpen(!state.open);
    if (state.open) syncTrack();
  });

  dockPrev.addEventListener("click", () => changeTrack(state.index - 1, true));
  dockNext.addEventListener("click", () => changeTrack(state.index + 1, true));
  dockPlay.addEventListener("click", () => {
    if (!state.open) setOpen(true);
    togglePlayback();
  });
  dockVolUp.addEventListener("click", () => adjustVolume(state.volumeStep));
  dockVolDown.addEventListener("click", () => adjustVolume(-state.volumeStep));
  dockSeek.addEventListener("pointerdown", () => {
    state.isSeeking = true;
  });
  dockSeek.addEventListener("pointerup", () => {
    state.isSeeking = false;
    syncTimelineState();
  });
  dockSeek.addEventListener("change", () => {
    state.isSeeking = false;
    syncTimelineState();
  });
  dockSeek.addEventListener("blur", () => {
    state.isSeeking = false;
    syncTimelineState();
  });
  dockSeek.addEventListener("input", () => {
    const duration = Number.isFinite(dockAudio.duration) ? dockAudio.duration : 0;
    if (duration <= 0) {
      syncTimelineState(0);
      return;
    }

    const progress = Number(dockSeek.value) / 1000;
    const nextTime = duration * progress;
    dockAudio.currentTime = nextTime;
    syncTimelineState(nextTime);
  });
  dockHide.addEventListener("click", () => setOpen(false));
  dockClose.addEventListener("click", () => {
    dockAudio.pause();
    setOpen(false);
  });

  dockAudio.addEventListener("ended", () => {
    if (!state.tracks.length) return;
    changeTrack(state.index + 1, true);
  });

  dockAudio.addEventListener("play", () => {
    syncPlaybackState();
    syncTimelineState();
  });

  dockAudio.addEventListener("pause", () => {
    syncPlaybackState();
    syncTimelineState();
  });

  dockAudio.addEventListener("emptied", () => {
    syncPlaybackState();
    syncVolumeState();
    syncTimelineState(0);
  });

  dockAudio.addEventListener("volumechange", () => {
    syncPlaybackState();
    syncVolumeState();
  });
  dockAudio.addEventListener("loadedmetadata", () => {
    syncControlAvailability();
    syncTimelineState();
  });
  dockAudio.addEventListener("durationchange", () => {
    syncControlAvailability();
    syncTimelineState();
  });
  dockAudio.addEventListener("timeupdate", () => {
    if (state.isSeeking) return;
    syncTimelineState();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.open) setOpen(false);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopVisualizer();
      return;
    }

    const isPlaying = Boolean(dockAudio.currentSrc) && !dockAudio.paused && !dockAudio.ended;
    if (state.open && isPlaying) {
      startVisualizer();
    }
  });

  window.addEventListener("resize", syncVisualizerCanvasSize);

  dockAudio.volume = 0.68;
  drawIdleVisualizer();
  setOpen(false);
  syncTrack();
  syncTimelineState(0);
}

function extractGithubUsername(raw) {
  const match = String(raw ?? "").match(/github\.com\/([A-Za-z0-9-]+)/i);
  return match ? match[1] : "";
}

function resolveGithubUsername(profile, siteData) {
  const preferred = String(
    siteData?.github?.username ??
    siteData?.external?.githubUsername ??
    ""
  )
    .trim()
    .replace(/^@+/, "");

  if (preferred) return preferred;

  const socials = profile?.social ?? profile?.socials ?? [];
  for (const social of socials) {
    const username = extractGithubUsername(social?.href);
    if (username) return username;
  }

  return "";
}

function getSidebarQuestCopy(siteData) {
  const cfg = siteData?.sidebarQuest ?? {};
  return {
    kicker: String(cfg.kicker ?? "Commit Reactor"),
    levelPrefix: String(cfg.levelPrefix ?? "Lv."),
    subtitleSuffix: String(cfg.subtitleSuffix ?? "core branch"),
    xpUnit: String(cfg.xpUnit ?? "XP"),
    xpToNextSuffix: String(cfg.xpToNextSuffix ?? "to next level"),
    reposLabel: String(cfg.reposLabel ?? "Repos"),
    starsLabel: String(cfg.starsLabel ?? "Stars"),
    followersLabel: String(cfg.followersLabel ?? "Followers"),
    reposBarLabel: String(cfg.reposBarLabel ?? "Repo Forge"),
    starsBarLabel: String(cfg.starsBarLabel ?? "Star Power"),
    comboBarLabel: String(cfg.comboBarLabel ?? "Push Combo"),
    loadingText: String(cfg.loadingText ?? "Calibrating mission feed..."),
    fallbackText: String(cfg.fallbackText ?? "Live relay is cooling down. Open the mission log directly."),
    linkLabel: String(cfg.linkLabel ?? "Inspect Mission Log"),
  };
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatCompactNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function getCachedGithubQuestStats(username) {
  try {
    const raw = localStorage.getItem(`github-quest-cache:${username}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.data) return null;

    const ttlMs = 30 * 60 * 1000;
    if ((Date.now() - Number(parsed.timestamp)) > ttlMs) return null;
    return parsed.data;
  } catch (_) {
    return null;
  }
}

function setCachedGithubQuestStats(username, data) {
  try {
    localStorage.setItem(
      `github-quest-cache:${username}`,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch (_) {
    // storage may be unavailable in private mode; ignore safely
  }
}

async function fetchGithubQuestStats(username) {
  const cached = getCachedGithubQuestStats(username);
  if (cached) return cached;

  const headers = { Accept: "application/vnd.github+json" };
  const encoded = encodeURIComponent(username);

  const [userRes, reposRes, eventsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${encoded}`, { headers, cache: "no-store" }),
    fetch(`https://api.github.com/users/${encoded}/repos?per_page=100&sort=updated`, { headers, cache: "no-store" }),
    fetch(`https://api.github.com/users/${encoded}/events/public?per_page=100`, { headers, cache: "no-store" }),
  ]);

  if (!userRes.ok) {
    throw new Error(`GitHub user request failed (${userRes.status})`);
  }

  const user = await userRes.json();
  const repos = reposRes.ok ? await reposRes.json() : [];
  const events = eventsRes.ok ? await eventsRes.json() : [];

  const totalStars = repos.reduce((sum, repo) => sum + Number(repo?.stargazers_count ?? 0), 0);
  const languageCounts = repos.reduce((acc, repo) => {
    const language = String(repo?.language ?? "").trim();
    if (!language) return acc;
    acc[language] = (acc[language] ?? 0) + 1;
    return acc;
  }, {});
  const topLanguage = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Mixed Stack";

  const pushEvents = events.filter((event) => event?.type === "PushEvent").length;
  const prEvents = events.filter((event) => event?.type === "PullRequestEvent").length;

  const score = Math.max(
    1,
    Math.round(
      Number(user?.public_repos ?? 0) * 18 +
      totalStars * 11 +
      Number(user?.followers ?? 0) * 14 +
      Number(user?.public_gists ?? 0) * 8 +
      pushEvents * 16 +
      prEvents * 20
    )
  );

  const levelScale = 40;
  const level = Math.max(1, Math.floor(Math.sqrt(score / levelScale)));
  const floorXP = level * level * levelScale;
  const ceilingXP = (level + 1) * (level + 1) * levelScale;
  const levelProgress = clampNumber(((score - floorXP) / Math.max(1, (ceilingXP - floorXP))) * 100, 0, 100);

  const data = {
    username: String(user?.login ?? username),
    profileUrl: String(user?.html_url ?? `https://github.com/${username}`),
    repoCount: Number(user?.public_repos ?? 0),
    followerCount: Number(user?.followers ?? 0),
    starCount: totalStars,
    pushCombo: pushEvents,
    topLanguage,
    score,
    level,
    levelProgress,
    xpToNext: Math.max(0, ceilingXP - score),
    bars: {
      repos: clampNumber((Number(user?.public_repos ?? 0) / 45) * 100, 0, 100),
      stars: clampNumber((totalStars / 80) * 100, 0, 100),
      combo: clampNumber((pushEvents / 24) * 100, 0, 100),
    },
  };

  setCachedGithubQuestStats(username, data);
  return data;
}

function renderSidebarQuestMarkup(stats, copy) {
  return `
    <article class="gh-quest-card">
      <p class="gh-quest-kicker">${escapeHtml(copy.kicker)}</p>
      <h3 class="gh-quest-title">${escapeHtml(copy.levelPrefix)}${stats.level} ${escapeHtml(stats.username)}</h3>
      <p class="gh-quest-subtitle">${escapeHtml(stats.topLanguage)} ${escapeHtml(copy.subtitleSuffix)}</p>

      <div class="gh-quest-meter" role="progressbar" aria-label="Level progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(stats.levelProgress)}">
        <span style="width:${stats.levelProgress.toFixed(2)}%"></span>
      </div>
      <p class="gh-quest-xp">${formatCompactNumber(stats.score)} ${escapeHtml(copy.xpUnit)} <span>${formatCompactNumber(stats.xpToNext)} ${escapeHtml(copy.xpToNextSuffix)}</span></p>

      <ul class="gh-quest-stat-grid">
        <li><strong>${formatCompactNumber(stats.repoCount)}</strong><span>${escapeHtml(copy.reposLabel)}</span></li>
        <li><strong>${formatCompactNumber(stats.starCount)}</strong><span>${escapeHtml(copy.starsLabel)}</span></li>
        <li><strong>${formatCompactNumber(stats.followerCount)}</strong><span>${escapeHtml(copy.followersLabel)}</span></li>
      </ul>

      <div class="gh-quest-bars">
        <div class="gh-quest-bar">
          <span>${escapeHtml(copy.reposBarLabel)}</span>
          <i style="--fill:${stats.bars.repos.toFixed(2)}%"></i>
        </div>
        <div class="gh-quest-bar">
          <span>${escapeHtml(copy.starsBarLabel)}</span>
          <i style="--fill:${stats.bars.stars.toFixed(2)}%"></i>
        </div>
        <div class="gh-quest-bar">
          <span>${escapeHtml(copy.comboBarLabel)} (${formatCompactNumber(stats.pushCombo)})</span>
          <i style="--fill:${stats.bars.combo.toFixed(2)}%"></i>
        </div>
      </div>

      <a class="gh-quest-link" href="${stats.profileUrl}" target="_blank" rel="noreferrer">${escapeHtml(copy.linkLabel)}</a>
    </article>
  `;
}

async function renderSidebarQuest(profile, siteData) {
  const wrap = el("sidebar-quest");
  if (!wrap) return;

  const copy = getSidebarQuestCopy(siteData);
  const username = resolveGithubUsername(profile, siteData);
  if (!username) {
    wrap.innerHTML = "";
    wrap.hidden = true;
    return;
  }

  wrap.hidden = false;
  wrap.innerHTML = `
    <article class="gh-quest-card is-loading">
      <p class="gh-quest-kicker">${escapeHtml(copy.kicker)}</p>
      <h3 class="gh-quest-title">Loading ${escapeHtml(username)}...</h3>
      <div class="gh-quest-meter"><span style="width:36%"></span></div>
      <p class="gh-quest-xp">${escapeHtml(copy.loadingText)}</p>
    </article>
  `;

  try {
    const stats = await fetchGithubQuestStats(username);
    wrap.innerHTML = renderSidebarQuestMarkup(stats, copy);
  } catch (err) {
    wrap.innerHTML = `
      <article class="gh-quest-card is-fallback">
        <p class="gh-quest-kicker">${escapeHtml(copy.kicker)}</p>
        <h3 class="gh-quest-title">${escapeHtml(username)}</h3>
        <p class="gh-quest-xp">${escapeHtml(copy.fallbackText)}</p>
        <a class="gh-quest-link" href="https://github.com/${encodeURIComponent(username)}" target="_blank" rel="noreferrer">${escapeHtml(copy.linkLabel)}</a>
      </article>
    `;
    console.warn("[app] sidebar quest unavailable:", err);
  }

  wireLinkTilt(wrap);
}

// -----------------------------
// ABOUT + SERVICES
// -----------------------------
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAboutParagraph(value) {
  const safe = escapeHtml(value);
  return safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderAbout(about) {
  safeText(el("about-title"), about?.title ?? "About");

  const wrap = el("about-text");
  if (!wrap) return;

  wrap.innerHTML = "";
  const merged = (about?.paragraphs ?? [])
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(" ");

  if (!merged) return;

  const para = document.createElement("p");
  para.innerHTML = formatAboutParagraph(merged);
  wrap.appendChild(para);
}

const svgSourceCache = new Map();

function pickThemeStopColor(offsetRaw) {
  const value = parseFloat(String(offsetRaw ?? "0").replace("%", ""));
  const normalized = String(offsetRaw ?? "").includes("%") ? value / 100 : value;
  const stop = Number.isFinite(normalized) ? normalized : 0;

  if (stop <= 0.34) return "var(--accent-1)";
  if (stop <= 0.67) return "var(--accent-2)";
  return "var(--accent-3)";
}

function isSpecialPaintValue(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return (
    !v ||
    v === "none" ||
    v.startsWith("url(") ||
    v.startsWith("var(") ||
    v === "currentcolor" ||
    v === "context-fill" ||
    v === "context-stroke"
  );
}

function applyThemeToInlineSvg(svg) {
  svg.querySelectorAll("linearGradient stop, radialGradient stop").forEach((stop) => {
    stop.setAttribute("stop-color", pickThemeStopColor(stop.getAttribute("offset")));
  });

  svg.querySelectorAll("[fill]").forEach((node) => {
    const fill = node.getAttribute("fill");
    if (isSpecialPaintValue(fill)) return;

    const value = String(fill).trim().toLowerCase();
    if (value === "black" || value === "#000" || value === "#000000") return;
    node.setAttribute("fill", "var(--accent-2)");
  });

  svg.querySelectorAll("[stroke]").forEach((node) => {
    const stroke = node.getAttribute("stroke");
    if (isSpecialPaintValue(stroke)) return;

    const value = String(stroke).trim().toLowerCase();
    if (value === "black" || value === "#000" || value === "#000000") return;
    node.setAttribute("stroke", "var(--text-2)");
  });
}

async function getSvgSource(src) {
  const key = String(src ?? "");
  if (svgSourceCache.has(key)) return svgSourceCache.get(key);

  const pending = fetch(key, { cache: "force-cache" }).then((res) => {
    if (!res.ok) throw new Error(`Failed to fetch SVG (${res.status})`);
    return res.text();
  });

  svgSourceCache.set(key, pending);
  return pending;
}

async function inlineThemeSvgImage(img) {
  const src = img.getAttribute("src") ?? img.currentSrc ?? "";
  if (!/\.svg(\?|#|$)/i.test(src)) return;

  try {
    const text = await getSvgSource(src);
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return;

    const cls = img.getAttribute("class");
    if (cls) svg.setAttribute("class", cls);
    svg.classList.add("theme-svg-icon");

    if (img.id) svg.id = img.id;
    if (img.getAttribute("width")) svg.setAttribute("width", img.getAttribute("width"));
    if (img.getAttribute("height")) svg.setAttribute("height", img.getAttribute("height"));

    const alt = String(img.getAttribute("alt") ?? "").trim();
    if (alt) {
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", alt);
    } else {
      svg.setAttribute("aria-hidden", "true");
    }

    applyThemeToInlineSvg(svg);
    img.replaceWith(svg);
  } catch (err) {
    console.warn("[app] svg theme inline failed:", src, err);
  }
}

async function inlineThemeableSvgs(root = document) {
  const images = Array.from(
    root.querySelectorAll('img[src$=".svg"], img[src*=".svg?"], img[src*=".svg#"]')
  );
  await Promise.all(images.map((img) => inlineThemeSvgImage(img)));
}

function renderServices(services) {
  safeText(el("services-title"), services?.title ?? "What I’m doing");

  const list = el("services-list");
  if (!list) return;
  list.innerHTML = "";

  (services?.items ?? []).forEach((it) => {
    const li = document.createElement("li");
    li.className = "service-item";

    const iconBox = document.createElement("div");
    iconBox.className = "service-icon-box";

    if (it.icon) {
      const img = document.createElement("img");
      img.src = it.icon;
      img.alt = it.title ?? "icon";
      img.width = it.iconWidth ?? 55;
      iconBox.appendChild(img);
    }

    const content = document.createElement("div");
    content.className = "service-content-box";

    const h = document.createElement("h4");
    h.className = "h4 service-item-title";
    h.textContent = it.title ?? "";

    const p = document.createElement("p");
    p.className = "service-item-text";
    p.textContent = it.text ?? "";

    content.appendChild(h);
    content.appendChild(p);

    li.appendChild(iconBox);
    li.appendChild(content);

    list.appendChild(li);
  });
}

// -----------------------------
// REFERENCES (simple cards; modal optional)
// -----------------------------
function wireReferenceModal() {
  const container = document.querySelector("[data-modal-container]");
  const overlay = document.querySelector("[data-overlay]");
  const closeBtn = document.querySelector("[data-modal-close-btn]");
  if (!container || !overlay || !closeBtn) return;

  function close() {
    container.classList.remove("active");
    overlay.classList.remove("active");
  }

  overlay.addEventListener("click", close);
  closeBtn.addEventListener("click", close);

    return {
      open(ref) {
        const avatar = el("ref-modal-avatar");
        const name = el("ref-modal-name");
        const body = el("ref-modal-body");

        if (avatar && ref.avatar) avatar.src = ref.avatar;
        safeText(name, ref?.modal?.title ?? ref?.name);

        if (body) {
          body.innerHTML = "";

          if (Array.isArray(ref?.modal?.lines) && ref.modal.lines.length) {
            ref.modal.lines.forEach((line) => {
              const p = document.createElement("p");
              p.textContent = line;
              body.appendChild(p);
            });
          } else if (ref.role) {
            const p = document.createElement("p");
            p.textContent = ref.role;
            body.appendChild(p);
            (ref.contacts ?? []).forEach((c) => {
              const row = document.createElement("p");
              row.textContent = c.value ?? "";
              body.appendChild(row);
            });
          }
        }

      overlay.classList.add("active");
      container.classList.add("active");
    }
  };
}

function renderReferences(refs) {
  safeText(el("references-title"), refs?.title ?? "References");

  const list = el("references-list");
  if (!list) return;
  list.innerHTML = "";

  const modal = wireReferenceModal();

  (refs?.items ?? []).forEach((r) => {
    const li = document.createElement("li");
    li.className = "testimonials-item";

    const card = document.createElement("div");
    card.className = "content-card";

    const fig = document.createElement("figure");
    fig.className = "testimonials-avatar-box";

    const img = document.createElement("img");
    img.src = r.avatar ?? "./assets/images/avatar-1.png";
    img.alt = r.name ?? "Reference";
    img.width = 58;
    fig.appendChild(img);

    const h = document.createElement("h4");
    h.className = "h4 testimonials-item-title";
    h.textContent = r.name ?? "";

    const text = document.createElement("div");
    text.className = "testimonials-text";
    const p = document.createElement("p");
    p.textContent = r.role ?? "";
    text.appendChild(p);

    card.appendChild(fig);
    card.appendChild(h);
    card.appendChild(text);

    if (modal) {
      card.style.cursor = "pointer";
      card.addEventListener("click", () => modal.open(r));
    }

    li.appendChild(card);
    list.appendChild(li);
  });
}

// -----------------------------
// RESUME
// -----------------------------
function renderResume(resume, projectsData = null) {
  safeText(el("resume-title"), resume?.title ?? "Resume");

  const cvLink = el("cv-link");
  if (cvLink && resume?.cvUrl) cvLink.href = resume.cvUrl;
  safeText(el("cv-label"), resume?.cvLabel ?? "Curriculum Vitae");

  safeText(el("experience-prof-title"), resume?.experienceColumns?.professional ?? "Professional Experience");
  safeText(el("experience-project-title"), resume?.experienceColumns?.projects ?? "Project Experience");

  function buildTimelineItem(item, options = {}) {
    const title = String(item?.title ?? "").trim();
    const dateText = String(item?.range ?? item?.date ?? "").trim();
    const bodyText = String(item?.text ?? "").trim();
    const metaText = String(item?.meta ?? item?.stack ?? "").trim();
    const website = String(item?.website ?? item?.url ?? "").trim();
    const logo = String(item?.logo ?? "").trim();
    const highlights = Array.isArray(item?.highlights)
      ? item.highlights.map((line) => String(line ?? "").trim()).filter(Boolean)
      : [];

    const li = document.createElement("li");
    li.className = `timeline-item ${options.education ? "timeline-item--education" : "timeline-item--experience"}${options.project ? " timeline-item--project" : ""}`;

    const head = document.createElement("div");
    head.className = "timeline-item-head";

    if (options.education) {
      const media = document.createElement("div");
      media.className = "timeline-item-media";

      if (logo) {
        const img = document.createElement("img");
        img.className = "timeline-item-logo";
        img.src = logo;
        img.alt = item?.logoAlt ?? `${title || "School"} logo`;
        img.loading = "lazy";
        media.appendChild(img);
      } else {
        const fallback = document.createElement("span");
        fallback.className = "timeline-item-logo-fallback";
        fallback.textContent = (title.match(/[A-Za-z0-9]/g) || []).slice(0, 2).join("").toUpperCase() || "ED";
        media.appendChild(fallback);
      }

      head.appendChild(media);
    }

    const body = document.createElement("div");
    body.className = "timeline-item-body";

    const h4 = document.createElement("h4");
    h4.className = "h4 timeline-item-title";
    h4.textContent = title;
    body.appendChild(h4);

    if (dateText) {
      const date = document.createElement("span");
      date.className = "timeline-date-pill";
      date.textContent = dateText;
      body.appendChild(date);
    }

    if (metaText) {
      const meta = document.createElement("p");
      meta.className = "timeline-meta";
      meta.textContent = metaText;
      body.appendChild(meta);
    }

    if (website) {
      li.classList.add("timeline-item--clickable");
      li.setAttribute("role", "link");
      li.setAttribute("tabindex", "0");
      li.setAttribute("aria-label", `Open ${title || "organization"} website`);

      const openWebsite = () => {
        window.open(website, "_blank", "noopener,noreferrer");
      };

      li.addEventListener("click", (event) => {
        if (event.target.closest("a,button,input,textarea,select,label")) return;
        openWebsite();
      });

      li.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openWebsite();
        }
      });
    }

    head.appendChild(body);
    li.appendChild(head);

    if (bodyText) {
      const text = document.createElement("p");
      text.className = "timeline-text";
      text.textContent = bodyText;
      li.appendChild(text);
    }

    if (highlights.length) {
      const list = document.createElement("ul");
      list.className = "timeline-points";
      highlights.forEach((point) => {
        const pointItem = document.createElement("li");
        pointItem.textContent = point;
        list.appendChild(pointItem);
      });
      li.appendChild(list);
    }

    return li;
  }

  function deriveProjectExperience() {
    const source = Array.isArray(projectsData?.projects)
      ? projectsData.projects
      : (Array.isArray(projectsData?.items) ? projectsData.items : []);
    if (!source.length) return [];

    const featured = source.filter((project) => {
      const tags = Array.isArray(project?.tags) ? project.tags : [];
      return tags.some((tag) => {
        const key = normalizeKey(tag);
        return key === "highlighted projects" || key === "featured";
      });
    });

    const picked = (featured.length ? featured : source).slice(0, 6);

    return picked.map((project) => {
      const capsules = Array.isArray(project?.capsules)
        ? project.capsules.map((item) => String(item ?? "").trim()).filter(Boolean)
        : [];
      const categoryKey = normalizeKey(project?.categoryLabel ?? project?.category ?? "");
      const group =
        categoryKey === "game development"
          ? "Future Games Warsaw"
          : (categoryKey === "system development" ? "Systems Projects" : "Network Projects");
      return {
        title: project?.title ?? "",
        date: String(project?.date ?? "").trim(),
        text: String(project?.description ?? "").trim(),
        website: String(project?.href ?? project?.url ?? "").trim(),
        meta: capsules.slice(0, 4).join(" / "),
        group,
      };
    });
  }

  const edu = el("education-list");
  if (edu) {
    edu.className = "timeline-list timeline-list--education";
    edu.innerHTML = "";
    (resume?.education ?? []).forEach((item) => edu.appendChild(buildTimelineItem(item, { education: true })));
  }

  const professionalItems = Array.isArray(resume?.experience) ? resume.experience : [];
  const exp = el("experience-list");
  if (exp) {
    exp.className = "timeline-list timeline-list--experience";
    exp.innerHTML = "";
    professionalItems.forEach((item) => exp.appendChild(buildTimelineItem(item)));
  }

  const explicitProjectItems = Array.isArray(resume?.projectExperience)
    ? resume.projectExperience
    : [];
  const projectItems = explicitProjectItems.length ? explicitProjectItems : deriveProjectExperience();
  const projectListWrap = el("project-experience-list");
  const projectColumn = el("experience-project-column");
  if (projectListWrap) {
    projectListWrap.innerHTML = "";

    const groups = new Map();
    projectItems.forEach((item) => {
      const key = String(item?.group ?? item?.organization ?? "Selected Projects").trim() || "Selected Projects";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    groups.forEach((items, label) => {
      const groupSection = document.createElement("section");
      groupSection.className = "experience-project-group";

      const groupTitle = document.createElement("h5");
      groupTitle.className = "experience-project-group-title";
      groupTitle.textContent = label;
      groupSection.appendChild(groupTitle);

      const list = document.createElement("ol");
      list.className = "timeline-list timeline-list--projects";
      items.forEach((item) => list.appendChild(buildTimelineItem(item, { project: true })));
      groupSection.appendChild(list);

      projectListWrap.appendChild(groupSection);
    });
  }
  if (projectColumn) {
    projectColumn.hidden = projectItems.length === 0;
  }

  const tech = el("skills-technical");
  if (tech) {
    tech.innerHTML = "";
    const groups = Array.isArray(resume?.skills?.technicalGroups)
      ? resume.skills.technicalGroups
      : [];

    if (groups.length > 0) {
      tech.className = "skills-group-grid";

      groups.forEach((group) => {
        const groupCard = document.createElement("li");
        groupCard.className = "skills-group-card";

        const title = document.createElement("h4");
        title.className = "skills-group-title";
        title.textContent = group?.title ?? "Technical";

        const items = document.createElement("ul");
        items.className = "skills-group-items";

        (group?.items ?? []).forEach((item) => {
          const chip = document.createElement("li");
          chip.className = "skills-chip";
          chip.textContent = item;
          items.appendChild(chip);
        });

        groupCard.appendChild(title);
        groupCard.appendChild(items);
        tech.appendChild(groupCard);
      });
    } else {
      tech.className = "skills-tags";
      (resume?.skills?.technical ?? []).forEach((s) => {
        const li = document.createElement("li");
        li.textContent = s;
        tech.appendChild(li);
      });
    }
  }

  const prof = el("skills-professional");
  if (prof) {
    prof.className = "skills-tags skills-prof-list";
    prof.innerHTML = "";
    (resume?.skills?.professional ?? []).forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      prof.appendChild(li);
    });
  }
}

// -----------------------------
// PORTFOLIO (filters + projects)
// -----------------------------
function parseCategories(cat) {
  if (Array.isArray(cat)) return cat.map(normalizeKey);
  return String(cat ?? "")
    .split(",")
    .map((s) => normalizeKey(s))
    .filter(Boolean);
}

function canonicalFilterKey(value) {
  const key = normalizeKey(value);
  if (key === "featured") return "highlighted projects";
  return key;
}

function presentFilterLabel(value) {
  const key = normalizeKey(value);
  if (key === "highlighted projects" || key === "featured") {
    return "Featured";
  }
  return String(value ?? "");
}

function getProjectLogoKey(project, capsules) {
  const rawParts = [
    ...(Array.isArray(capsules) ? capsules : []),
    ...(Array.isArray(project?.tags) ? project.tags : []),
    project?.categoryLabel,
    project?.category,
    project?.title,
  ].map((v) => String(v ?? "").toLowerCase());

  const full = rawParts.join(" ");

  const hasAny = (...needles) => needles.some((needle) => full.includes(needle));

  if (hasAny("unreal", "ue5")) return "unreal";
  if (hasAny("unity")) return "unity";
  if (hasAny("network development", "network", "networking", "socket", "tcp", "udp", "ran")) return "network";
  if (hasAny("system development", "backend", "api", "server", "system")) return "backend";
  if (hasAny("game development", "game", "gameplay", "platformer", "puzzle", "engine")) return "game";
  if (hasAny("python", "py")) return "python";
  if (hasAny("javascript", " js ", " js,", " js.", "node")) return "javascript";
  if (hasAny("c++", "cpp")) return "cpp";
  if (hasAny("c#", "csharp")) return "csharp";
  return "code";
}

function getProjectLogoMeta(project, capsules) {
  const rawParts = [
    ...(Array.isArray(capsules) ? capsules : []),
    ...(Array.isArray(project?.tags) ? project.tags : []),
    project?.categoryLabel,
    project?.category,
    project?.title,
  ].map((v) => String(v ?? "").toLowerCase());
  const full = rawParts.join(" ");

  if (full.includes("molten engine")) {
    return {
      src: "./assets/images/project-logos/MoltenEngineLogo.png",
      alt: "Molten Engine logo",
    };
  }

  const key = getProjectLogoKey(project, capsules);
  const labels = {
    unreal: "Unreal logo",
    unity: "Unity logo",
    cpp: "C++ logo",
    csharp: "C# logo",
    python: "Python logo",
    javascript: "JavaScript logo",
    network: "Network logo",
    backend: "Backend logo",
    game: "Game logo",
    code: "Code logo",
  };

  return {
    src: `./assets/images/project-logos/${key}.svg`,
    alt: labels[key] ?? "Project logo",
  };
}

function supportsPointerTilt() {
  const motionMode = normalizeKey(document.documentElement.dataset.motion);
  if (motionMode === "reduce") return false;

  const canMatchMedia = typeof window.matchMedia === "function";
  if (
    motionMode !== "force" &&
    canMatchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return false;
  }

  const canHover = canMatchMedia && (
    window.matchMedia("(any-hover: hover)").matches ||
    window.matchMedia("(hover: hover)").matches
  );
  const finePointer = canMatchMedia && (
    window.matchMedia("(any-pointer: fine)").matches ||
    window.matchMedia("(pointer: fine)").matches
  );

  if (canHover && finePointer) return true;

  // Fallback for school/work managed browsers that misreport hover/pointer media features.
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  const hasTouch = touchPoints > 0 || ("ontouchstart" in window);
  const likelyDesktop = window.innerWidth >= 1024;
  return !hasTouch && likelyDesktop;
}

function wireProjectCardTilt(root = document) {
  const cards = root.querySelectorAll("#projects-list .project-item > a");
  if (!cards.length) return;

  const canUsePointerTilt = supportsPointerTilt();
  const hasPointerEvents = typeof window.PointerEvent !== "undefined";
  const enterEvent = hasPointerEvents ? "pointerenter" : "mouseenter";
  const moveEvent = hasPointerEvents ? "pointermove" : "mousemove";
  const leaveEvent = hasPointerEvents ? "pointerleave" : "mouseleave";

  cards.forEach((card, idx) => {
    card.style.setProperty("--card-lean-y", idx % 2 === 0 ? "-1.1deg" : "1.1deg");
    if (card.dataset.tiltBound === "1") return;
    card.dataset.tiltBound = "1";

    if (!canUsePointerTilt) return;

    let rafId = 0;
    const state = {
      rx: 0,
      ry: 0,
      px: 0,
      py: 0,
      gx: 16,
      gy: 14,
    };

    const applyState = () => {
      rafId = 0;
      card.style.setProperty("--tilt-rotate-x", `${state.rx.toFixed(2)}deg`);
      card.style.setProperty("--tilt-rotate-y", `${state.ry.toFixed(2)}deg`);
      card.style.setProperty("--parallax-x", `${state.px.toFixed(2)}px`);
      card.style.setProperty("--parallax-y", `${state.py.toFixed(2)}px`);
      card.style.setProperty("--parallax-x-icon", `${(state.px * -0.18).toFixed(2)}px`);
      card.style.setProperty("--parallax-y-icon", `${(state.py * -0.18).toFixed(2)}px`);
      card.style.setProperty("--glare-x", `${state.gx.toFixed(2)}%`);
      card.style.setProperty("--glare-y", `${state.gy.toFixed(2)}%`);
    };

    const queueApply = () => {
      if (!rafId) rafId = requestAnimationFrame(applyState);
    };

    const updateFromPointer = (event) => {
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const relX = event.clientX - rect.left;
      const relY = event.clientY - rect.top;
      const nx = (relX / rect.width) * 2 - 1;
      const ny = (relY / rect.height) * 2 - 1;

      state.rx = Math.max(-4.8, Math.min(4.8, -ny * 4.4));
      state.ry = Math.max(-5.2, Math.min(5.2, nx * 5));
      state.px = Math.max(-8, Math.min(8, -nx * 6.5));
      state.py = Math.max(-6, Math.min(6, -ny * 4.5));
      state.gx = Math.max(4, Math.min(96, (relX / rect.width) * 100));
      state.gy = Math.max(4, Math.min(96, (relY / rect.height) * 100));
      queueApply();
    };

    const resetTilt = () => {
      state.rx = 0;
      state.ry = 0;
      state.px = 0;
      state.py = 0;
      state.gx = 16;
      state.gy = 14;
      queueApply();
    };

    card.addEventListener(enterEvent, updateFromPointer, { passive: true });
    card.addEventListener(moveEvent, updateFromPointer, { passive: true });
    card.addEventListener(leaveEvent, resetTilt, { passive: true });
    card.addEventListener("blur", resetTilt, true);
    resetTilt();
  });
}

function wireLinkTilt(root = document) {
  const links = root.querySelectorAll("a[href]:not(#projects-list .project-item > a), button.social-link");
  if (!links.length) return;

  const canUsePointerTilt = supportsPointerTilt();
  const hasPointerEvents = typeof window.PointerEvent !== "undefined";
  const enterEvent = hasPointerEvents ? "pointerenter" : "mouseenter";
  const moveEvent = hasPointerEvents ? "pointermove" : "mousemove";
  const leaveEvent = hasPointerEvents ? "pointerleave" : "mouseleave";

  links.forEach((link) => {
    if (link.dataset.linkTiltBound === "1") return;
    link.dataset.linkTiltBound = "1";
    link.classList.add("link-tilt-target");

    if (!canUsePointerTilt) return;

    let rafId = 0;
    const state = {
      rx: 0,
      ry: 0,
      tx: 0,
      ty: 0,
      gx: 50,
      gy: 50,
    };

    const applyState = () => {
      rafId = 0;
      link.style.setProperty("--link-tilt-rx", `${state.rx.toFixed(2)}deg`);
      link.style.setProperty("--link-tilt-ry", `${state.ry.toFixed(2)}deg`);
      link.style.setProperty("--link-tilt-tx", `${state.tx.toFixed(2)}px`);
      link.style.setProperty("--link-tilt-ty", `${state.ty.toFixed(2)}px`);
      link.style.setProperty("--link-glare-x", `${state.gx.toFixed(2)}%`);
      link.style.setProperty("--link-glare-y", `${state.gy.toFixed(2)}%`);
    };

    const queueApply = () => {
      if (!rafId) rafId = requestAnimationFrame(applyState);
    };

    const updateFromPointer = (event) => {
      const rect = link.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const relX = event.clientX - rect.left;
      const relY = event.clientY - rect.top;
      const nx = (relX / rect.width) * 2 - 1;
      const ny = (relY / rect.height) * 2 - 1;

      state.rx = Math.max(-2.3, Math.min(2.3, -ny * 2.2));
      state.ry = Math.max(-3, Math.min(3, nx * 2.8));
      state.tx = Math.max(-2, Math.min(2, nx * 1.6));
      state.ty = Math.max(-1.8, Math.min(1.8, ny * 1.4));
      state.gx = Math.max(6, Math.min(94, (relX / rect.width) * 100));
      state.gy = Math.max(6, Math.min(94, (relY / rect.height) * 100));
      queueApply();
    };

    const resetTilt = () => {
      state.rx = 0;
      state.ry = 0;
      state.tx = 0;
      state.ty = 0;
      state.gx = 50;
      state.gy = 50;
      link.classList.remove("link-tilt-active");
      queueApply();
    };

    link.addEventListener(enterEvent, (event) => {
      link.classList.add("link-tilt-active");
      updateFromPointer(event);
    }, { passive: true });
    link.addEventListener(moveEvent, updateFromPointer, { passive: true });
    link.addEventListener(leaveEvent, resetTilt, { passive: true });
    link.addEventListener("blur", resetTilt, true);
    resetTilt();
  });
}

function renderPortfolio(portfolio, projects) {
  safeText(el("portfolio-title"), portfolio?.title ?? "Portfolio");

  const filters = portfolio?.filters ?? ["All"];
  const defaultFilter = portfolio?.defaultFilter ?? "all";

  const filtersList = el("filters-list");
  const filtersSelectList = el("filters-select-list");
  const selectValue = el("filter-select-value");
  const projectsList = el("projects-list");

  if (filtersList) filtersList.innerHTML = "";
  if (filtersSelectList) filtersSelectList.innerHTML = "";
  if (projectsList) projectsList.innerHTML = "";

  function applyFilter(filterKey) {
    const key = canonicalFilterKey(filterKey);
    if (selectValue) selectValue.textContent = presentFilterLabel(filterKey);

    // desktop buttons active state
    document.querySelectorAll("#filters-list button[data-filter]").forEach((b) => {
      b.classList.toggle("active", canonicalFilterKey(b.dataset.filter) === key);
    });

    // project show/hide
    document.querySelectorAll("#projects-list .project-item[data-filter-item]").forEach((li) => {
      const cats = parseCategories(li.dataset.category).map(canonicalFilterKey);
      const show = key === "all" || cats.includes(key);
      li.classList.toggle("active", show);
    });
  }

  // build filter buttons (desktop)
  if (filtersList) {
    filters.forEach((f) => {
      const li = document.createElement("li");
      li.className = "filter-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.filterBtn = "";
      btn.dataset.filter = f;
      btn.textContent = presentFilterLabel(f);
      btn.addEventListener("click", () => applyFilter(f));
      li.appendChild(btn);
      filtersList.appendChild(li);
    });
  }

  // build select list (mobile)
  if (filtersSelectList) {
    filters.forEach((f) => {
      const li = document.createElement("li");
      li.className = "select-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.selectItem = "";
      btn.textContent = presentFilterLabel(f);
      btn.addEventListener("click", () => applyFilter(f));
      li.appendChild(btn);
      filtersSelectList.appendChild(li);
    });
  }

  // build projects
  if (projectsList) {
    (projects?.items ?? projects?.projects ?? []).forEach((p) => {
      const li = document.createElement("li");
      li.className = "project-item";
      if (String(p.title ?? "").toLowerCase().includes("molten engine")) {
        li.classList.add("project-item--molten");
      }
      li.dataset.filterItem = "";
      li.dataset.category = parseCategories(p.categories ?? p.category ?? p.tags ?? p.categoryLabel)
        .map((cat) => (canonicalFilterKey(cat) === "highlighted projects" ? "featured" : cat))
        .join(",");

      const rawLabel =
        p.label ??
        p.categoryLabel ??
        (Array.isArray(p.tags) ? p.tags[0] : (p.category ?? ""));
      const displayLabel = presentFilterLabel(rawLabel);
      if (displayLabel) li.dataset.categoryLabel = displayLabel;

      const rawCapsules =
        p.capsules ??
        p.pills ??
        p.badges ??
        p.tiles ??
        p.projectTiles;
      const capsuleValues = Array.isArray(rawCapsules)
        ? rawCapsules
        : (typeof rawCapsules === "string" ? rawCapsules.split(",") : []);
      const capsules = capsuleValues
        .map((capsule) => String(capsule ?? "").trim())
        .filter(Boolean);
      if (capsules.length) li.classList.add("has-capsules");
      const capsulesHtml = capsules.length
        ? `<div class="project-capsules">${capsules.map((capsule) => `<span class="project-capsule">${capsule}</span>`).join("")}</div>`
        : "";
      const logo = getProjectLogoMeta(p, capsules);
      const statusLabel = String(p.statusBadge ?? p.banner ?? p.status ?? "").trim();
      const statusHtml = statusLabel
        ? `<span class="project-status-badge">${statusLabel}</span>`
        : "";
      const imageSrc = String(p.image ?? "").trim();
      if (!imageSrc) li.classList.add("project-item--no-cover");
      const imageLabel = String(p.imageLabel ?? p.shortTitle ?? p.title ?? displayLabel ?? "Project").trim();
      const coverHtml = imageSrc
        ? `<img class="project-cover-image" src="${imageSrc}" alt="${p.alt ?? p.title ?? "project"}" loading="lazy">`
        : `
            <div class="project-img-fallback" aria-hidden="true">
              <img class="project-img-fallback-logo" src="${logo.src}" alt="" loading="lazy">
              <span class="project-img-fallback-text">${imageLabel}</span>
            </div>
          `;

      const description = String(p.description ?? p.desc ?? "").trim();
      const descriptionHtml = description
        ? `<p class="project-description">${description}</p>`
        : "";

      li.innerHTML = `
        <a href="${p.href ?? "#"}" target="_blank" rel="noreferrer">
          <figure class="project-img">
            ${statusHtml}
            <div class="project-item-icon-box">
              <img class="project-hover-logo" src="${logo.src}" alt="${logo.alt}" loading="lazy">
            </div>
            ${coverHtml}
          </figure>
          <h3 class="project-title">${p.title ?? ""}</h3>
          ${capsulesHtml}
          ${descriptionHtml}
          <p class="project-category arrow-right-inline">
            <span class="arrow-right-inline__label">${displayLabel}</span>
            <span class="arrow-right-inline__icon" aria-hidden="true"></span>
          </p>
        </a>
      `;

      projectsList.appendChild(li);
    });
  }

  // wire dropdown open/close
  const selectBtn = document.querySelector("[data-select]");
  if (selectBtn) {
    selectBtn.addEventListener("click", () => {
      selectBtn.classList.toggle("active");
      const list = selectBtn.nextElementSibling;
      if (list) list.classList.toggle("active");
    });
  }

  wireProjectCardTilt();

  // initial filter
  applyFilter(filters.find((f) => canonicalFilterKey(f) === canonicalFilterKey(defaultFilter)) ?? "All");
}

// -----------------------------
// CONTACT
// -----------------------------
function renderContact(contact) {
  safeText(el("contact-title"), contact?.title ?? "Contact");
  safeText(el("contact-form-title"), contact?.formTitle ?? "Contact Form");

  const map = el("contact-map");
  if (map && (contact?.mapEmbed || contact?.mapEmbedSrc)) {
    map.src = contact.mapEmbed ?? contact.mapEmbedSrc;
  }

  const form = el("contact-form");
  if (form && contact?.formAction) form.action = contact.formAction;

  const submit = el("contact-submit");
  if (submit && contact?.submitText) {
    const label = submit.querySelector(".form-btn-label");
    if (label) label.textContent = contact.submitText;
    else submit.textContent = contact.submitText;
  }

  // enable submit when fields filled
  const inputs = document.querySelectorAll("[data-form-input]");
  const btn = el("contact-submit");

  function update() {
    const allFilled = Array.from(inputs).every((i) => i.value.trim().length > 0);
    if (btn) btn.disabled = !allFilled;
  }

  inputs.forEach((i) => i.addEventListener("input", update));
  update();
}

function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return new Intl.NumberFormat("en-US").format(n);
}

function sanitizeCounterPart(value, fallback) {
  const clean = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || fallback;
}

function getCounterIdentity(siteData) {
  const counterCfg = siteData?.footer?.counter ?? {};
  const namespace = sanitizeCounterPart(counterCfg.namespace, "swastik-portfolio");
  const autoKey = `${window.location.hostname || "local"}${window.location.pathname || "/"}`;
  const key = sanitizeCounterPart(counterCfg.key ?? autoKey, "home");
  return { namespace, key };
}

async function fetchJsonWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      mode: "cors",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`request failed (${response.status})`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchVisitorCount(siteData) {
  const { namespace, key } = getCounterIdentity(siteData);
  const stamp = `_=${Date.now()}`;
  const candidates = [
    {
      url: `https://api.countapi.xyz/hit/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}?${stamp}`,
      read: (payload) => payload?.value,
    },
    {
      url: `https://countapi.xyz/hit/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}?${stamp}`,
      read: (payload) => payload?.value,
    },
    {
      url: `https://api.counterapi.dev/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}/up?${stamp}`,
      read: (payload) => payload?.count,
    },
  ];

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const payload = await fetchJsonWithTimeout(candidate.url);
      const value = Number(candidate.read(payload));
      if (Number.isFinite(value)) return value;
      throw new Error("counter payload missing numeric value");
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("counter providers unavailable");
}

async function renderFooter(siteData) {
  const signature = el("footer-signature");
  const tagline = el("footer-tagline");
  const badges = el("footer-badges");
  const counterLabel = el("footer-counter-label");
  const visitorCount = el("visitor-count");
  const year = el("footer-year");
  const footerCfg = siteData?.footer ?? {};

  if (signature) {
    signature.textContent = footerCfg.signature ?? "< Swastik.Toprani // Bug Buffet >";
  }
  if (tagline) {
    tagline.textContent = footerCfg.tagline ?? "I cast C++ spells, summon OpenGL dragons, and bribe bugs with coffee.";
  }
  if (counterLabel) {
    counterLabel.textContent = footerCfg.counterLabel ?? "Visitors";
  }
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  if (badges) {
    badges.innerHTML = "";
    const badgeItems = Array.isArray(footerCfg.badges)
      ? footerCfg.badges
      : ["build: green-ish", "bugs: in stealth mode", "coffee: compiling"];
    badgeItems.slice(0, 4).forEach((label) => {
      const chip = document.createElement("span");
      chip.className = "site-footer__badge";
      chip.textContent = String(label ?? "").trim();
      if (chip.textContent) badges.appendChild(chip);
    });
  }

  if (!visitorCount) return;
  visitorCount.textContent = footerCfg.counterLoadingText ?? "...";

  try {
    const count = await fetchVisitorCount(siteData);
    visitorCount.textContent = formatCount(count);
  } catch (err) {
    const { namespace, key } = getCounterIdentity(siteData);
    const pageId = `${namespace}.${key}`;
    const label = footerCfg.counterLabel ?? "Visitors";
    const badge = document.createElement("img");
    badge.alt = `${label} counter`;
    badge.src = `https://visitor-badge.laobi.icu/badge?page_id=${encodeURIComponent(pageId)}&left_text=${encodeURIComponent(" ")}&left_color=111111&right_color=025a5f`;
    badge.loading = "lazy";
    badge.style.maxWidth = "100%";
    badge.style.height = "22px";
    badge.style.borderRadius = "8px";
    badge.style.border = "1px solid rgba(255,255,255,0.14)";

    visitorCount.textContent = "";
    visitorCount.appendChild(badge);
    console.warn("[app] visitor counter providers unavailable, using badge fallback:", err);
  }
}

// -----------------------------
// INIT
// -----------------------------
async function init() {
  wireSidebarToggle();

  const [
    site,
    profile,
    about,
    services,
    references,
    resume,
    portfolio,
    projects,
    contact,
    music,
  ] = await Promise.all([
    loadJSON(DATA.site),
    loadJSON(DATA.profile),
    loadJSON(DATA.about),
    loadJSON(DATA.services),
    loadJSON(DATA.references),
    loadJSON(DATA.resume),
    loadJSON(DATA.portfolio),
    loadJSON(DATA.projects),
    loadJSON(DATA.contact),
    loadJSON(DATA.music).catch(() => ({ music: { tracks: [] } })),
  ]);

  const siteData = unwrapPayload(site, "site");
  const profileData = unwrapPayload(profile, "profile");
  const aboutData = unwrapPayload(about, "about");
  const servicesData = unwrapPayload(services, "services");
  const referencesData = unwrapPayload(references, "references");
  const resumeData = unwrapPayload(resume, "resume");
  const portfolioData = unwrapPayload(portfolio, "portfolio");
  const contactData = unwrapPayload(contact, "contact");
  const musicData = unwrapPayload(music, "music");
  const loaderConfig = getLoaderConfig(siteData);
  let imageRatio = 0;
  let imageUnits = 0;
  let fontsReady = 0;
  let fluidReady = 0;
  const syncLoaderProgress = () => {
    const totalUnits = Math.max(1, imageUnits + 2);
    const progress = ((imageRatio * imageUnits) + fontsReady + fluidReady) / totalUnits;
    setLoaderProgress(progress);
  };

  setLoaderCopy(loaderConfig);
  setLoaderStatus(loaderConfig.loadingText);
  setLoaderProgress(0.04);

  const assetWarmup = warmupVisualAssets(
    [
      siteData,
      profileData,
      aboutData,
      servicesData,
      referencesData,
      resumeData,
      portfolioData,
      projects,
      contactData,
      musicData,
    ],
    (ratio, total) => {
      imageRatio = ratio;
      imageUnits = total;
      syncLoaderProgress();
    }
  );

  const fontWarmup = (document.fonts && "ready" in document.fonts
    ? document.fonts.ready
    : Promise.resolve()
  ).then(() => {
    fontsReady = 1;
    syncLoaderProgress();
  });

  const fluidWarmup = waitForFluidReady().then(() => {
    fluidReady = 1;
    syncLoaderProgress();
  });

  if (siteData?.title) document.title = siteData.title;
  if (siteData?.theme && !document.documentElement.dataset.theme) {
    document.documentElement.dataset.theme = siteData.theme;
  }
  const motionMode = normalizeKey(siteData?.motionMode ?? "auto");
  if (motionMode === "force" || motionMode === "reduce") {
    document.documentElement.dataset.motion = motionMode;
  } else {
    delete document.documentElement.dataset.motion;
  }
  if (siteData?.favicon) {
    const fav = document.querySelector("link[rel='shortcut icon']");
    if (fav) fav.href = siteData.favicon;
  }
  if (siteData?.cvUrl) {
    const cv = el("cv-link");
    if (cv) cv.href = siteData.cvUrl;
  }

  setLoaderStatus("Hydrating interface modules...");
  renderProfile(profileData);
  renderMusicPlayer(musicData);
  renderSidebarQuest(profileData, siteData);
  renderAbout(aboutData);
  renderServices(servicesData);
  renderReferences(referencesData);
  renderResume(resumeData, projects);
  renderPortfolio(portfolioData, projects);
  renderContact(contactData);
  renderFooter(siteData).catch((err) => {
    console.warn("[app] footer render degraded:", err);
  });
  wireLinkTilt();
  setLoaderStatus("Inlining themed assets...");
  await inlineThemeableSvgs(document);
  setLoaderStatus("Calibrating motion and media...");
  await Promise.all([assetWarmup, fontWarmup, fluidWarmup]);
  setLoaderStatus(loaderConfig.readyText);
  setLoaderProgress(1);
  await nextPaint();
  await new Promise((resolve) => window.setTimeout(resolve, 220));
  hideLoader();

  console.log("[app] render ok");
}

init().catch((err) => {
  console.error("[app] init failed:", err);
  showLoaderFailure("Boot interrupted. Refresh and retry.");
});


