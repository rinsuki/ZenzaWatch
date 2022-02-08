export class Emitter<
    Events extends {[key: string]: unknown[]} = {},
    PromiseEvents extends {[key: string]: unknown[]} = {},
> {
    on<Key extends keyof Events>(name: Key, callback: (...args: Events[Key]) => void): this;
    addEventListener<Key extends keyof Events>(name: Key, callback: (...args: Events[Key]) => void): this;
    off<Key extends keyof Events>(name: Key, callback: (...args: Events[Key]) => void): this;
    removeEventListener<Key extends keyof Events>(name: Key, callback: (...args: Events[Key]) => void): this;
    once<Key extends keyof Events>(name: Key, callback: (...args: Events[Key]) => void): this;
    clear(name: keyof Events)
    emit<Key extends keyof Events>(name: Key, ...args: Events[Key]): this;
    emitAsync<Key extends keyof Events>(name: Key, ...args: PromiseEvents[Key]): Promise<void>;

    promise<Key extends keyof PromiseEvents>(name: Key, callback: (...args: PromiseEvents[Key]) => Promise<void>): Promise<void>;
    emitResolve<Key extends keyof PromiseEvents>(name: Key, ...args: PromiseEvents[Key]): Promise<void>;
    emitReject<Key extends keyof PromiseEvents>(name: Key, ...args: any): Promise<void>;
    resetPromise(name: keyof PromiseEvents): void;

    hasPromise(name: keyof PromiseEvents): boolean;
}

export class Handler {}