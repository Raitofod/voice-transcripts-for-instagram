// Offscreen document: runs Whisper locally (transformers.js + ONNX Runtime Web).
// Only chrome.runtime is available here, so progress is sent as structured data and worded by the content script.
import { MODELS, DEFAULT_MODEL } from "./models.js";

const SAMPLE_RATE = 16000;
const CHUNK_S = 30;
const STRIDE_S = 5;
const TOKENS_PER_S = 3.5; // rough speech rate, used to interpolate progress between timestamp tokens
const AUDIO_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(fbsbx\.com|fbcdn\.net|cdninstagram\.com)\//i;

let job = null; // { id, tabId } of the transcription in progress
const report = (phase, extra = {}) =>
  job && chrome.runtime.sendMessage({ type: "off:progress", ...job, phase, ...extra }).catch(() => {});

let lib = null;
async function loadLib() {
  if (lib) return lib;
  lib = await import("./vendor/transformers.min.js");
  lib.env.allowLocalModels = false;
  lib.env.useWasmCache = false; // the runtime ships with the extension; the Cache API rejects chrome-extension:// URLs
  lib.env.backends.onnx.wasm.wasmPaths = {
    mjs: chrome.runtime.getURL("vendor/ort-wasm-simd-threaded.asyncify.mjs"),
    wasm: chrome.runtime.getURL("vendor/ort-wasm-simd-threaded.asyncify.wasm"),
  };
  if (self.crossOriginIsolated) lib.env.backends.onnx.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 1);
  return lib;
}

async function hasWebGPU() {
  try { return !!(navigator.gpu && (await navigator.gpu.requestAdapter())); } catch (_) { return false; }
}

// One model in memory at a time, using the model's WebGPU setup when the GPU is usable (see models.js).
let loaded = { key: null, promise: null };
function getAsr(key) {
  if (loaded.key === key && loaded.promise) return loaded.promise;
  const previous = loaded.promise;
  const cfg = MODELS[key];
  const promise = (async () => {
    if (previous) { try { await (await previous).dispose(); } catch (_) {} }
    const { pipeline } = await loadLib();
    const files = {};
    const opts = {
      dtype: cfg.dtype,
      progress_callback: (p) => {
        if (p.status !== "progress" || !p.total) return;
        files[p.file] = { loaded: p.loaded, total: p.total };
        const all = Object.values(files);
        const pct = (100 * all.reduce((a, f) => a + f.loaded, 0)) / all.reduce((a, f) => a + f.total, 0);
        report("load", { model: key, pct });
      },
    };
    if (cfg.gpu && (await hasWebGPU())) {
      try {
        return await pipeline("automatic-speech-recognition", cfg.id, { ...opts, ...cfg.gpu });
      } catch (e) {
        console.warn("WebGPU setup failed, using CPU only:", e);
      }
    }
    return pipeline("automatic-speech-recognition", cfg.id, opts);
  })();
  loaded = { key, promise };
  promise.catch(() => { if (loaded.promise === promise) loaded = { key: null, promise: null }; });
  return promise;
}

