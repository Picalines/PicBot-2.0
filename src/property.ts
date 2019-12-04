import { ISerializeable } from "./utils";

export interface IProperty<Type> {
    name: string;
    value: Type;
}

export class Property<Type> implements IProperty<Type>, ISerializeable {
    name: string
    value: Type;

    constructor(name: string, value: Type) {
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

export class DataObject<TProp = string | number | boolean> implements ISerializeable {
    readonly properties: Property<TProp>[];

    constructor() {
        this.properties = [];
    }

    getProperty<Type extends TProp=TProp>(name: string, defaultValue?: Type): Property<Type> | undefined {
        for (let i in this.properties) {
            let p = this.properties[i];
            if (p.name == name) {
                return p as Property<Type>;
            }
        }
        if (defaultValue != undefined) {
            this.properties.push(new Property(name, defaultValue));
            return this.properties[this.properties.length-1] as Property<Type>;
        }
        return undefined;
    }

    setProperty(name: string, value: TProp): Property<TProp> {
        for (let i in this.properties) {
            let p = this.properties[i];
            if (p.name == name) {
                p.value = value;
                return p;
            }
        }
        this.properties.push(new Property(name, value));
        return this.properties[this.properties.length-1];
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
        let props: {}[] = []
        this.properties.forEach(p => props.push(p.serialize()))
        return props;
    }
}