const themeToggle = document.querySelector("#theme-toggle");
function setTheme(theme, save = true) {
  if (save) {
    document.documentElement.classList.add("theme-changing");
    setTimeout(() => document.documentElement.classList.remove("theme-changing"), 360);
  }
  document.documentElement.dataset.theme = theme;
  if (themeToggle) {
    const light = theme === "light";
    themeToggle.setAttribute("aria-pressed", String(light));
    themeToggle.setAttribute("aria-label", `Switch to ${light ? "dark" : "light"} mode`);
    themeToggle.innerHTML = `${light ? "DARK" : "LIGHT"} MODE <span aria-hidden="true">${light ? "☾" : "◐"}</span>`;
  }
  if (save) try { localStorage.setItem("negview-theme", theme); } catch {}
}
setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark", false);
themeToggle?.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
