async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }
  
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  
  function normalizeTag(s) {
    return String(s).trim().toLowerCase();
  }
  
  function setActive(el, on) {
    el.classList.toggle("active", !!on);
  }
  
  function initNavPages() {
    const navLinks = document.querySelectorAll("[data-nav-link]");
    const pages = document.querySelectorAll("article[data-page]");
  
    navLinks.forEach((btn) => {
      btn.addEventListener("click", () => {
        const label = btn.textContent.trim().toLowerCase();
        pages.forEach((p) => setActive(p, p.dataset.page === label));
        navLinks.forEach((b) => setActive(b, b === btn));
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }
  
  function initSidebarToggle() {
    const sidebar = document.querySelector("[data-sidebar]");
    const btn = document.querySelector("[data-sidebar-btn]");
    if (!sidebar || !btn) return;
  
    btn.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }
  
  function initTestimonialsModal() {
    const modalContainer = document.querySelector("[data-modal-container]");
    const overlay = document.querySelector("[data-overlay]");
    const closeBtn = document.querySelector("[data-modal-close-btn]");
    const modalImg = document.querySelector("[data-modal-img]");
    const modalTitle = document.querySelector("[data-modal-title]");
    const modalText = document.querySelector("[data-modal-text]");
  
    if (!modalContainer || !overlay || !closeBtn || !modalImg || !modalTitle || !modalText) return;
  
    function openModal(card) {
      const avatar = card.querySelector("[data-testimonials-avatar]")?.getAttribute("src") || "";
      const title = card.querySelector("[data-testimonials-title]")?.textContent || "";
      const textNode = card.querySelector("[data-testimonials-text]");
      const html = textNode ? textNode.innerHTML : "";
  
      modalImg.src = avatar;
      modalTitle.textContent = title;
      modalText.innerHTML = html;
  
      modalContainer.classList.add("active");
      overlay.classList.add("active");
    }
  
    function closeModal() {
      modalContainer.classList.remove("active");
      overlay.classList.remove("active");
    }
  
    document.addEventListener("click", (e) => {
      const card = e.target.closest("[data-testimonials-item]");
      if (card) openModal(card);
    });
  
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", closeModal);
  }
  
  function initContactForm() {
    const form = document.querySelector("[data-form]");
    const inputs = document.querySelectorAll("[data-form-input]");
    const btn = document.querySelector("[data-form-btn]");
    if (!form || !btn || !inputs.length) return;
  
    function update() {
      const allFilled = Array.from(inputs).every((i) => i.value.trim().length > 0);
      btn.disabled = !allFilled;
    }
  
    inputs.forEach((i) => i.addEventListener("input", update));
    update();
  }
  
  function applyProjectFilter(filterLabel) {
    const selected = normalizeTag(filterLabel);
    const items = document.querySelectorAll(".project-item[data-filter-item]");
    items.forEach((li) => {
      const raw = li.dataset.category || "";
      const tags = raw.split(",").map(normalizeTag).filter(Boolean);
  
      const show =
        selected === "all" ||
        tags.includes(selected);
  
      li.classList.toggle("active", show);
    });
  }
  
  function initPortfolioFiltering(defaultFilter = "Highlighted Projects") {
    const filterButtons = document.querySelectorAll("[data-filter-btn]");
    const select = document.querySelector("[data-select]");
    const selectValue = document.querySelector("[data-selecct-value]");
    const selectItems = document.querySelectorAll("[data-select-item]");
  
    function setFilter(label) {
      // buttons
      filterButtons.forEach((b) => setActive(b, b.textContent.trim() === label));
      // dropdown label
      if (selectValue) selectValue.textContent = label;
      applyProjectFilter(label);
    }
  
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => setFilter(btn.textContent.trim()));
    });
  
    if (select) {
      select.addEventListener("click", () => select.classList.toggle("active"));
    }
    selectItems.forEach((btn) => {
      btn.addEventListener("click", () => {
        setFilter(btn.textContent.trim());
        select?.classList.remove("active");
      });
    });
  
    setFilter(defaultFilter);
  }
  
  async function renderAll() {
    const [profile, about, services, refs, resume, projects] = await Promise.all([
      loadJSON("./assets/data/profile.json"),
      loadJSON("./assets/data/about.json"),
      loadJSON("./assets/data/services.json"),
      loadJSON("./assets/data/references.json"),
      loadJSON("./assets/data/resume.json"),
      loadJSON("./assets/data/projects.json")
    ]);
  
    // Profile
    const nameEl = document.getElementById("profile-name");
    if (nameEl) {
      nameEl.textContent = profile.name;
      nameEl.title = profile.name;
    }
  
    const avatarImg = document.querySelector(".avatar-box img");
    if (avatarImg) {
      avatarImg.src = profile.avatar;
      avatarImg.alt = profile.name;
    }
  
    const rolesRoot = document.getElementById("profile-roles");
    if (rolesRoot) {
      rolesRoot.innerHTML = (profile.roles || [])
        .map((r) => `<p class="title profile-role">${escapeHtml(r)}</p>`)
        .join("");
    }
  
    const contactsRoot = document.getElementById("contacts-list");
    if (contactsRoot) {
      contactsRoot.innerHTML = (profile.contacts || []).map((c) => {
        const icon = escapeHtml(c.icon || "ellipse-outline");
        const label = escapeHtml(c.label || "");
        const text = escapeHtml(c.text || "");
        const href = c.href ? String(c.href) : "";
  
        const valueHtml = href
          ? `<a href="${escapeHtml(href)}" class="contact-link">${text}</a>`
          : `<address>${text}</address>`;
  
        return `
  <li class="contact-item">
    <div class="icon-box"><ion-icon name="${icon}"></ion-icon></div>
    <div class="contact-info">
      <p class="contact-title">${label}</p>
      ${valueHtml}
    </div>
  </li>`;
      }).join("");
    }
  
    const socialsRoot = document.getElementById("social-list");
    if (socialsRoot) {
      socialsRoot.innerHTML = (profile.socials || []).map((s) => `
  <li class="social-item">
    <a href="${escapeHtml(s.href)}" target="_blank" class="social-link">
      <ion-icon name="${escapeHtml(s.icon)}"></ion-icon>
    </a>
  </li>`).join("");
    }
  
    // About paragraphs
    const aboutRoot = document.getElementById("about-text");
    if (aboutRoot) {
      aboutRoot.innerHTML = (about.paragraphs || [])
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("");
    }
  
    // Services
    const servicesRoot = document.getElementById("services-list");
    if (servicesRoot) {
      servicesRoot.innerHTML = (services.items || []).map((it) => `
  <li class="service-item">
    <div class="service-icon-box">
      <img src="${escapeHtml(it.icon)}" alt="${escapeHtml(it.iconAlt || it.title)}" width="${Number(it.iconWidth || 55)}">
    </div>
    <div class="service-content-box">
      <h4 class="h4 service-item-title">${escapeHtml(it.title)}</h4>
      <p class="service-item-text">${escapeHtml(it.text)}</p>
    </div>
  </li>`).join("");
    }
  
    // References
    const refsRoot = document.getElementById("references-list");
    if (refsRoot) {
      refsRoot.innerHTML = (refs.items || []).map((r, idx) => `
  <li class="testimonials-item">
    <div class="content-card" data-testimonials-item>
      <figure class="testimonials-avatar-box">
        <img src="${escapeHtml(r.avatar)}" alt="${escapeHtml(r.name)}" width="60" data-testimonials-avatar>
      </figure>
  
      <h4 class="h4 testimonials-item-title" data-testimonials-title>${escapeHtml(r.name)}</h4>
  
      <div class="testimonials-text" data-testimonials-text>
        <p>${escapeHtml(r.role)}</p>
  
        <div style="display:flex; gap:8px; padding-top:5px;">
          <div class="icon-box"><ion-icon name="phone-portrait-outline"></ion-icon></div>
          <div class="contact-info" style="display:flex; align-items:center;">
            <a href="tel:${escapeHtml(r.phone)}" class="contact-link">${escapeHtml(r.phone)}</a>
          </div>
        </div>
  
        <div style="display:flex; gap:8px; padding-top:5px;">
          <div class="icon-box"><ion-icon name="mail-outline"></ion-icon></div>
          <div class="contact-info" style="display:flex; align-items:center;">
            <a href="mailto:${escapeHtml(r.email)}" class="contact-link">${escapeHtml(r.email)}</a>
          </div>
        </div>
      </div>
    </div>
  </li>`).join("");
    }
  
    // Resume
    const eduRoot = document.getElementById("education-list");
    if (eduRoot) {
      eduRoot.innerHTML = (resume.education || []).map((e) => `
  <li class="timeline-item">
    <h4 class="h4 timeline-item-title">${escapeHtml(e.school)}</h4>
    <span>${escapeHtml(e.years)}</span>
    <p class="timeline-text">${escapeHtml(e.text)}</p>
  </li>`).join("");
    }
  
    const expRoot = document.getElementById("experience-list");
    if (expRoot) {
      expRoot.innerHTML = (resume.experience || []).map((e) => `
  <li class="timeline-item">
    <h4 class="h4 timeline-item-title">${escapeHtml(e.company)}</h4>
    <span>${escapeHtml(e.years)}</span>
    <p class="timeline-text">${escapeHtml(e.text)}</p>
  </li>`).join("");
    }
  
    const skillsTech = document.getElementById("skills-technical");
    if (skillsTech) {
      skillsTech.innerHTML = (resume.skills?.technical || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
    }
  
    const skillsPro = document.getElementById("skills-professional");
    if (skillsPro) {
      skillsPro.innerHTML = (resume.skills?.professional || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
    }
  
    // Portfolio filters
    const filtersRoot = document.getElementById("filters-list");
    if (filtersRoot) {
      filtersRoot.innerHTML = (projects.filters || []).map((f) => `
  <li class="filter-item">
    <button data-filter-btn>${escapeHtml(f)}</button>
  </li>`).join("");
    }
  
    const selectListRoot = document.getElementById("filters-select-list");
    if (selectListRoot) {
      selectListRoot.innerHTML = (projects.filters || []).map((f) => `
  <li class="select-item">
    <button data-select-item>${escapeHtml(f)}</button>
  </li>`).join("");
    }
  
    // Projects list
    const projectsRoot = document.getElementById("projects-list");
    if (projectsRoot) {
      projectsRoot.innerHTML = (projects.projects || []).map((p) => {
        const tags = (p.tags || []).map(normalizeTag).join(",");
        return `
  <li class="project-item" data-filter-item data-category="${escapeHtml(tags)}">
    <a href="${escapeHtml(p.href)}" target="_blank">
      <figure class="project-img">
        <div class="project-item-icon-box">
          <ion-icon name="eye-outline"></ion-icon>
        </div>
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.alt || p.title)}" loading="lazy">
      </figure>
  
      <h3 class="project-title">${escapeHtml(p.title)}</h3>
      <p class="project-category">${escapeHtml(p.categoryLabel || "")}</p>
    </a>
  </li>`;
      }).join("");
    }
  
    // Now that DOM is rendered, init UI behaviors
    initSidebarToggle();
    initNavPages();
    initTestimonialsModal();
    initContactForm();
    initPortfolioFiltering("Highlighted Projects");
  }
  
  renderAll().catch((err) => console.error(err));
  