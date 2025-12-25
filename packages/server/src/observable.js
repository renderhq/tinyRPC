/**
 * @public
 */
export class Observable {
    _subscribe;
    constructor(_subscribe) {
        this._subscribe = _subscribe;
    }
    subscribe(observer) {
        const fullObserver = {
            next: (v) => observer.next?.(v),
            error: (e) => observer.error?.(e),
            complete: () => observer.complete?.(),
        };
        const teardown = this._subscribe(fullObserver);
        return {
            unsubscribe: () => {
                if (typeof teardown === 'function') {
                    teardown();
                }
                else if (teardown && 'unsubscribe' in teardown) {
                    teardown.unsubscribe();
                }
            },
        };
    }
    pipe(...ops) {
        return ops.reduce((acc, op) => op(acc), this);
    }
}
/**
 * Operators
 */
export function map(fn) {
    return (source) => {
        return new Observable((observer) => {
            return source.subscribe({
                next: (value) => observer.next(fn(value)),
                error: (err) => observer.error(err),
                complete: () => observer.complete(),
            });
        });
    };
}
export function filter(fn) {
    return (source) => {
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
export function observable(subscribe) {
    return new Observable(subscribe);
}
//# sourceMappingURL=observable.js.map