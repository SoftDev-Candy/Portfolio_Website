(() => {
  const body = document.body;
  const sidebar = document.querySelector(".sidebar[data-sidebar]");
  const navbar = document.querySelector(".navbar");

  if (!body || !sidebar || !navbar) return;

  const navLinks = Array.from(navbar.querySelectorAll('.navbar-link[href^="#"]'));
  const sections = navLinks
    .map((link) => {
      const href = link.getAttribute("href") || "";
      const id = href.startsWith("#") ? href.slice(1) : "";
      const section = id ? document.getElementById(id) : null;
      const item = link.closest(".navbar-item");
      if (!section) return null;
      return { id, link, section, item };
    })
    .filter(Boolean);

  if (!sections.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const simpleMobileMQ = window.matchMedia("(max-width: 1100px)");
  let lastY = window.scrollY;
  let rafId = 0;

  function setActiveSection(id) {
    let currentLabel = "";

    sections.forEach(({ id: sectionId, link }) => {
      const active = sectionId === id;
      link.classList.toggle("active", active);

      if (active) {
        link.setAttribute("aria-current", "page");
        currentLabel = link.textContent.trim();
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (currentLabel) {
      navbar.dataset.currentSection = currentLabel;
    }
  }

  function getVisibleItemCount(currentSectionId, y) {
    if (y < 60) return 1;

    const currentIndex = sections.findIndex(({ id }) => id === currentSectionId);
    if (currentIndex < 0) return 1;

    return Math.max(1, Math.min(sections.length, currentIndex + 1));
  }

  function setVisibleItems(count) {
    sections.forEach(({ item, link }, index) => {
      const visible = index < count;

      if (item) item.hidden = !visible;
      else link.hidden = !visible;

      link.tabIndex = visible ? 0 : -1;
      link.setAttribute("aria-hidden", visible ? "false" : "true");
    });
  }

  function getCurrentSectionId() {
    const marker = window.scrollY + Math.min(window.innerHeight * 0.33, 220);
    let current = sections[0].id;

    sections.forEach(({ id, section }) => {
      if (section.offsetTop <= marker) current = id;
    });

    return current;
  }

  function updateScrollUI() {
    rafId = 0;

    const y = window.scrollY;
    const currentSectionId = getCurrentSectionId();
    const visibleItemCount = getVisibleItemCount(currentSectionId, y);

    if (simpleMobileMQ.matches) {
      body.classList.remove("sidebar-collapsed");
      setActiveSection(currentSectionId);
      setVisibleItems(sections.length);
      lastY = y;
      return;
    }

    const delta = y - lastY;
    const passedIntro = y > 100;

    if (delta > 6 && passedIntro) {
      body.classList.add("sidebar-collapsed");
    } else if (delta < -6 || y < 60) {
      body.classList.remove("sidebar-collapsed");
    }

    setActiveSection(currentSectionId);
    setVisibleItems(visibleItemCount);
    lastY = y;
  }

  function onScroll() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(updateScrollUI);
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("#")) return;

      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      event.preventDefault();
      setActiveSection(id);
      setVisibleItems(Math.max(getVisibleItemCount(id, window.scrollY), sections.findIndex(({ id: sid }) => sid === id) + 1));

      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });

      if (history.replaceState) {
        history.replaceState(null, "", href);
      }
    });
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", onScroll);
  if (simpleMobileMQ.addEventListener) {
    simpleMobileMQ.addEventListener("change", onScroll);
  } else if (simpleMobileMQ.addListener) {
    simpleMobileMQ.addListener(onScroll);
  }

  updateScrollUI();
})();
