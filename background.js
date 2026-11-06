// Digital Rain — service worker.
// Embedded frames (rich editors, Google Docs' input iframe) can't draw on the
// top page, so their content script reports "a key was pressed" here and we
// forward it to the tab's top frame, where the overlay lives. Which key was
// pressed is never sent; the extension channel keeps it away from page scripts.
"use strict";

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id !== chrome.runtime.id || msg?.type !== "RAIN_FRAME_KEY") return;
  const tabId = sender.tab?.id;
  if (tabId === undefined || sender.frameId === 0) return;
  const relay = { type: "RAIN_FRAME_KEY", enter: msg.enter === true, repeat: msg.repeat === true };
  chrome.tabs.sendMessage(tabId, relay, { frameId: 0 }).catch(() => {
    // Top frame has no content script (restricted page): nothing to draw on.
  });
});
