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
      p.style.marginBottom = "10px";
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
      const icon = document.createElement("ion-icon");
      icon.setAttribute("name", s.icon ?? "logo-github");
      a.appendChild(icon);
      li.appendChild(a);
      socials.appendChild(li);
    });
  }
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

      const marker = document.createElement("span");
      marker.className = "timeline-item-link-mark";
      marker.setAttribute("aria-hidden", "true");

      const arrow = document.createElement("span");
      arrow.className = "timeline-item-link-arrow";
      marker.appendChild(arrow);
      li.appendChild(marker);

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
        meta: capsules.slice(0, 4).join(" • "),
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
  const links = root.querySelectorAll("a[href]:not(#projects-list .project-item > a)");
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

      const description = String(p.description ?? p.desc ?? "").trim();
      const descriptionHtml = description
        ? `<p class="project-description">${description}</p>`
        : "";

      li.innerHTML = `
        <a href="${p.href ?? "#"}" target="_blank" rel="noreferrer">
          <figure class="project-img">
            <div class="project-item-icon-box">
              <img class="project-hover-logo" src="${logo.src}" alt="${logo.alt}" loading="lazy">
            </div>
            <img src="${p.image ?? ""}" alt="${p.alt ?? p.title ?? "project"}" loading="lazy">
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

async function fetchVisitorCount(siteData) {
  const counterCfg = siteData?.footer?.counter ?? {};
  const namespace = sanitizeCounterPart(counterCfg.namespace, "swastik-portfolio");
  const autoKey = `${window.location.hostname || "local"}${window.location.pathname || "/"}`;
  const key = sanitizeCounterPart(counterCfg.key ?? autoKey, "home");
  const endpoint = `https://api.countapi.xyz/hit/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`;
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`counter request failed (${response.status})`);
  }

  const payload = await response.json();
  return payload?.value;
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
    visitorCount.textContent = footerCfg.counterUnavailableText ?? "--";
    console.warn("[app] visitor counter unavailable:", err);
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
  ]);

  const siteData = unwrapPayload(site, "site");
  const profileData = unwrapPayload(profile, "profile");
  const aboutData = unwrapPayload(about, "about");
  const servicesData = unwrapPayload(services, "services");
  const referencesData = unwrapPayload(references, "references");
  const resumeData = unwrapPayload(resume, "resume");
  const portfolioData = unwrapPayload(portfolio, "portfolio");
  const contactData = unwrapPayload(contact, "contact");

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

  renderProfile(profileData);
  renderSidebarQuest(profileData, siteData);
  renderAbout(aboutData);
  renderServices(servicesData);
  renderReferences(referencesData);
  renderResume(resumeData, projects);
  renderPortfolio(portfolioData, projects);
  renderContact(contactData);
  await renderFooter(siteData);
  wireLinkTilt();
  await inlineThemeableSvgs(document);

  console.log("[app] render ok");
}

init().catch((err) => {
  console.error("[app] init failed:", err);
});
