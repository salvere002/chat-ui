import { buildStudioFileBlock } from './studioTokens';

export interface StudioFileMeta {
  name: string;
  language?: string;
}

export interface StudioParseCallbacks {
  onFileStart: (file: StudioFileMeta) => void;
  onFileChunk: (file: StudioFileMeta, chunk: string) => void;
  onFileEnd: (file: StudioFileMeta) => void;
}

const FILE_START = '<studio:file';
const FILE_END = '</studio:file>';

const parseAttributes = (input: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match = regex.exec(input);
  while (match) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? '';
    attrs[key] = value;
    match = regex.exec(input);
  }
  return attrs;
};

export class StudioStreamParser {
  private buffer = '';
  private mode: 'text' | 'file' = 'text';
  private displayText = '';
  private currentFile: StudioFileMeta | null = null;
  private callbacks: StudioParseCallbacks;

  constructor(callbacks: StudioParseCallbacks) {
    this.callbacks = callbacks;
  }

  reset() {
    this.buffer = '';
    this.mode = 'text';
    this.displayText = '';
    this.currentFile = null;
  }

  getDisplayText() {
    return this.displayText;
  }

  process(delta: string) {
    if (!delta) return this.displayText;
    this.buffer += delta;
    this.consumeBuffer();
    return this.displayText;
  }

  private consumeBuffer() {
    while (this.buffer.length > 0) {
      if (this.mode === 'text') {
        const startIndex = this.buffer.indexOf(FILE_START);
        if (startIndex === -1) {
          this.displayText += this.buffer;
          this.buffer = '';
          return;
        }

        if (startIndex > 0) {
          this.displayText += this.buffer.slice(0, startIndex);
          this.buffer = this.buffer.slice(startIndex);
        }

        const tagEndIndex = this.buffer.indexOf('>');
        if (tagEndIndex === -1) {
          return;
        }

        const tagContent = this.buffer.slice(FILE_START.length, tagEndIndex);
        const attrs = parseAttributes(tagContent);
        const fileName = attrs.name?.trim();
        if (!fileName) {
          this.displayText += this.buffer.slice(0, tagEndIndex + 1);
          this.buffer = this.buffer.slice(tagEndIndex + 1);
          continue;
        }

        const language = (attrs.lang || attrs.language || '').trim() || undefined;
        this.currentFile = { name: fileName, language };
        this.callbacks.onFileStart(this.currentFile);
        this.displayText += buildStudioFileBlock(fileName);

        this.buffer = this.buffer.slice(tagEndIndex + 1);
        this.mode = 'file';
        continue;
      }

      const endIndex = this.buffer.indexOf(FILE_END);
      if (endIndex === -1) {
        if (this.currentFile) {
          this.callbacks.onFileChunk(this.currentFile, this.buffer);
        }
        this.buffer = '';
        return;
      }

      if (endIndex > 0 && this.currentFile) {
        this.callbacks.onFileChunk(this.currentFile, this.buffer.slice(0, endIndex));
      }

      if (this.currentFile) {
        this.callbacks.onFileEnd(this.currentFile);
      }
      this.currentFile = null;
      this.buffer = this.buffer.slice(endIndex + FILE_END.length);
      this.mode = 'text';
    }
  }
}
