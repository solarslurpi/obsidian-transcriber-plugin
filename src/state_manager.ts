import { Frontmatter } from './utils';
import { Chapter } from './process_audio';


export interface ContentState {
    key: string;
    basename: string;
    frontmatter: Frontmatter;
    numChapters: number;
    chapters: Chapter[];
}


export class StateManager {

    private emptyFrontmatter: Frontmatter = {
        audio_source: '',
        title: '',
        tags: '',
        description: '',
        uploader_id: '',
        channel: '',
        upload_date: '',
        duration: '',
        download_time: '',
        transcription_time: '',
        audio_quality: '',

    };

    private state: ContentState;
    private logger: any;


    constructor(logger:any) {
        this.logger = logger
        this.resetState();
    }
    setProperty<K extends keyof ContentState>(key: K, value: ContentState[K]): void {
        this.state = {
            ...this.state,
            [key]: value
        };
        this.logger.debug(`process_audio.setProperty: Setting ${key}`);
    }

    getProperty<K extends keyof ContentState>(key: K): ContentState[K] {
        const value = this.state[key];
        this.logger.debug(`process_audio.getProperty:  ${key} `);
        return value;
    }

    getMissingProperties(): string[] {
        const missingProperties: string[] = [];

        if (this.state.key === '') {
            missingProperties.push("key");
        }
        if (this.state.basename === '') {
            missingProperties.push("basename");
        }
        if (this.state.numChapters === 0) {
            missingProperties.push("num_chapters");
            // If there the number of chapters are not known, the chapters themselve are also not known.
            missingProperties.push("chapters");
        // numChapters will always be positive, as we all should.  Go get 'em numChapters!
        } else if (!this.checkChaptersComplete()) {
            missingProperties.push("chapters");
        }
        if (Object.keys(this.emptyFrontmatter).every(key => this.state.frontmatter[key] === this.emptyFrontmatter[key])) {
            missingProperties.push("frontmatter");
        }

        return missingProperties;
    }

    removeMissingProperty(property: string) {
            const missingProperties = this.getMissingProperties();
            const index = missingProperties.indexOf(property);
            if (index > -1) {
                missingProperties.splice(index, 1);
            }
        };

    addChapter(chapter: any) {
        this.state.chapters.push(chapter);
    }

    resetState() {
        this.state = {
            key: '',
            basename: '',
            frontmatter: this.emptyFrontmatter,
            numChapters: 0,
            chapters: []
        };
    }

    checkChaptersComplete(): boolean {
        const totalChaptersInState = this.state.chapters.length;
        if (totalChaptersInState < this.state.numChapters || this.state.numChapters == 0) { // The or check happens when chapters are received prior to numChapters.
            return false;
        }
        for (let i = 1; i <= this.state.numChapters; i++) {
            // check if there is a chapter with a chapter number 1 through num_chapters. This means there is text available for each chapter.
            if (!this.state.chapters.some(chapter => chapter.number === i)) {
                return false;
            }
        }
        return true;
    }
}
