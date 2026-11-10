const visitCount = document.querySelector("[data-visit-count]");

if (visitCount) {
  fetch("/api/visits", { method: "POST", credentials: "omit", cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Counter unavailable");
      return response.json();
    })
    .then(({ total }) => {
      if (!Number.isSafeInteger(total) || total < 0) throw new Error("Counter unavailable");
      visitCount.textContent = total.toLocaleString();
    })
    .catch(() => { visitCount.textContent = "—"; });
}
