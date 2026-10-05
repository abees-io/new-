const backArrow = document.querySelector(".back-arrow");
backArrow?.addEventListener("click", (event) => {
  if (
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  try {
    const previous = new URL(document.referrer);
    if (previous.origin === location.origin && history.length > 1) {
      event.preventDefault();
      history.back();
    }
  } catch {
    // A direct visit uses the link's fallback destination.
  }
});
