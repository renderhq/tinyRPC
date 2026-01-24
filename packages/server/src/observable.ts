/**
 * Lightweight, type-safe Observable implementation.
 * @public
 */
export interface Observer<T> {
  next: (value: T) => void;
  error: (err: unknown) => void;
  complete: () => void;
}

/**
 * Handle for an active subscription.
 * @public
 */
export interface Unsubscribable {
  unsubscribe: () => void;
}

/**
 * Core Observable class for handling streams of data.
 * @public
 */
export class Observable<T> {
  constructor(private _subscribe: (observer: Observer<T>) => Unsubscribable | (() => void)) { }

  /**
   * Subscribe to the observable stream.
   */
  subscribe(observer: Partial<Observer<T>>): Unsubscribable {
    let closed = false;

    const fullObserver: Observer<T> = {
      next: (v) => {
        if (!closed) observer.next?.(v);
      },
      error: (e) => {
        if (!closed) {
          closed = true;
          observer.error?.(e);
          cleanup();
        }
      },
      complete: () => {
        if (!closed) {
          closed = true;
          observer.complete?.();
          cleanup();
        }
      },
    };

    const teardown = this._subscribe(fullObserver);

    const cleanup = () => {
      if (typeof teardown === 'function') {
        teardown();
      } else if (teardown && 'unsubscribe' in teardown) {
        teardown.unsubscribe();
      }
    };

    // Store cleanup for internal use if needed, but for now we just return the handle
    (fullObserver as any).cleanup = cleanup;

    return {
      unsubscribe: () => {
        if (!closed) {
          closed = true;
          cleanup();
        }
      },
    };
  }

  private cleanup() {
    // This is a placeholder for more advanced lifecycle management if needed
  }

  /**
   * Functional composition for observable operators.
   */
  pipe<R>(...ops: Array<(obs: Observable<any>) => Observable<any>>): Observable<R> {
    return ops.reduce((acc, op) => op(acc), this as any) as Observable<R>;
  }
}

/**
 * Functional constructor for Observables.
 * @public
 */
export function observable<T>(
  subscribe: (observer: Observer<T>) => Unsubscribable | (() => void)
): Observable<T> {
  return new Observable(subscribe);
}

/**
 * Transforms values emitted by an observable.
 * @public
 */
export function map<T, R>(fn: (value: T) => R) {
  return (source: Observable<T>): Observable<R> => {
    return new Observable((observer) => {
      return source.subscribe({
        next: (value) => observer.next(fn(value)),
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      });
    });
  };
}

/**
 * Filters values emitted by an observable.
 * @public
 */
export function filter<T>(fn: (value: T) => boolean) {
  return (source: Observable<T>): Observable<T> => {
    return new Observable((observer) => {
      return source.subscribe({
        next: (value) => {
          if (fn(value)) {
            observer.next(value);
          }
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      });
    });
  };
}

/**
 * Side-effect operator for observables. Useful for logging.
 * @public
 */
export function tap<T>(fn: (value: T) => void) {
  return (source: Observable<T>): Observable<T> => {
    return new Observable((observer) => {
      return source.subscribe({
        next: (value) => {
          fn(value);
          observer.next(value);
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      });
    });
  };
}
