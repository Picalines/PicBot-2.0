export function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

export interface ISerializeable<TFrom, TLoadReturnV = void> {
    load(from: TFrom): TLoadReturnV;
    serialize(): TFrom;
}

export class Property<TType> implements ISerializeable<string> {
    private _name: string;
    value: TType;

    get name(): string { return this.name; }

    constructor(name: string, value: TType) {
        this._name = name;
        this.value = value;
    }

    load(from: string): void {
        let data = JSON.parse(from);
        this._name = data.name;
    }
    
    serialize(): string {
        return JSON.stringify({
            name: this._name,
            value: this.value
        });
    }
}