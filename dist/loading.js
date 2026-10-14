const loader = document.querySelector("#site-loader");
const covered = loader
  ? [...document.querySelectorAll("header,main,footer")].map((element) => ({
      element,
      inert: element.inert,
    }))
  : [];
let closing = false;
if (loader) {
  document.body.classList.add("is-loading");
  covered.forEach(({ element }) => (element.inert = true));
}
const failsafe = loader ? setTimeout(finishLoading, 12000) : undefined;
export function finishLoading() {
  if (!loader || closing) return;
  closing = true;
  clearTimeout(failsafe);
  loader.classList.add("is-closing");
  const remove = () => {
    loader.remove();
    document.body.classList.remove("is-loading");
    covered.forEach(({ element, inert }) => (element.inert = inert));
  };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    remove();
    return;
  }
  loader.addEventListener(
    "transitionend",
    (event) => {
      if (event.target === loader && event.propertyName === "opacity") remove();
    },
    { once: true },
  );
  setTimeout(remove, 500);
}
