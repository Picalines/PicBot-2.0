export function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

export interface ISerializeable<TTo = {}> {
    serialize(): TTo;
}