# Obsidian Transcriber Plugin

### 📢 Description

The Obsidian Transcriber plugin converts MP3 files and YouTube videos into text within Obsidian. Seamlessly integrated, it offers customizable settings, rich metadata, and easy access to transcriptions.

<!-- Note section, Blue -->
<div style="padding: 10px; border-left: 3px solid #0CD2FC; background-color: #0D5463;">
  <strong>Note:</strong> The Obsidian Transcriber plugin requires a connection to an Obsidian Transcriber service. Refer to the section on setting up and using the Obsidian Transcriber service for details.
</div>

## ✨ Features

- **📝 Transcribes Media**: Converts YouTube videos and MP3 files into Obsidian notes.
- **📄 Rich Metadata**: Includes YouTube and MP3 metadata as [YAML frontmatter](https://www.wundertech.net/yaml-front-matter-in-obsidian/) to enhance transcript quality.
- **⚙️ Customizable Settings**:
  - **📂 Transcripts Folder**: Specify the vault folder for transcripts. Auto-creates folder if it doesn't exist. Default: `transcripts`.
  - **🌐 Obsidian Transcriber Service URL**: Set the URL to the endpoint running the Obsidian Transcriber Service endpoint. Default: `http://127.0.0.1:8000/api/v1/process_audio`.
  - **🎧 Audio Quality**: Choose audio quality from `tiny` to `large` using Whisper. Higher quality increases processing time. Default: `medium`.
  - **🐞 Log Level**: Set logging level for debugging. Default: `debug`.

## 🎥 Demo

<div style="text-align: center;">
  <img src="https://github.com/solarslurpi/obsidian-transcriber-plugin/raw/main/docs/docs/obsidian-transcriber.gif" alt="Obsidian Transcriber" style="width: 700px;">
</div>

The demo showed:
- The key/values of the frontmatter are derived from YouTube metadata and `whisper` tuning parameters. These properties benefit search (e.g., tags) and provide context about the video (e.g., description, tags).
- If a transcript originates from a YouTube video with chapters, the transcript will be segmented accordingly. Each chapter will include its title, start and stop times, and the corresponding text.

<!-- Note section, Blue -->
<div style="padding: 10px; border-left: 3px solid #0CD2FC; background-color: #0D5463;">
  <strong>Note:</strong> Some, but unfortunately not all YouTube videos, are segmented into chapters.  Along with the start and end time, each chapter comes with a title.  There are two ways a video can have chapters.  The author can manually create chapters by adding timestamps and titles.  YouTube can also generate chapters algorithmically using techniques like Natural Language Processing (NLP), visual and audio cues, and user interaction data..
</div>

## 💡 How It Works
To use the plugin, you have two options to get to the plugin's UI. First, you can access the plugin commands by opening the command palette with `Ctrl+P` or `Cmd+P` and typing `transcriber`. Second, you can use the plugin's flower icon in the ribbon on the left side of the Obsidian interface.

<!-- Note section, Grey -->
<div style="padding: 10px; border-left: 3px solid #A5AFAF; background-color: #232727;">
  <strong>Note:</strong>  If the icon is not visible, ensure that the plugin is properly installed and enabled. Then, check the visible icons in the ribbon by right-clicking on an empty space in the ribbon to see which icons are displayed and adjust as needed.
</div>

<div style="text-align: center;"> <img src="docs/images/input_ui.png" alt="api endpoint in settings" width="500"> </div>

Once in the UI:
- Choose an audio file or enter a YouTube URL to transcribe.
- Tap or click on the `Submit` button.

## ⚙️ Configuration
You can configure the plugin settings by navigating to `Settings` > `Plugin Options` > `Obsidian Transcriber`. Available settings include:
- **Obsidian Transcriber Service URL**: Specify the URL endpoint for the transcription service.  The default setting is `http://127.0.0.1:8000/api/v1/process_audio`.  Change the URL component to be the URL to the IP address and port that is running the FastAPI service.
- **Audio Quality**: Select the desired audio quality (tiny, small, medium, large).
- **Log Level**: Set the log level for the plugin (error, warn, info, http, verbose, debug, silly).

## 🛠️ Installation

### Installing the Obsidan Transcriber Plugin

#### From Obsidian
(Currently not available)
1. Open Obsidian.
2. Go to `Settings` > `Community plugins` > `Browse`.
3. Search for "Obsidian Transcriber".
4. Click `Install`.
5. Once installed, enable the plugin in the `Community plugins` section.

### Manual Installation
1. Download the latest release from the [GitHub releases page](https://github.com/your-repo/obsidian-transcriber/releases).
2. Unzip the download.
3. Copy the `obsidian-transcriber` folder to your vault's plugins folder: `<vault>/.obsidian/plugins/`.
4. Enable the plugin in the Obsidian settings under `Community plugins`.


### Setting up an Obsidian Transcriber Service
The Obsidian Transcriber Service is available as a Docker container on Docker Hub.

#### Local Install

#### Remote Install on RunPod

There are many hosted (GPU) services to use.  I have used [RunPod](https://www.runpod.io/) in the past with success.  To use RunPod:
1. Get an account and Login.
2. Deploy a Pod. The better the GPU, CPU, memory resources, the faster and more robust the service will perform.
  - Choose the Obsidian Transcriber Service Template:

<div style="text-align: center;"> <img src="docs/images/runpod-template-icon.png" alt="api endpoint in settings" width="400"> </div>

3. Once the Pod is deployed, note the https address:
<!-- Note section, Grey -->
<div style="padding: 10px; border-left: 3px solid #A5AFAF; background-color: #232727;">
  <strong>Note:</strong> a Pod's https address is programmatically formed based off the Pod ID and the app's port.  https://{POD_ID}-{INTERNAL_PORT}.proxy.runpod.net
</div>

The Obsidian Transcriber Service uses port 8000.

<div style="text-align: center;"> <img src="docs/images/runpod-id.png" alt="api endpoint in settings" width="700"> </div>

The Runpod id can be found within the Pod's UI.  In the image, the pod id is oby1a31cpjufc9.  The https address to this pod is:
```html
https://oby1a31cpjufc9-8000.proxy.runpod.net
```
4. Set the Obsidian Transcriber Service API endpoint in the Settings UI.

<div style="text-align: center;"> <img src="docs/images/setings_ui.png" alt="api endpoint in settings" width="700"> </div>

To the correct endpoint.  In the example given in step 3, this would be:
```html
https://oby1a31cpjufc9-8000.proxy.runpod.net/api/v1/process_audio
```
<div style="padding: 10px; border-left: 3px solid #A5AFAF; background-color: #232727;">
  <strong>Note:</strong> Pay careful attention to get the endpoint correct.  It is necessary in order for the transcription to work.  If you feel it should work, try doing a transcription.  You will receive a notice if the Obsidian Transcriber Service can't be reached.
</div>
#### Prerequisites
1. **Docker**: Ensure Docker is installed on your system. You can download and install it from the [Docker website](https://www.docker.com/products/docker-desktop).

#### Steps to Set Up the Service

1. **Pull the Docker Image**
   Pull the latest Docker image for the Obsidian Transcriber Service from Docker Hub:
   ```sh
   docker pull your_dockerhub_username/obsidian-transcriber-service:latest




## 🐞 Troubleshooting

### Fail to Connect to Transcriber Service
When the plugin cannot connect to the FastAPI transcriber service, it puts up a notice:

![fastapi service not available](docs/images/notice_fastapi_service_not_available_.jpg)


The endpoint used to connected to the service is defined within the settings UI.  Go to settings and check the Obsidian Transcriber Service API endpoint URL.

<div style="text-align: center;"> <img src="docs/images/obsidian-transcriber-settings-api-endpoint.jpg" alt="api endpoint in settings" width="800"> </div>

#### Running Locally
The default endpoint, `http://127.0.0.1:8000/api/v1/process_audio`, assumes you are running the `obsidian-transcriber-plugin` locally.

If you are running locally, make sure your endpoint url is the same as `http://127.0.0.1:8000/api/v1/process_audio`.

Go to your web browser and try the health check endpoint: `http://127.0.0.1:8000/api/v1/health`.  If the page lets you know the site can't be reached, the next step is to figure out why the fastapi transcriber service is not running locally.
