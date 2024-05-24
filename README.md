# Obsidian MP3 Transcriber

## About
Transcribe YouTube videos and mp3 files into Obsidian notes.  The finished Obsidian note includes both the metadata and the transcript text.
<div style="text-align: center;">
  <img src="docs/images/30_000_foot.png" alt="30000 foot view" width="800" />
</div>

The **Person Using Plugin** inputs a YouTube URL or uploads an MP3 file through the **Plugin UI**, which the **Plugin Code (ObsidianMP3Transcriber)** sends to the **FastAPI service `/api/v1/process_audio endpoint`** for transcription. After posting to the `/api/v1/process_audio` endpoint, the plugin sets up an EventStream to use the SSE endpoint `/api/v1/stream`, which sends back the transcribed text in real-time. The **Plugin Code** then integrates this frontmatter and content into an Obsidian note stored within a folder within the **Person Using Plugin**'s vault.

## Example

### Bring up the UI


## Quickstart
Both the plugin and the FastAPI service need to be running.
### Run Service
The FastAPI service is run in a Docker container.
#### Install Docker
If you plan to run the service on your computer, you need Docker.  If Docker is not installed, [download](https://docs.docker.com/get-docker/) and install.

#### Download Image
After the Docker Desktop has been installed, download the image:
```

```
### Install Plugin

### Set Properties

### Transcribe

> **Note:** This section assumes:
>- The service is running.
>- The plugin has been installed.
>- The properties have been set.

Within a vault you wish to store transcriptions:

- Bring up the Obsidian Command Palette. You can open it by pressing `Ctrl+P` (or `Cmd+P` on macOS) by default.
- Bring up the transcriber ui by typing `t` then`r` - basically spelling out `transcriber` until the name of the plugin (Obsidian Transcriber) is highlighted.  Press `enter`.
- Paste a YouTube url or Choose a local mp3 file.
- Press `submit`.

There will be occassional notices as the service runs through the transcription process.  It could take quite a while before completing.

Upon completion, the transcript will be located in the Obsidian vault's transcripts folder (unless another folder was assigned during property settings).

The filename will be the title of the YouTube video or the mp3 filename base in the case of an uploaded mp3 file.


> **Note:** The plugin must be able to communicate with the Fastapi service.  It is the Fastapi service running the software that downloads youtube vidoes as well as transcribe mp3 files. This section of the documentation assumes availability of this service to the plugin.


# Contents of a Transcribed Note
  The plugin will create two sections in the note:
- Frontmatter
- Transcript text
If the YouTube video has metadata on chapters, the transcript text will be sectioned into chapters.
## Frontmatter
The plugin builds frontmatter based on the metadata and tuning parameters.
### YouTube Video
Consider the output after asking the plugin to transcribe the YouTube video, [LLM Prompt FORMATS make or break your LLM and RAG](https://www.youtube.com/watch?v=KbZDsrs5roI).

<div style="text-align: center;">
  <img src="docs/images/frontmatter.png" alt="30000 foot view" width="600" />
</div>

### Metadata
The key/values of the frontmatter are derived from YouTube metadata and OpenAI Whisper tuning parameters. These properties benefit search (e.g., tags) and provide context about the video (e.g., description, tags). Additionally, the tuning parameters used as input to OpenAI Whisper are included.

#### Title / Filename
The YouTube metadata provides the title, which is used to build the filename in the vault.

## Transcript Text with Chapters
If a transcript originated from a YouTube video, it might be lucky enough to be segmented into chapters.  Some, but unfortunately not all YouTube videos, are segmented into chapters.  Along with the start and end time, each chapter comes with a title.  There are two ways a video can have chapters.  The author can manually create chapters by adding timestamps and titles.  YouTube can also generate chapters algorithmically using techniques like Natural Language Processing (NLP), visual and audio cues, and user interaction data.

### Example
Consider the YouTube video, [Bluelab Pulse Meter Review](https://www.youtube.com/watch?v=KbZDsrs5roI).  The video has been segmented into chapters:
<div>
  <img src="docs/images/youtube_metadata.png" alt="30000 foot view" width="800" />
</div>

The transcription service takes the audio content and builds the content section following the frontmatter.
<div>
  <img src="docs/images/transcribed_chapters.png" alt="30000 foot view" width="700" />
</div>







This is a sample plugin for Obsidian (https://obsidian.md).

This project uses Typescript to provide type checking and documentation.
The repo depends on the latest plugin API (obsidian.d.ts) in Typescript Definition format, which contains TSDoc comments describing what it does.

**Note:** The Obsidian API is still in early alpha and is subject to change at any time!

This sample plugin demonstrates some of the basic functionality the plugin API can do.
- Adds a ribbon icon, which shows a Notice when clicked.
- Adds a command "Open Sample Modal" which opens a Modal.
- Adds a plugin setting tab to the settings page.
- Registers a global click event and output 'click' to the console.
- Registers a global interval which logs 'setInterval' to the console.

## First time developing plugins?

Quick starting guide for new plugin devs:

- Check if [someone already developed a plugin for what you want](https://obsidian.md/plugins)! There might be an existing plugin similar enough that you can partner up with.
- Make a copy of this repo as a template with the "Use this template" button (login to GitHub if you don't see it).
- Clone your repo to a local development folder. For convenience, you can place this folder in your `.obsidian/plugins/your-plugin-name` folder.
- Install NodeJS, then run `npm i` in the command line under your repo folder.
- Run `npm run dev` to compile your plugin from `main.ts` to `main.js`.
- Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
- Reload Obsidian to load the new version of your plugin.
- Enable plugin in settings window.
- For updates to the Obsidian API run `npm update` in the command line under your repo folder.

## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

- Check https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code.
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint .\src\`

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See https://github.com/obsidianmd/obsidian-api
