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
