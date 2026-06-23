(() => {
  function init() {
    const dropdowns = document.querySelectorAll(".nav-item.dropdown");
    if (!dropdowns.length) return;

    function closeDropdown(item) {
      item.classList.remove("open");
      const trigger = item.querySelector(".dropdown-trigger");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    }

    function closeAll(except) {
      dropdowns.forEach((item) => {
        if (item !== except) closeDropdown(item);
      });
    }

    dropdowns.forEach((item) => {
      const trigger = item.querySelector(".dropdown-trigger");
      if (!trigger) return;

      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        const isOpen = item.classList.contains("open");
        closeAll(item);
        if (isOpen) {
          closeDropdown(item);
        } else {
          item.classList.add("open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });

    document.addEventListener("click", (e) => {
      dropdowns.forEach((item) => {
        if (!item.contains(e.target)) closeDropdown(item);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll(null);
    });
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();