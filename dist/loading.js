const loader = document.querySelector("#site-loader");
const covered = loader
  ? [...document.querySelectorAll("header,main,footer")].map((element) => ({
      element,
      inert: element.inert,
    }))
  : [];
const openedAt = performance.now();
let closing = false;
let firstOpening = true;
if (loader) {
  try {
    firstOpening = sessionStorage.getItem("miroku-opened") !== "1";
    sessionStorage.setItem("miroku-opened", "1");
  } catch {}
  loader.classList.add(firstOpening ? "is-first-load" : "is-page-load");
  document.body.classList.add("is-loading");
  covered.forEach(({ element }) => (element.inert = true));
}
const failsafe = loader ? setTimeout(finishLoading, 12000) : undefined;
export function finishLoading() {
  if (!loader || closing) return;
  closing = true;
  clearTimeout(failsafe);
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    loader.remove();
    document.body.classList.remove("is-loading");
    covered.forEach(({ element, inert }) => (element.inert = inert));
  };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    remove();
    return;
  }
  const close = () => {
    if (firstOpening) {
      const image = loader.querySelector("img");
      const scene = loader.getBoundingClientRect();
      const logo = image.getBoundingClientRect();
      loader.style.transformOrigin =
        logo.left -
        scene.left +
        logo.width * 0.25 +
        "px " +
        (logo.top - scene.top + logo.height * 0.6) +
        "px";
      loader.style.setProperty(
        "--logo-zoom-scale",
        String(
          Math.max(
            40,
            Math.max(scene.width, scene.height) / (logo.width * 0.18),
          ),
        ),
      );
    }
    loader.classList.add("is-closing");
    loader.addEventListener("transitionend", (event) => {
      if (event.target === loader && event.propertyName === "opacity") remove();
    });
    loader.addEventListener("animationend", (event) => {
      if (
        event.target === loader &&
        event.animationName === "loader-scene-fade"
      )
        remove();
    });
    setTimeout(remove, firstOpening ? 1450 : 200);
  };
  const remaining = firstOpening
    ? Math.max(0, 1500 - (performance.now() - openedAt))
    : 0;
  if (remaining) setTimeout(close, remaining);
  else close();
}
