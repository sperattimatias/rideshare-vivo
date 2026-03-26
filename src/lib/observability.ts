import { supabase } from './supabase';
import { AppError, toAppError } from './errors';
import type { Json } from './database.types';

export type OperationalDomain = 'PAYMENTS' | 'OAUTH' | 'TRIP_ACCEPTANCE' | 'ADMIN';

export function getTraceId(): string {
  return crypto.randomUUID();
}

export function logClientEvent(event: string, payload: Record<string, unknown>): void {
  console.info('[client-event]', JSON.stringify({ event, timestamp: new Date().toISOString(), ...payload }));
}

export function logClientError(event: string, error: unknown, payload: Record<string, unknown> = {}): AppError {
  const appError = toAppError(error, {
    code: 'UNEXPECTED_ERROR',
    kind: 'TECHNICAL',
    userMessage: 'Ocurrió un error inesperado. Intentá nuevamente.',
  });

  console.error('[client-error]', JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    code: appError.code,
    kind: appError.kind,
    message: appError.message,
    ...payload,
  }));

  return appError;
}

export async function logOperationalEvent(params: {
  domain: OperationalDomain;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  entityId?: string;
  metadata?: Json;
}) {
  const { error } = await supabase.rpc('log_operational_event', {
    p_domain: params.domain,
    p_action: params.action,
    p_status: params.status,
    p_entity_id: params.entityId ?? null,
    p_metadata: params.metadata ?? {},
  });

  if (error) {
    throw new AppError({
      code: 'OP_EVENT_LOG_FAILED',
      kind: 'TECHNICAL',
      userMessage: 'No se pudo registrar el evento operativo.',
      message: error.message,
      details: error,
    });
  }
}
