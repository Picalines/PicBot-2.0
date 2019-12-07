import { ISerializeable } from "./utils";

export type PropertyType = number | string | boolean;

export interface IProperty<T extends PropertyType = PropertyType> {
    name: string;
    value: T;
}

export class Property<T extends PropertyType = PropertyType> implements IProperty<T>, ISerializeable {
    name: string;
    value: T;

    constructor(name: string, value: T) {
        this.name = name;
        this.value = value;
    }
    
    serialize(): IProperty<T> {
        return {
            "name": this.name,
            "value": this.value
        }
    }
}

export function deserializeProperty<T extends PropertyType>(data: any): Property<T> {
    if (data != undefined) {
        return new Property<T>(String(data.name), data.value);
    }
    throw new Error("invalid property data");
}

export class DataObject implements ISerializeable {
    readonly properties: Property<PropertyType>[];

    constructor(props?: IProperty<PropertyType>[]) {
        this.properties = [];
        if (props != undefined) {
            props.forEach(p => this.properties.push(deserializeProperty(p)))
        }
    }

    getProperty<T extends PropertyType>(name: string, defaultValue: T): Property<T>;
    getProperty<T extends PropertyType>(name: string, defaultValue?: T): Property<T> | undefined;
    getProperty<T extends PropertyType>(name: string, defaultValue: any): any {
        for (let i in this.properties) {
            let p = this.properties[i];
            if (p.name == name && p) {
                return p as Property<T>;
            }
        }
        if (defaultValue != undefined) {
            this.properties.push(new Property(name, defaultValue));
            return this.properties[this.properties.length-1] as Property<T>;
        }
        throw new Error(`Property '${name}' is not defined`);
    }

    setProperty<T extends PropertyType>(name: string, value: T): Property<T> {
        for (let i in this.properties) {
            let p = this.properties[i];
            if (p.name == name) {
                p.value = value;
                return p as Property<T>;
            }
        }
        this.properties.push(new Property(name, value));
        return this.properties[this.properties.length-1] as Property<T>;
    }

    removeProperty(name: string) {
        const prop = this.getProperty(name);
        if (prop) {
            delete this.properties[this.properties.indexOf(prop)];
        }
    }

    hasProperty(name: string): boolean {
        for (let i in this.properties) {
            if (this.properties[i].name == name) return true;
        }
        return false;
    }

    serialize(): {} {
        let props: IProperty<PropertyType>[] = []
        this.properties.forEach(p => props.push(p.serialize()))
        return props;
    }
}