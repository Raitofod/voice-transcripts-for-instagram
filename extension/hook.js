// MAIN world: read Instagram's own GraphQL responses and extract voice-message audio URLs.
(() => {
  const found = new Map(); // attachment_fbid -> url

  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.attachment_fbid && node.attachment_cdn_url) {
      const id = String(node.attachment_fbid);
      if (found.get(id) !== node.attachment_cdn_url) {
        found.set(id, node.attachment_cdn_url);
        window.postMessage({ __igvt: "audio", id, url: node.attachment_cdn_url }, "*");
      }
    }
    for (const k in node) walk(node[k]);
  }

  function scan(text) {
    if (typeof text !== "string" || !text.includes("attachment_cdn_url")) return;
    try { walk(JSON.parse(text)); return; } catch (_) {}
    for (const line of text.split("\n")) {
      if (line.includes("attachment_cdn_url")) { try { walk(JSON.parse(line)); } catch (_) {} }
    }
  }

  // Voice messages that arrive in real time (over Instagram's websocket) never go through fetch/XHR.
  // Their data is still in the React tree: the bubble's Relay snapshot holds audio_attachments[] with
  // attachment_cdn_url (+ attachment_fbid, which is still null for a message that just arrived).
  // Walk up from the bubble's waveform <svg> (tagged by content.js) and take the nearest match.
  function findInReact(svgKey, id) {
    const svg = document.querySelector(`svg[data-igvt-key="${CSS.escape(svgKey)}"]`);
    const key = svg && Object.keys(svg).find((k) => k.startsWith("__reactFiber$"));
    if (!key) return null;
    const anyId = !/^\d+$/.test(id);
    const seen = new WeakSet();
    const search = (node, depth) => {
      if (!node || typeof node !== "object" || depth > 8 || seen.has(node)) return null;
      seen.add(node);
      if (typeof node.attachment_cdn_url === "string" && (anyId || String(node.attachment_fbid) === id)) return node.attachment_cdn_url;
      for (const k in node) {
        if (k === "children" || k === "_owner" || k.startsWith("__react")) continue;
        let v;
        try { v = node[k]; } catch (_) { continue; }
        if (v && typeof v === "object" && !(v instanceof Node)) {
          const hit = search(v, depth + 1);
          if (hit) return hit;
        }
      }
      return null;
    };
    for (let f = svg[key], level = 0; f && level < 40; f = f.return, level++) {
      const hit = search(f.memoizedState, 0) || search(f.memoizedProps, 0);
      if (hit) return hit;
    }
    return null;
  }

  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.__igvt !== "resolve") return;
    const { key, id } = e.data;
    let url = null;
    try { url = findInReact(String(key), String(id)); } catch (_) {}
    window.postMessage({ __igvt: "resolved", key, url: url || found.get(String(id)) || null }, "*");
  });

  // Only API responses can carry thread data; skip media, scripts and streams.
  const isApi = (url) => /\/(api|graphql)\b/.test(String(url || ""));

  const origFetch = window.fetch;
  window.fetch = async function () {
    const res = await origFetch.apply(this, arguments);
    try { if (isApi(res.url)) res.clone().text().then(scan).catch(() => {}); } catch (_) {}
    return res;
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("load", () => {
      try { if (isApi(this.responseURL) && (this.responseType === "" || this.responseType === "text")) scan(this.responseText); } catch (_) {}
    });
    return origSend.apply(this, arguments);
  };
})();
