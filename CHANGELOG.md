# Changelog

All notable changes to this project are listed here. Versions follow [semantic versioning](https://semver.org/).

## [1.0.4] - 2026-11-17

### Changed
- **License:** the MIT license now carries the Commons Clause. The code stays open and free to use, modify and share, but nobody may sell the extension or a product built mainly on it. The release zip now includes the license.

## [1.0.3] - 2026-11-17

### Added
- **Copy** button next to each transcript.
- New icon on the **Transcribe** button: a waveform turning into text, matching the extension's logo.
- GitHub link with the version number in the settings panel.

### Fixed
- Choosing Cantonese with the *Fast* model, which does not support it, now falls back to automatic detection instead of failing.
- The settings panel footer no longer wraps awkwardly in some languages.

## [1.0.2] - 2026-11-17

### Changed
- The progress bar now shows the elapsed time instead of an estimate of the time remaining, which was never reliable.

### Fixed
- Two transcriptions started at the same moment right after the browser opened could fail with "Only a single offscreen document may be created".

## [1.0.1] - 2026-11-17

### Fixed
- A transcription in progress was lost when Instagram re-rendered the conversation, for example after clicking **Reply**.

### Added
- Transcriptions waiting their turn show how many are ahead of them.

## [1.0.0] - 2026-11-17

First public release.

- **Transcribe** button under every voice message on instagram.com, including messages received while the conversation is open.
- On-device transcription with Whisper large-v3-turbo (*Accurate*) or Whisper small (*Fast*), using WebGPU when available.
- Automatic language detection across 99 languages, or a fixed spoken language.
- Live progress bar, model manager with disk usage, and compare mode.
- Interface in English, French, Spanish, German, Italian, Portuguese (Brazil), Turkish and Japanese.

[1.0.4]: https://github.com/Raitofod/voice-transcripts-for-instagram/releases/tag/v1.0.4
[1.0.3]: https://github.com/Raitofod/voice-transcripts-for-instagram/releases/tag/v1.0.3
[1.0.2]: https://github.com/Raitofod/voice-transcripts-for-instagram/releases/tag/v1.0.2
[1.0.1]: https://github.com/Raitofod/voice-transcripts-for-instagram/releases/tag/v1.0.1
[1.0.0]: https://github.com/Raitofod/voice-transcripts-for-instagram/releases/tag/v1.0.0
