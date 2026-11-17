# Privacy Policy

_Last updated: November 17, 2026_

Voice Transcripts for Instagram ("the extension") transcribes Instagram voice messages **on your device**.
It does not collect, transmit, sell or share personal data.

## What the extension processes

- **Voice message audio.** When you click **Transcribe**, the extension downloads that message's audio from Instagram's media servers, which your browser can already access. It decodes the audio in memory and transcribes it locally. The audio is never sent anywhere else and is discarded after transcription.
- **Transcripts.** Transcripts are displayed in the page and are not stored or transmitted. They disappear when you reload the page.
- **Instagram page data.** To find voice message audio URLs, the extension reads the data Instagram already loads in the page: the voice message bubbles and the responses Instagram sends to your browser. Nothing is extracted except those URLs, and nothing leaves your browser.

## What the extension stores

- Your settings (chosen model, spoken language, compare mode), in `chrome.storage.local` on your device.
- The Whisper model files, in the browser's cache for the extension. You can delete them from the settings panel or by removing the extension.

## Network requests

- `*.fbsbx.com`, `*.fbcdn.net` and `*.cdninstagram.com`, to download the voice message you asked to transcribe.
- `huggingface.co` and `*.hf.co`, to download the open-source Whisper model files the first time you use a model.

There are no analytics, no telemetry, no ads and no third-party servers operated by the author.

## Contact

Questions? Open an issue on the project's GitHub repository.
