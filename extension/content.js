// ISOLATED world: add a "Transcribe" control under each voice message and show the result.
const t = (key, ...subs) => chrome.i18n.getMessage(key, subs.map(String)) || key;
const audioUrls = new Map(); // attachment_fbid -> CDN url (sent by hook.js)
const progressListeners = new Map(); // job id -> fn(progress)
const langNames = new Intl.DisplayNames([chrome.i18n.getUILanguage()], { type: "language" });
const langName = (code) => { try { return langNames.of(code === "jw" ? "jv" : code); } catch (_) { return code; } };

const resolvers = new Map(); // bubble key -> resolve(url)
window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data) return;
  if (e.data.__igvt === "audio") audioUrls.set(e.data.id, e.data.url);
  if (e.data.__igvt === "resolved" && resolvers.has(e.data.key)) resolvers.get(e.data.key)(e.data.url);
});

// Ask hook.js (page world) for the audio URL of the bubble whose <svg> carries data-igvt-key=key. It reads
// it from the bubble's React data, which also covers voice messages received live (their attachment id is
// still "null" in the page). Falls back to the URL seen in Instagram's API responses.
function audioUrl(key, fbid) {
  return new Promise((resolve) => {
    const done = (url) => { resolvers.delete(key); clearTimeout(timer); resolve(url || audioUrls.get(fbid) || null); };
    const timer = setTimeout(() => done(null), 1000);
    resolvers.set(key, done);
    window.postMessage({ __igvt: "resolve", key, id: fbid }, "*");
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "ig:progress") {
    const fn = progressListeners.get(msg.id);
    if (fn) fn(msg);
  }
});

function progressText(p) {
  switch (p.phase) {
    case "prepare": return t("progressPrepare");
    case "load": return p.pct == null ? t("progressLoad", t(`model_${p.model}`)) : t("progressLoadPct", t(`model_${p.model}`), Math.round(p.pct));
    case "detect": return t("progressDetect");
    case "transcribe": return p.eta == null ? t("progressTranscribe", Math.round(p.pct)) : t("progressTranscribeEta", Math.round(p.pct), p.eta);
    default: return t("progressWaiting");
  }
}

function errorText(message) {
  if (message === "ERR_AUDIO_MISSING") return t("errAudioMissing");
  if (message === "ERR_AUDIO_URL") return t("errAudioMissing");
  const http = /^ERR_AUDIO_HTTP:(\d+)$/.exec(message);
  if (http) return t("errAudioHttp", http[1]);
  return t("errGeneric", message);
}

function transcribe(id, url, model) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "ig:transcribe", id, url, model }, (res) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!res || res.error) return reject(new Error((res && res.error) || "?"));
      resolve(res);
    });
  });
}

const css = (el, style) => { el.style.cssText = style; return el; };
const div = (style) => css(document.createElement("div"), style);

// One result block: optional title, text, progress bar, muted footer (language · time).
function makeSection(title) {
  const el = div("margin-top:8px;");
  const head = div("font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;opacity:.6;margin-bottom:2px;");
  head.textContent = title || "";
  head.hidden = !title;
  const out = div("white-space:pre-wrap;word-break:break-word;user-select:text;");
  const track = div("display:none;height:3px;border-radius:2px;margin-top:6px;background:rgba(128,128,128,.25);overflow:hidden;");
  const fill = div("height:100%;width:0;border-radius:2px;background:currentColor;opacity:.8;transition:width .3s ease;");
  const foot = div("font-size:11px;opacity:.55;margin-top:4px;");
  foot.hidden = true;
  track.appendChild(fill);
  el.append(head, out, track, foot);

  let sweep = null;
  const stopSweep = () => { if (sweep) { sweep.cancel(); sweep = null; fill.style.marginLeft = "0"; } };
  return {
    el,
    progress(text, pct) {
      out.style.opacity = "0.65";
      out.style.fontSize = "13px";
      out.textContent = text;
      track.style.display = "block";
      if (pct == null) {
        if (sweep) return;
        fill.style.transition = "none";
        fill.style.width = "30%";
        sweep = fill.animate([{ marginLeft: "-30%" }, { marginLeft: "100%" }], { duration: 1200, iterations: Infinity });
      } else {
        stopSweep();
        fill.style.transition = "width .3s ease";
        fill.style.width = Math.max(0, Math.min(100, pct)) + "%";
      }
    },
    finish(text, meta, isError) {
      stopSweep();
      track.style.display = "none";
      out.style.opacity = isError ? "0.75" : "1";
      out.style.fontSize = isError ? "13px" : "";
      out.textContent = text;
      foot.textContent = meta || "";
      foot.hidden = !meta;
    },
  };
}

