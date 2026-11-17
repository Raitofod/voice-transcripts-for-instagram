import { MODELS, DEFAULT_MODEL, LANGUAGES, DEFAULT_LANGUAGE } from "./models.js";

const t = (key, ...subs) => chrome.i18n.getMessage(key, subs.map(String)) || key;
const $ = (id) => document.getElementById(id);
const note = $("note");

document.documentElement.lang = chrome.i18n.getUILanguage();
document.documentElement.dir = chrome.i18n.getMessage("@@bidi_dir");
document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
$("version").textContent = "v" + chrome.runtime.getManifest().version;

const fmt = (bytes) => (bytes >= 1e9 ? (bytes / 1e9).toFixed(1) + " GB" : Math.round(bytes / 1e6) + " MB");

// Model files live in the Cache API of this extension's origin (transformers.js stores them there).
async function cacheEntries(modelId) {
  const found = [];
  for (const name of await caches.keys()) {
    const cache = await caches.open(name);
    for (const req of await cache.keys()) {
      if (req.url.includes(`/${modelId}/resolve/`)) found.push({ cache, req });
    }
  }
  return found;
}

async function cachedBytes(entries) {
  let total = 0;
  for (const { cache, req } of entries) {
    const res = await cache.match(req);
    total += Number(res.headers.get("content-length")) || (await res.blob()).size;
  }
  return total;
}

async function renderModels() {
  const { model } = await chrome.storage.local.get("model");
  const selected = MODELS[model] ? model : DEFAULT_MODEL;
  const cards = [];

  for (const [key, m] of Object.entries(MODELS)) {
    const entries = await cacheEntries(m.id);
    const card = document.createElement("label");
    card.className = "card" + (key === selected ? " on" : "");

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "model";
    radio.checked = key === selected;
    radio.addEventListener("change", async () => {
      await chrome.storage.local.set({ model: key });
      note.textContent = t("noteSaved");
      renderModels();
    });

    const name = Object.assign(document.createElement("div"), { className: "name", textContent: t(`model_${key}`) });
    const desc = Object.assign(document.createElement("div"), { className: "desc", textContent: t(`model_${key}_desc`) });

    const status = document.createElement("div");
    status.className = "status" + (entries.length ? " ok" : "");
    const text = document.createElement("span");
    text.textContent = entries.length
      ? t("statusDownloaded", fmt(await cachedBytes(entries)))
      : t("statusNotDownloaded", fmt(m.sizeMB * 1e6));
    status.append(text);

    // Only the model that is not in use can be deleted.
    if (entries.length && key !== selected) {
      const del = Object.assign(document.createElement("button"), { type: "button", textContent: t("btnDelete") });
      del.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (!confirm(t("confirmDelete", t(`model_${key}`)))) return;
        for (const { cache, req } of entries) await cache.delete(req);
        note.textContent = t("noteDeleted", t(`model_${key}`));
        renderModels();
      });
      status.append(del);
    }

    card.append(radio, name, desc, status);
    cards.push(card);
  }
  $("models").replaceChildren(...cards);
}

async function renderLanguage() {
  const select = $("language");
  const names = new Intl.DisplayNames([chrome.i18n.getUILanguage()], { type: "language" });
  const nameOf = (code) => { try { return names.of(code === "jw" ? "jv" : code); } catch (_) { return code; } };
  const options = LANGUAGES.map((code) => [code, nameOf(code)]).sort((a, b) => a[1].localeCompare(b[1]));
  select.replaceChildren(
    new Option(t("languageAuto"), "auto"),
    ...options.map(([code, name]) => new Option(name.charAt(0).toLocaleUpperCase() + name.slice(1), code)),
  );
  const { language } = await chrome.storage.local.get("language");
  select.value = language || DEFAULT_LANGUAGE;
  select.addEventListener("change", async () => {
    await chrome.storage.local.set({ language: select.value });
    note.textContent = t("noteSaved");
  });
}

async function renderCompare() {
  const box = $("compare");
  box.checked = !!(await chrome.storage.local.get("compare")).compare;
  box.addEventListener("change", async () => {
    await chrome.storage.local.set({ compare: box.checked });
    note.textContent = t("noteSaved");
  });
}

renderModels();
renderLanguage();
renderCompare();
