import type { MessageRequest, MessageResponse, StreamMessageChunk } from '../../types/api';

type JsonRecord = Record<string, unknown>;

const MAX_DEPTH = 4;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.length > 0 ? value : undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function readPath(value: unknown, path: readonly string[]): unknown {
  let current: unknown = value;
  for (let i = 0; i < path.length; i += 1) {
    if (!isRecord(current)) return undefined;
    current = current[path[i]];
  }
  return current;
}

function collectTextFromArray(items: unknown[], depth: number): string | undefined {
  const parts: string[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const text = extractText(item, depth + 1);
    if (text) parts.push(text);
  }

  if (parts.length === 0) return undefined;
  return parts.join('');
}

export function extractText(value: unknown, depth: number = 0): string | undefined {
  if (depth > MAX_DEPTH) return undefined;

  const primitive = toStringValue(value);
  if (primitive) return primitive;

  if (Array.isArray(value)) {
    return collectTextFromArray(value, depth);
  }

  if (!isRecord(value)) return undefined;

  const directPaths: ReadonlyArray<readonly string[]> = [
    ['text'],
    ['delta'],
    ['content'],
    ['output_text'],
    ['message', 'text'],
    ['message', 'content'],
    ['message', 'delta'],
    ['artifact', 'text'],
    ['result', 'text'],
    ['result', 'output_text'],
    ['response', 'text'],
    ['data', 'text'],
    ['data', 'content'],
    ['payload', 'text'],
    ['payload', 'content'],
    ['state', 'text'],
    ['state', 'content'],
  ];

  for (let i = 0; i < directPaths.length; i += 1) {
    const candidate = readPath(value, directPaths[i]);
    if (Array.isArray(candidate)) {
      const joined = collectTextFromArray(candidate, depth + 1);
      if (joined) return joined;
      continue;
    }

    const candidateText = extractText(candidate, depth + 1);
    if (candidateText) return candidateText;
  }

  const content = value.content;
  if (Array.isArray(content)) {
    for (let i = 0; i < content.length; i += 1) {
      const part = content[i];
      if (!isRecord(part)) continue;
      const partType = String(part.type ?? '').toLowerCase();
      if (partType.includes('text') || partType === '' || partType === 'content') {
        const partText = extractText(part.text ?? part.delta ?? part.content ?? part.value, depth + 1);
        if (partText) return partText;
      }
    }
  }

  return undefined;
}

export function extractThinking(value: unknown): string | undefined {
  const paths: ReadonlyArray<readonly string[]> = [
    ['thinking'],
    ['reasoning'],
    ['thought'],
    ['delta', 'reasoning'],
    ['message', 'reasoning'],
    ['payload', 'thinking'],
    ['state', 'reasoning'],
  ];

  for (let i = 0; i < paths.length; i += 1) {
    const text = extractText(readPath(value, paths[i]));
    if (text) return text;
  }

  return undefined;
}

export function extractImageUrl(value: unknown): string | undefined {
  const paths: ReadonlyArray<readonly string[]> = [
    ['imageUrl'],
    ['image_url'],
    ['image', 'url'],
    ['result', 'imageUrl'],
    ['result', 'image_url'],
    ['message', 'imageUrl'],
    ['message', 'image_url'],
    ['artifact', 'imageUrl'],
    ['artifact', 'image_url'],
    ['data', 'imageUrl'],
    ['data', 'image_url'],
  ];

  for (let i = 0; i < paths.length; i += 1) {
    const candidate = readPath(value, paths[i]);
    const text = toStringValue(candidate);
    if (text) return text;
  }

  if (isRecord(value) && Array.isArray(value.content)) {
    for (let i = 0; i < value.content.length; i += 1) {
      const part = value.content[i];
      if (!isRecord(part)) continue;
      const partType = String(part.type ?? '').toLowerCase();
      if (!partType.includes('image')) continue;
      const url = toStringValue(part.url ?? part.imageUrl ?? part.image_url);
      if (url) return url;
    }
  }

  return undefined;
}

export function extractErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;

  const errorPaths: ReadonlyArray<readonly string[]> = [
    ['error'],
    ['error', 'message'],
    ['message'],
    ['detail'],
    ['details'],
  ];

  for (let i = 0; i < errorPaths.length; i += 1) {
    const candidate = readPath(value, errorPaths[i]);
    const text = extractText(candidate);
    if (text) return text;
  }

  return undefined;
}

function stringIncludesAny(value: string, candidates: readonly string[]): boolean {
  const lower = value.toLowerCase();
  for (let i = 0; i < candidates.length; i += 1) {
    if (lower.includes(candidates[i])) return true;
  }
  return false;
}

