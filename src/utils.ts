export function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

export interface ISerializeable<TTo> {
    serialize(): TTo;
}

export class Property<TType> implements ISerializeable<{}> {
    name: string
    value: TType;

    constructor(name: string, value: TType) {
        this.name = name;
        this.value = value;
    }
    
    serialize(): {} {
        return {
            "name": this.name,
            "value": this.value
        }
    }
}