let bubbleCount = 0;
function mount(svg, mountedId) {
  const playerRow = svg.parentElement;
  const holder = playerRow && playerRow.parentElement;
  if (!holder || holder.dataset.igvt) return; // already has our control (the waveform was re-rendered)
  holder.dataset.igvt = "1";

  // Hide Instagram's own transcription control (it fails with "Unable to transcribe"); it sits right after the player.
  const native = playerRow.nextElementSibling;
  if (native && native.getAttribute("role") === "button") native.style.display = "none";

  const box = div("margin:2px 12px 10px;font-size:14px;line-height:1.4;color:inherit;max-width:320px;");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = t("btnTranscribe");
  css(btn, "all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;" +
    "font-size:12px;font-weight:600;color:inherit;background:rgba(128,128,128,.18);");
  btn.prepend(Object.assign(document.createElement("span"), { textContent: "✎", ariaHidden: "true" }));
  btn.onmouseenter = () => (btn.style.background = "rgba(128,128,128,.3)");
  btn.onmouseleave = () => (btn.style.background = "rgba(128,128,128,.18)");
  const results = div("");
  box.append(btn, results);
  holder.appendChild(box);

  btn.addEventListener("click", async (ev) => {
    ev.stopPropagation();
    // Instagram may have re-rendered the waveform since mounting (e.g. once a live message gets its id).
    const cp = holder.querySelector('clipPath[id^="waveform-clip-path-"]');
    const current = (cp && cp.closest("svg")) || svg;
    const fbid = cp ? cp.id.slice("waveform-clip-path-".length) : mountedId;
    const key = "b" + ++bubbleCount;
    current.dataset.igvtKey = key;
    const url = await audioUrl(key, fbid);
    btn.style.display = "none";
    results.textContent = "";

    const { compare } = await chrome.storage.local.get("compare");
    const models = compare ? ["fast", "accurate"] : [undefined]; // undefined = model chosen in the popup
    const sections = models.map((m) => {
      const s = makeSection(m ? t(`model_${m}`) : "");
      s.progress(t("progressWaiting"), null);
      results.appendChild(s.el);
      return s;
    });

    let failed = false;
    for (let i = 0; i < models.length; i++) {
      const id = `${key}#${models[i] || "default"}`;
      const s = sections[i];
      const t0 = Date.now();
      progressListeners.set(id, (p) => s.progress(progressText(p), p.pct));
      try {
        if (!url) throw new Error("ERR_AUDIO_MISSING");
        const res = await transcribe(id, url, models[i]);
        const secs = Math.round((Date.now() - t0) / 1000);
        s.finish(res.text || t("noSpeech"), `${langName(res.language)} · ${t("seconds", secs)}`);
      } catch (err) {
        s.finish(errorText(err.message), "", true);
        failed = true;
      } finally {
        progressListeners.delete(id);
      }
    }
    if (failed) {
      btn.lastChild.textContent = t("btnRetry");
      btn.style.display = "inline-flex";
    }
  });
}

function scan() {
  document.querySelectorAll('clipPath[id^="waveform-clip-path-"]').forEach((cp) => {
    const svg = cp.closest("svg");
    if (!svg || svg.dataset.igvt) return;
    svg.dataset.igvt = "1";
    mount(svg, cp.id.slice("waveform-clip-path-".length));
  });
}

let timer = null;
new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(scan, 300); })
  .observe(document, { childList: true, subtree: true });