export function isTerminalEvent(value: unknown): boolean {
  if (!isRecord(value)) return false;

  const boolPaths: ReadonlyArray<readonly string[]> = [
    ['complete'],
    ['completed'],
    ['done'],
    ['isComplete'],
    ['is_completed'],
    ['final'],
    ['isFinal'],
  ];

  for (let i = 0; i < boolPaths.length; i += 1) {
    const candidate = readPath(value, boolPaths[i]);
    if (candidate === true) return true;
  }

  const statePaths: ReadonlyArray<readonly string[]> = [
    ['event'],
    ['type'],
    ['name'],
    ['status'],
    ['state'],
    ['run', 'status'],
  ];

  const terminalWords = [
    'complete',
    'completed',
    'done',
    'final',
    'finished',
    'end',
    'terminated',
    'run_finished',
    'run_completed',
  ] as const;

  for (let i = 0; i < statePaths.length; i += 1) {
    const candidate = toStringValue(readPath(value, statePaths[i]));
    if (!candidate) continue;
    if (stringIncludesAny(candidate, terminalWords)) return true;
  }

  return false;
}

export function normalizeMessageResponse(raw: unknown): MessageResponse {
  if (isRecord(raw) && raw.error) {
    const error = extractErrorMessage(raw.error) ?? extractErrorMessage(raw) ?? 'Protocol request failed';
    throw new Error(error);
  }

  const text = extractText(raw) ?? '';
  const imageUrl = extractImageUrl(raw);
  const thinking = extractThinking(raw);

  return {
    text,
    ...(imageUrl ? { imageUrl } : {}),
    ...(thinking ? { thinking } : {}),
  };
}

export function normalizeGenericChunk(raw: unknown): StreamMessageChunk | null {
  if (isRecord(raw) && raw.error) {
    const message = extractErrorMessage(raw.error) ?? extractErrorMessage(raw) ?? 'Protocol stream error';
    throw new Error(message);
  }

  const text = extractText(raw);
  const imageUrl = extractImageUrl(raw);
  const thinking = extractThinking(raw);
  const complete = isTerminalEvent(raw);

  if (!text && !imageUrl && !thinking && !complete) return null;

  return {
    ...(text ? { text } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(thinking ? { thinking, thinkingComplete: false } : {}),
    ...(complete ? { complete } : {}),
  };
}

function toHistoryItems(request: MessageRequest) {
  if (!Array.isArray(request.history) || request.history.length === 0) return undefined;
  return request.history.map((item) => ({
    role: item.role,
    content: item.content,
    parts: [{ type: 'text', text: item.content }],
  }));
}

export function toA2APayload(request: MessageRequest): Record<string, unknown> {
  return {
    message: {
      role: 'user',
      content: request.text,
      parts: [{ type: 'text', text: request.text }],
    },
    history: toHistoryItems(request),
    files: request.files,
    metadata: {
      responseMessageId: request.responseMessageId,
      protocol: 'a2a',
    },
  };
}

export function toAgUiPayload(request: MessageRequest): Record<string, unknown> {
  const history = toHistoryItems(request) ?? [];

  return {
    input: request.text,
    message: request.text,
    messages: [
      ...history,
      {
        role: 'user',
        content: request.text,
      },
    ],
    attachments: request.files,
    metadata: {
      responseMessageId: request.responseMessageId,
      protocol: 'ag-ui',
    },
  };
}

function eventType(raw: unknown): string {
  if (!isRecord(raw)) return '';
  const value =
    toStringValue(raw.type) ??
    toStringValue(raw.event) ??
    toStringValue(raw.name) ??
    toStringValue(raw.status) ??
    '';
  return value.toLowerCase();
}

export function mapA2AChunk(raw: unknown): StreamMessageChunk | null {
  const mapped = normalizeGenericChunk(raw);
  if (mapped) return mapped;

  if (!isRecord(raw)) return null;

  const type = eventType(raw);
  if (!type) return null;

  if (type.includes('message') && (type.includes('end') || type.includes('complete') || type.includes('final'))) {
    return { complete: true };
  }

  return null;
}

export function mapAgUiChunk(raw: unknown): StreamMessageChunk | null {
  if (isRecord(raw) && raw.error) {
    const message = extractErrorMessage(raw.error) ?? extractErrorMessage(raw) ?? 'AG-UI stream error';
    throw new Error(message);
  }

  const type = eventType(raw).toUpperCase();
  const generic = normalizeGenericChunk(raw);

  if (type.includes('RUN_FINISHED') || type.includes('RUN_COMPLETED')) {
    return { ...(generic ?? {}), complete: true };
  }

  if (type.includes('TEXT_MESSAGE_CONTENT') || type.includes('TEXT_DELTA')) {
    const text = extractText(raw);
    if (!text) return generic;
    return { ...(generic ?? {}), text };
  }

  if (type.includes('THINKING') || type.includes('REASONING')) {
    const thinking = extractThinking(raw);
    if (!thinking) return generic;
    return { ...(generic ?? {}), thinking, thinkingComplete: false };
  }

  return generic;
}
