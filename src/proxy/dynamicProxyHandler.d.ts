import type { IncomingMessage, ServerResponse } from 'node:http';

export function handleProxyRequest(
  req: IncomingMessage,
  res: ServerResponse,
  logger?: { error?: (msg: string) => void; warn?: (msg: string) => void }
): void;

