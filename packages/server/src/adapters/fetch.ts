import type { Router } from '../types';
import { TRPCError } from '../errors';
import { resolveHTTPResponse } from '../dispatch';
import { transformTRPCResponse, getHTTPStatusCode } from '../errorUtils';

export type FetchCreateContextFn<TRouter extends Router<any>> = (opts: {
  req: Request;
}) => any | Promise<any>;

/**
 * Common handler for Fetch-based environments (Edge, Cloudflare Workers, etc.)
 */
export async function fetchRequestHandler<TRouter extends Router<any>>(opts: {
  router: TRouter;
  req: Request;
  createContext?: FetchCreateContextFn<TRouter>;
  endpoint: string;
}): Promise<Response> {
  const { router, req, createContext, endpoint } = opts;

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(endpoint, '').replace(/^\//, '');
    const isBatch = url.searchParams.get('batch') === 'true';

    let input: any;
    if (req.method === 'GET') {
      const inputQuery = url.searchParams.get('input');
      try {
        input = inputQuery ? JSON.parse(inputQuery) : undefined;
      } catch {
        input = undefined;
      }
    } else if (req.method === 'POST') {
      input = await req.json().catch(() => ({}));
    }

    const ctx = createContext ? await createContext({ req }) : {};

    const { body, status, headers } = await resolveHTTPResponse({
      router,
      path,
      ctx,
      input,
      isBatch,
    });

    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
  } catch (err: any) {
    const error =
      err instanceof TRPCError
        ? err
        : new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message,
        });

    const response = transformTRPCResponse(error, 'unknown');
    return new Response(JSON.stringify(response), {
      status: getHTTPStatusCode(error.code),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
