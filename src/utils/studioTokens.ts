export const STUDIO_FILE_TOKEN_REGEX = /^\[\[studio-file:([^\]]+)\]\]$/;

export const buildStudioFileToken = (fileName: string): string => {
  return `[[studio-file:${fileName}]]`;
};

export const buildStudioFileBlock = (fileName: string): string => {
  return `\n\n${buildStudioFileToken(fileName)}\n\n`;
};
