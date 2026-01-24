import type { TRPCErrorCode } from './errorCodes';
import { TRPCError } from './errors';

/**
 * Maps internal error codes to standard HTTP status codes.
 * @internal
 */
export function getHTTPStatusCode(code: TRPCErrorCode): number {
  switch (code) {
    case 'PARSE_ERROR':
      return 400;
    case 'BAD_REQUEST':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'METHOD_NOT_SUPPORTED':
      return 405;
    case 'TIMEOUT':
      return 408;
    case 'CONFLICT':
      return 409;
    case 'PRECONDITION_FAILED':
      return 412;
    case 'PAYLOAD_TOO_LARGE':
      return 413;
    case 'UNPROCESSABLE_CONTENT':
      return 422;
    case 'TOO_MANY_REQUESTS':
      return 429;
    case 'CLIENT_CLOSED_REQUEST':
      return 499;
    case 'INTERNAL_SERVER_ERROR':
      return 500;
    case 'NOT_IMPLEMENTED':
      return 501;
    default:
      return 500;
  }
}

/**
 * Transforms a TRPCError into a standardized response envelope.
 * @internal
 */
export function transformTRPCResponse(err: TRPCError, path?: string) {
  return {
    error: {
      message: err.message,
      code: err.numericCode,
      data: {
        code: err.code,
        httpStatus: getHTTPStatusCode(err.code),
        path,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
    },
  };
}
