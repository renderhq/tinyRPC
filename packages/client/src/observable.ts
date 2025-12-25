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
            next: observer.next || (() => { }),
            error: observer.error || (() => { }),
            complete: observer.complete || (() => { }),
        };

        const teardown = this._subscribe(fullObserver);

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
 */
export function observable<T>(
    subscribe: (observer: Observer<T>) => Unsubscribable | (() => void)
): Observable<T> {
    return new Observable(subscribe);
}
