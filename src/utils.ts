export function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

export const nameof = <T>(name: keyof T): string => name.toString();

export interface ISerializeable {
    serialize(): {};
}

export class Enumerator<T> {
    private collection: T[];
    private index: number;

    constructor(collection: T[], moveFirst: boolean = false) {
        this.collection = collection;
        this.index = -1;
        if (moveFirst) {
            this.moveNext();
        }
    }

    get current(): T {
        return this.collection[this.index];
    }

    get active(): boolean {
        return this.index < this.collection.length;
    }

    moveNext(): boolean {
        if (this.active) {
            this.index += 1;
            return this.active;
        }
        return false;
    }

    movePrevious(): boolean {
        if (this.index > 0) {
            this.index =- 1;
            return this.index == 0;
        }
        return false;
    }
}