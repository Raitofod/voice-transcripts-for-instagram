// Whisper models the user can pick from. The chosen key is stored in chrome.storage.local under "model".
// Labels and descriptions live in _locales (model_<key>, model_<key>_desc).
// `gpu`: optional WebGPU setup, used when available. Whisper always encodes a full 30 s window, so the encoder
// dominates for short voice messages; running it on the GPU in q4f16 cut a 7 s message from 16 s to 9 s on an
// Intel iGPU. The token-by-token decoder is faster on the CPU. whisper-small gained nothing from the GPU.
export const DEFAULT_MODEL = "accurate";
export const MODELS = {
  accurate: {
    id: "onnx-community/whisper-large-v3-turbo",
    dtype: { encoder_model: "q4", decoder_model_merged: "q4" },
    gpu: {
      dtype: { encoder_model: "q4f16", decoder_model_merged: "q4" },
      device: { encoder_model: "webgpu", decoder_model_merged: "wasm" },
    },
    sizeMB: 700,
  },
  fast: {
    id: "onnx-community/whisper-small",
    dtype: "q8",
    sizeMB: 250,
  },
};

// Languages Whisper can transcribe (ISO codes as used by Whisper). "auto" = detect per message.
export const DEFAULT_LANGUAGE = "auto";
export const LANGUAGES = [
  "af", "am", "ar", "as", "az", "ba", "be", "bg", "bn", "bo", "br", "bs", "ca", "cs", "cy", "da", "de", "el", "en",
  "es", "et", "eu", "fa", "fi", "fo", "fr", "gl", "gu", "ha", "haw", "he", "hi", "hr", "ht", "hu", "hy", "id", "is",
  "it", "ja", "jw", "ka", "kk", "km", "kn", "ko", "la", "lb", "ln", "lo", "lt", "lv", "mg", "mi", "mk", "ml", "mn",
  "mr", "ms", "mt", "my", "ne", "nl", "nn", "no", "oc", "pa", "pl", "ps", "pt", "ro", "ru", "sa", "sd", "si", "sk",
  "sl", "sn", "so", "sq", "sr", "su", "sv", "sw", "ta", "te", "tg", "th", "tk", "tl", "tr", "tt", "uk", "ur", "uz",
  "vi", "yi", "yo", "yue", "zh",
];
