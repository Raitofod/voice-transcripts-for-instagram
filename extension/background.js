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

// Update check: GitHub installs get no automatic updates, so once a day ask GitHub for the latest release's
// version number (nothing else is sent) and show a badge on the toolbar icon when it is newer. Can be turned off.
const LATEST_RELEASE = "https://api.github.com/repos/Raitofod/voice-transcripts-for-instagram/releases/latest";
const DAY_MS = 24 * 60 * 60 * 1000;
const isNewer = (a, b) => {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};

async function checkForUpdate() {
  const { updateCheck, updateCheckedAt = 0 } = await chrome.storage.local.get(["updateCheck", "updateCheckedAt"]);
  if (updateCheck !== false && Date.now() - updateCheckedAt > DAY_MS) {
    try {
      const res = await fetch(LATEST_RELEASE, { credentials: "omit", cache: "no-store" });
      const tag = res.ok ? String((await res.json()).tag_name || "") : "";
      if (/^v?\d+(\.\d+)*$/.test(tag)) await chrome.storage.local.set({ latestVersion: tag.replace(/^v/, ""), updateCheckedAt: Date.now() });
    } catch (_) {} // offline or rate-limited: try again at the next alarm
  }
  const { latestVersion } = await chrome.storage.local.get("latestVersion");
  const available = updateCheck !== false && !!latestVersion && isNewer(latestVersion, chrome.runtime.getManifest().version);
  await chrome.action.setBadgeBackgroundColor({ color: "#5b4cf0" });
  await chrome.action.setBadgeText({ text: available ? "NEW" : "" });
}

const scheduleUpdateCheck = () => { chrome.alarms.create("update-check", { periodInMinutes: 360 }); checkForUpdate(); };
chrome.runtime.onInstalled.addListener(scheduleUpdateCheck);
chrome.runtime.onStartup.addListener(scheduleUpdateCheck);
chrome.alarms.onAlarm.addListener((a) => { if (a.name === "update-check") checkForUpdate(); });
chrome.storage.onChanged.addListener((c) => { if (c.updateCheck) checkForUpdate(); });
