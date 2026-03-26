export type AppErrorKind = 'BUSINESS' | 'TECHNICAL' | 'AUTH';

export interface AppErrorLike {
  message: string;
  code: string;
  kind: AppErrorKind;
  userMessage: string;
  details?: unknown;
}

export class AppError extends Error implements AppErrorLike {
  code: string;
  kind: AppErrorKind;
  userMessage: string;
  details?: unknown;

  constructor(params: {
    message: string;
    code: string;
    kind: AppErrorKind;
    userMessage: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.code = params.code;
    this.kind = params.kind;
    this.userMessage = params.userMessage;
    this.details = params.details;
  }
}

export function toAppError(error: unknown, fallback: Omit<AppErrorLike, 'message'>): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError({
      message: error.message,
      ...fallback,
      details: error,
    });
  }

  return new AppError({
    message: 'Unknown error',
    ...fallback,
    details: error,
  });
}

export function isBusinessCode(code: string): boolean {
  return [
    'TRIP_ALREADY_TAKEN',
    'TRIP_STATE_INVALID',
    'DRIVER_NOT_ENABLED',
    'DRIVER_ALREADY_ON_TRIP',
    'INVALID_TRIP_STATUS',
    'UNAUTHORIZED_PASSENGER',
  ].includes(code);
}
