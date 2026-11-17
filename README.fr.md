<p align="center">
  <img src="docs/icon.svg" width="88" alt="">
</p>

<h1 align="center">Transcriptions vocales pour Instagram</h1>

<p align="center">
  Lisez les messages vocaux Instagram en texte, dans 99 langues.<br>
  La transcription se fait <b>entièrement dans votre navigateur</b> avec Whisper d'OpenAI. Aucun audio n'est envoyé.
</p>

<p align="center"><a href="README.md">Read in English</a></p>

---

## Pourquoi

La transcription intégrée d'Instagram échoue souvent (« Unable to transcribe, try again ») et n'est pas
proposée partout. Cette extension ajoute son propre bouton **Transcrire** sous chaque message vocal sur
instagram.com. La transcription est calculée sur votre ordinateur.

## Fonctionnalités

- **Confidentialité.** Le décodage et la transcription se font en local, en WebAssembly et WebGPU. Il n'y a ni serveur, ni compte, ni clé d'API, ni pistage.
- **Grande précision.** L'extension utilise Whisper large-v3-turbo par défaut. Un modèle Whisper small, plus léger, est disponible pour les ordinateurs modestes.
- **99 langues parlées.** La langue est détectée automatiquement à chaque message. Vous pouvez aussi en fixer une.
- **Progression en direct.** Une barre de progression indique l'avancement de la transcription et le temps écoulé.
- **Gestion des modèles.** Vous choisissez le modèle, voyez l'espace disque utilisé et supprimez celui qui ne sert pas.
- **Mode comparaison.** Les deux modèles transcrivent le même vocal côte à côte, avec leurs temps.
- **Interface traduite.** Anglais, français, espagnol, allemand, italien, portugais (Brésil), turc et japonais.

## Installation

1. Téléchargez `voice-transcripts-x.y.z.zip` depuis la [dernière version](../../releases/latest) et décompressez-le.
2. Ouvrez `chrome://extensions` et activez le **Mode développeur**.
3. Cliquez sur **Charger l'extension non empaquetée** et choisissez le dossier décompressé (ou le dossier `extension/` de ce dépôt).

## Utilisation

1. Ouvrez une conversation sur instagram.com.
2. Cliquez sur **Transcrire** sous un vocal.
3. À la première utilisation, le modèle est téléchargé une seule fois depuis Hugging Face (environ 700 Mo pour *Précis*, 250 Mo pour *Rapide*). Ensuite, la transcription fonctionne hors ligne.

L'icône de l'extension ouvre les réglages : modèle, langue parlée, mode comparaison et libération d'espace disque.

## Performances

Sur un portable avec une puce graphique Intel Iris Xe, une fois le modèle chargé et avec la langue détectée automatiquement, le modèle *Précis* met :

- 9 s pour un vocal de 5 s ;
- 11 s pour un vocal de 7 s ;
- 14 s pour un vocal de 20 s ;
- 97 s pour un vocal de 75 s.

Le modèle *Rapide* met environ 6 s pour un vocal de 7 s.

## Confidentialité

L'audio et les transcriptions ne quittent jamais votre appareil, et les transcriptions ne sont pas conservées. Seuls vos réglages sont enregistrés. Voir [PRIVACY.md](PRIVACY.md).

## Limites

- L'extension fonctionne uniquement sur le site instagram.com, pas dans les applications mobiles.

> Ce projet n'est ni affilié à Instagram ou Meta Platforms, Inc., ni approuvé ou sponsorisé par eux.
