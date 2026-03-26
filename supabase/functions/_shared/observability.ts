export interface RequestContext {
  requestId: string;
  functionName: string;
}

export function createRequestContext(req: Request, functionName: string): RequestContext {
  return {
    requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
    functionName,
  };
}

export function logInfo(context: RequestContext, message: string, data: Record<string, unknown> = {}): void {
  console.info(JSON.stringify({ level: 'info', request_id: context.requestId, fn: context.functionName, message, ...data }));
}

export function logError(context: RequestContext, message: string, error: unknown, data: Record<string, unknown> = {}): void {
  console.error(JSON.stringify({
    level: 'error',
    request_id: context.requestId,
    fn: context.functionName,
    message,
    error_message: error instanceof Error ? error.message : String(error),
    ...data,
  }));
}
