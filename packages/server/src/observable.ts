/**
 * @public
 */
export interface Observer<T> {
    next: (value: T) => void;
    error: (err: unknown) => void;
    complete: () => void;
}

/**
 * @public
 */
export interface Unsubscribable {
    unsubscribe: () => void;
}

/**
 * @public
 */
export class Observable<T> {
    constructor(
        private _subscribe: (observer: Observer<T>) => Unsubscribable | (() => void)
    ) { }

    subscribe(observer: Partial<Observer<T>>): Unsubscribable {
        const fullObserver: Observer<T> = {
            next: (v) => observer.next?.(v),
            error: (e) => observer.error?.(e),
            complete: () => observer.complete?.(),
        };

        const teardown = this._subscribe(fullObserver);

        return {
            unsubscribe: () => {
                if (typeof teardown === 'function') {
                    teardown();
                } else if (teardown && 'unsubscribe' in teardown) {
                    teardown.unsubscribe();
                }
            },
        };
    }

    pipe<R>(...ops: Array<(obs: Observable<any>) => Observable<any>>): Observable<R> {
        return ops.reduce((acc, op) => op(acc), this as any) as Observable<R>;
    }
}

/**
 * Operators
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
 * @public
 */
export function observable<T>(
    subscribe: (observer: Observer<T>) => Unsubscribable | (() => void)
): Observable<T> {
    return new Observable(subscribe);
}
