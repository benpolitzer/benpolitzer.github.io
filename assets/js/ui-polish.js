(() => {
  function init() {
    const images = document.querySelectorAll(".project-thumb img");
    images.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add("img-loaded");
        return;
      }
      img.addEventListener(
        "load",
        () => img.classList.add("img-loaded"),
        { once: true }
      );
      img.addEventListener(
        "error",
        () => img.classList.add("img-loaded"),
        { once: true }
      );
    });
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();