/**
 * @public
 * Observer pattern for subscriptions
 */
export interface Observer<T> {
    next: (value: T) => void;
    error: (err: unknown) => void;
    complete: () => void;
}

/**
 * @public
 * Unsubscribe function
 */
export interface Unsubscribable {
    unsubscribe: () => void;
}

/**
 * @public
 * Observable implementation for subscriptions
 */
export class Observable<T> {
    constructor(
        private subscribeFn: (observer: Observer<T>) => Unsubscribable | (() => void)
    ) { }

    subscribe(observer: Partial<Observer<T>>): Unsubscribable {
        const fullObserver: Observer<T> = {
            next: observer.next || (() => { }),
            error: observer.error || (() => { }),
            complete: observer.complete || (() => { }),
        };

        const teardown = this.subscribeFn(fullObserver);

        return {
            unsubscribe: () => {
                if (typeof teardown === 'function') {
                    teardown();
                } else {
                    teardown.unsubscribe();
                }
            },
        };
    }
}

/**
 * @public
 * Create an observable from a subscribe function
 */
export function observable<T>(
    subscribe: (observer: Observer<T>) => Unsubscribable | (() => void)
): Observable<T> {
    return new Observable(subscribe);
}
