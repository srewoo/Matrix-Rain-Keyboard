const btn = document.getElementById("toggle");

function render(enabled) {
  btn.textContent = enabled ? "DISABLE" : "ENABLE";
  btn.classList.toggle("off", !enabled);
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Reflect the current page state when the popup opens.
(async () => {
  const tab = await activeTab();
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "MATRIX_STATUS" });
    render(!!res?.enabled);
  } catch {
    render(false);
  }
})();

btn.addEventListener("click", async () => {
  const tab = await activeTab();
  const nowEnabled = btn.classList.contains("off"); // off -> turning on
  await chrome.storage.local.set({ matrixEnabled: nowEnabled });
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "MATRIX_TOGGLE",
      enabled: nowEnabled,
    });
    render(nowEnabled);
  } catch {
    // Content script not injected on this page (e.g. chrome:// pages).
    btn.textContent = "RELOAD PAGE";
  }
});