async function decode(url) {
  if (!AUDIO_HOSTS.test(url)) throw new Error("ERR_AUDIO_URL");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ERR_AUDIO_HTTP:${res.status}`);
  const ctx = new OfflineAudioContext(1, 1, SAMPLE_RATE); // decodeAudioData resamples to the context rate
  return (await ctx.decodeAudioData(await res.arrayBuffer())).getChannelData(0);
}

// transformers.js has no language detection for Whisper (it silently falls back to English), so do it the
// way Whisper does: one decoder step after <|startoftranscript|> on the first 30 s, best language token wins.
// Returns the encoder output too, so a single-window message is not encoded twice.
async function detectLanguage(asr, samples) {
  const { Tensor } = await loadLib();
  const model = asr.model;
  const gen = model.generation_config;
  const { input_features } = await asr.processor(samples.subarray(0, CHUNK_S * SAMPLE_RATE));
  const { encoder_outputs } = await model._prepare_encoder_decoder_kwargs_for_generation({
    inputs_tensor: input_features, model_inputs: { input_features }, model_input_name: "input_features", generation_config: gen,
  });
  const decoder_input_ids = new Tensor("int64", BigInt64Array.of(BigInt(gen.decoder_start_token_id)), [1, 1]);
  const { logits } = await model({ encoder_outputs, decoder_input_ids });
  let language = "en", bestScore = -Infinity;
  for (const [token, id] of Object.entries(gen.lang_to_id)) {
    if (logits.data[id] > bestScore) { bestScore = logits.data[id]; language = token.slice(2, -2); }
  }
  return { language, encoder_outputs };
}

// Make the pipeline's next encoder pass return an encoder output computed earlier
// (generate() ignores an `encoder_outputs` argument, so hook the step that computes it).
function reuseEncoderOnce(model, encoder_outputs) {
  const restore = () => { delete model._prepare_encoder_decoder_kwargs_for_generation; };
  model._prepare_encoder_decoder_kwargs_for_generation = async ({ model_inputs }) => {
    restore();
    return { ...model_inputs, encoder_outputs };
  };
  return restore;
}

// Progress = audio position reached. Whisper only emits <|t.tt|> timestamp tokens at segment boundaries,
// so between them we estimate from the number of tokens generated.
function progressStreamer(tsBegin, durationS) {
  const hop = CHUNK_S - 2 * STRIDE_S;
  let chunk = 0, steps = 0, tsPos = 0, lastPct = 0;
  return {
    put(value) {
      const ids = Array.isArray(value[0]) ? value[0] : value;
      steps++;
      for (const t of ids) if (Number(t) >= tsBegin) tsPos = Math.min((Number(t) - tsBegin) * 0.02, CHUNK_S);
      const chunkLen = Math.min(CHUNK_S, durationS - chunk * hop);
      const pos = chunk * hop + Math.max(tsPos, Math.min(0.95 * chunkLen, steps / TOKENS_PER_S));
      const pct = Math.min(99, Math.max(lastPct, (100 * pos) / durationS));
      if (pct - lastPct < 1 && lastPct > 0) return;
      lastPct = pct;
      report("transcribe", { pct });
    },
    end() { chunk++; steps = 0; tsPos = 0; },
  };
}

async function run({ url, model, language }) {
  const key = MODELS[model] ? model : DEFAULT_MODEL;
  report("prepare");
  const samples = await decode(url);
  report("load", { model: key, pct: null });
  const asr = await getAsr(key);
  let lang = language;
  // A language the model does not know (Cantonese exists in large-v3 only) falls back to detection.
  if (lang && lang !== "auto" && !(`<|${lang}|>` in asr.model.generation_config.lang_to_id)) lang = "auto";
  let restore = () => {};
  if (!lang || lang === "auto") {
    report("detect");
    const detected = await detectLanguage(asr, samples);
    lang = detected.language;
    if (samples.length <= CHUNK_S * SAMPLE_RATE) restore = reuseEncoderOnce(asr.model, detected.encoder_outputs);
  }
  report("transcribe", { pct: 0 });
  try {
    const out = await asr(samples, {
      language: lang,
      task: "transcribe",
      chunk_length_s: CHUNK_S,
      stride_length_s: STRIDE_S,
      return_timestamps: true,
      streamer: progressStreamer(asr.tokenizer.convert_tokens_to_ids("<|0.00|>"), samples.length / SAMPLE_RATE),
    });
    return { text: out.text.trim(), language: lang };
  } finally {
    restore();
  }
}

// One transcription at a time. Jobs waiting their turn are told how many are ahead of them.
let queue = Promise.resolve();
const waiting = [];
const reportQueue = () => waiting.forEach((j, i) => {
  const ahead = i + (job ? 1 : 0);
  if (ahead) chrome.runtime.sendMessage({ type: "off:progress", ...j, phase: "queued", ahead }).catch(() => {});
});
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "off:transcribe") return;
  const me = { id: msg.id, tabId: msg.tabId };
  waiting.push(me);
  reportQueue();
  queue = queue
    .then(() => { waiting.splice(waiting.indexOf(me), 1); job = me; reportQueue(); return run(msg); })
    .then((res) => sendResponse(res))
    .catch((e) => sendResponse({ error: String((e && e.message) || e) }))
    .finally(() => { job = null; });
  return true;
});
