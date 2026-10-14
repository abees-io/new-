const loader = document.querySelector("#site-loader");
const started = performance.now();
const covered = loader
  ? [...document.querySelectorAll("header,main,footer")].map((element) => ({
      element,
      inert: element.inert,
    }))
  : [];
let first = true,
  closing = false,
  removed = false;
let closeTimer, cleanupTimer, watchdog;
function removeLoader() {
  if (removed) return;
  removed = true;
  clearTimeout(closeTimer);
  clearTimeout(cleanupTimer);
  clearTimeout(watchdog);
  loader?.remove();
  document.body.classList.remove("is-loading");
  covered.forEach(({ element, inert }) => (element.inert = inert));
}
if (loader) {
  try {
    first = sessionStorage.getItem("miroku-opened") !== "1";
    sessionStorage.setItem("miroku-opened", "1");
  } catch {}
  loader.classList.add(first ? "is-first-load" : "is-page-load");
  document.body.classList.add("is-loading");
  covered.forEach(({ element }) => (element.inert = true));
  // Independent watchdog: cleanup still happens if initialization or animation fails.
  watchdog = setTimeout(removeLoader, 12000);
}
export function finishLoading() {
  if (!loader || closing || removed) return;
  closing = true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    removeLoader();
    return;
  }
  const close = () => {
    // Schedule cleanup before measuring or changing animation state.
    cleanupTimer = setTimeout(removeLoader, first ? 2500 : 200);
    try {
      if (first) {
        const image = loader.querySelector("img");
        const scene = loader.getBoundingClientRect();
        const width = image?.getBoundingClientRect().width;
        if (!Number.isFinite(width) || width <= 0) {
          removeLoader();
          return;
        }
        loader.style.setProperty(
          "--logo-zoom-scale",
          String(
            Math.max(40, Math.max(scene.width, scene.height) / (width * 0.18)),
          ),
        );
      }
      loader.classList.add("is-closing");
    } catch {
      removeLoader();
    }
  };
  const remaining = first
    ? Math.max(0, 1500 - (performance.now() - started))
    : 0;
  if (remaining) closeTimer = setTimeout(close, remaining);
  else close();
}
