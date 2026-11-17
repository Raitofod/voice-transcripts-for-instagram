// Service worker: route transcription requests from Instagram tabs to the offscreen document running Whisper.
// Concurrent requests share one creation (a second createDocument call would fail).
let creating = null;
async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  creating ??= chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["WORKERS"],
    justification: "Run local Whisper speech-to-text in WebAssembly/WebGPU",
  }).catch((e) => { if (!/single offscreen/i.test(String(e && e.message))) throw e; })
    .finally(() => { creating = null; });
  await creating;
}

// The offscreen page may not have registered its listener yet right after creation: retry briefly.
async function sendToOffscreen(msg) {
  for (let i = 0; ; i++) {
    try {
      return await chrome.runtime.sendMessage(msg);
    } catch (e) {
      if (i >= 20 || !/Receiving end does not exist/.test(String(e && e.message))) throw e;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "ig:transcribe") {
    Promise.all([ensureOffscreen(), chrome.storage.local.get(["model", "language"])])
      .then(([, prefs]) => sendToOffscreen({
        type: "off:transcribe",
        id: msg.id,
        tabId: sender.tab && sender.tab.id,
        url: msg.url,
        model: msg.model || prefs.model,
        language: prefs.language,
      }))
      .then(sendResponse)
      .catch((e) => sendResponse({ error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "off:progress" && msg.tabId != null) {
    chrome.tabs.sendMessage(msg.tabId, { ...msg, type: "ig:progress" }).catch(() => {});
  }
});
