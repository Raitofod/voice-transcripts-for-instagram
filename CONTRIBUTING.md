# Contributing

Thanks for helping! Bug reports, fixes and translations are all welcome.

## Reporting a bug

Please include your browser and version, your operating system, and the message shown under the voice
message. Errors are also listed on the extension's card in `chrome://extensions`.
**Do not paste transcripts or screenshots of private conversations.**

## Adding or fixing a translation

The interface strings live in `extension/_locales/<locale>/messages.json`. To add a language:

1. Copy `extension/_locales/en/messages.json` to `extension/_locales/<locale>/messages.json`. Use a [Chrome locale code](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales) such as `ko`, `pt_PT` or `zh_CN`.
2. Translate every `message` value. Keep the `$1` and `$2` placeholders.
3. Load the extension with your browser set to that language, and check the settings panel and a transcription.
4. Open a pull request.

Spoken languages for transcription don't need translating. Their names come from the browser (`Intl.DisplayNames`).

## Code

- Plain JavaScript, Manifest V3, no build step. Load `extension/` with **Load unpacked**.
- Please keep changes focused and match the existing style.
- After editing, reload the extension in `chrome://extensions` **and** reload the Instagram tab.
