export function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

export const nameof = <T>(name: keyof T): string => name.toString();

export interface ISerializeable {
    serialize(): {};
}