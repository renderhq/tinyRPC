import type { TRPCLink } from '../links';

/**
 * A link that logs operation timing and trace information to the console.
 * @public
 */
export function loggerLink(): TRPCLink {
  return (opts) => {
    const { op, next } = opts;

    const result = next(op);

    if (result instanceof Promise) {
      return result.then((res: any) => {
        if (res.trace) {
          const { durationMs, steps } = res.trace;
          const success = !res.result.error;

          const status = success ? 'SUCCESS' : 'FAILURE';

          console.groupCollapsed(
            `[tinyRPC] ${status}: ${op.type} ${op.path} (${durationMs.toFixed(2)}ms)`
          );

          if (steps && steps.length > 0) {
            console.table(
              steps.map((s: any) => ({
                Step: s.name,
                Duration: `${s.durationMs.toFixed(2)}ms`,
              }))
            );
          }

          if (res.result.error) {
            console.error('Operation Error:', res.result.error);
          }

          console.log(`Total Duration: ${durationMs.toFixed(2)}ms`);
          console.groupEnd();
        }
        return res;
      });
    }

    if (result && typeof result.subscribe === 'function') {
      console.log(`[tinyRPC] SUB: subscription ${op.path} initiated`);
      return result.pipe((observable: any) => ({
        subscribe: (observer: any) => {
          console.log(`[tinyRPC] SUB: subscription ${op.path} active`);
          return observable.subscribe({
            next: (data: any) => {
              console.log(`[tinyRPC] DATA: subscription ${op.path} event`, data);
              observer.next(data);
            },
            error: (err: any) => {
              console.error(`[tinyRPC] ERR: subscription ${op.path} error`, err);
              observer.error(err);
            },
            complete: () => {
              console.log(`[tinyRPC] END: subscription ${op.path} complete`);
              observer.complete();
            },
          });
        },
      }));
    }

    return result;
  };
}
