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
export declare class Observable<T> {
    private _subscribe;
    constructor(_subscribe: (observer: Observer<T>) => Unsubscribable | (() => void));
    subscribe(observer: Partial<Observer<T>>): Unsubscribable;
    pipe<R>(...ops: Array<(obs: Observable<any>) => Observable<any>>): Observable<R>;
}
/**
 * Operators
 */
export declare function map<T, R>(fn: (value: T) => R): (source: Observable<T>) => Observable<R>;
export declare function filter<T>(fn: (value: T) => boolean): (source: Observable<T>) => Observable<T>;
/**
 * @public
 */
export declare function observable<T>(subscribe: (observer: Observer<T>) => Unsubscribable | (() => void)): Observable<T>;
//# sourceMappingURL=observable.d.ts.map