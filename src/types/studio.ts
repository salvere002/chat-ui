export type StudioViewMode = 'code' | 'preview';

export interface StudioFileVersion {
  id: string;
  content: string;
  createdAt: Date;
}

export interface StudioFile {
  name: string;
  language?: string;
  versions: StudioFileVersion[];
  activeVersionId: string;
  viewMode: StudioViewMode;
}

export interface StudioChatState {
  files: Record<string, StudioFile>;
  order: string[];
  activeFileName?: string;
  panelCollapsed: boolean;
}
