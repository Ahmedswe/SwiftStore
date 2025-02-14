/*
    Copyright Abdullah Rajput and Muhammad Ahmed - 2025 All Rights Reserved
*/

type Listener<T>    = (state: T) => void;
type Middleware<T>  = (state: T, next: (newState: T) => void) => void;
type Selector<T, U> = (state: T) => U;

class Store<T> {
    private state: T;
    private listeners:   Set<Listener<T>> = new Set();
    private middlewares: Middleware<T>[] = [];

    constructor(initialState: T) {
        this.state = initialState;
    }

    /**
     * Get the current state.
     */
    getState(): T {
        return this.state;
    }

    /**
     * Update the state immutably and notify subscribers.
     * Supports both direct object updates and updater functions.
     */
    setState(updater: Partial<T> | ((state: T) => Partial<T>)): void {
        const newState = typeof updater === "function" ? updater(this.state) : updater;
        const next = (finalState: T) => {
            this.state = { ...this.state, ...finalState };
            this.notify();
        };

        if (this.middlewares.length > 0) {
            let index = 0;
            const runMiddleware = (state: T) => {
                if (index < this.middlewares.length) {
                    this.middlewares[index++](state, runMiddleware);
                } else {
                    next(state);
                }
            };
            runMiddleware({ ...this.state, ...newState });
        } else {
            next({ ...this.state, ...newState });
        }
    }

    /**
     * Asynchronously updates the state and notifies subscribers.
     */
    async setStateAsync(updater: Partial<T> | ((state: T) => Promise<Partial<T>>)): Promise<void> {
        const newState = typeof updater === "function" ? await updater(this.state) : updater;
        this.setState(newState);
    }

    /**
     * Subscribe to state changes. Returns an unsubscribe function.
     */
    subscribe(listener: Listener<T>): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Subscribe to a specific slice of the state using a selector.
     * Only triggers when the selected value changes.
     */
    subscribeSelector<U>(selector: Selector<T, U>, listener: (selectedState: U) => void): () => void {
        let previousValue = selector(this.state);
        const wrappedListener = () => {
            const newValue = selector(this.state);
            if (newValue !== previousValue) {
                previousValue = newValue;
                listener(newValue);
            }
        };
        this.listeners.add(wrappedListener);
        return () => this.listeners.delete(wrappedListener);
    }

    /**
     * Adds middleware to intercept and modify state updates.
     */
    useMiddleware(middleware: Middleware<T>): void {
        this.middlewares.push(middleware);
    }

    /**
     * Notify all subscribers about state changes.
     */
    private notify(): void {
        this.listeners.forEach(listener => listener(this.state));
    }
}

/**
 * Factory function to create a new store.
 */
export function newSwiftStore<T>(initialState: T): Store<T> {
    return new Store<T>(initialState);
}