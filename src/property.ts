import { ISerializeable } from "./utils";

export class Property<TType> implements ISerializeable {
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

export class DataObject<TProp = string | number | boolean> implements ISerializeable {
    readonly properties: Property<TProp>[];

    constructor() {
        this.properties = [];
    }

    getProperty(name: string): Property<TProp> | undefined {
        for (let i in this.properties) {
            let p = this.properties[i];
            if (p.name == name) {
                return p;
            }
        }
        return undefined;
    }

    setProperty(name: string, value: TProp) {
        const existingProp = this.getProperty(name);
        if (existingProp) {
            existingProp.value = value;
        }
        else {
            this.properties.push(new Property(name, value));
        }
    }

    removeProperty(name: string) {
        const prop = this.getProperty(name);
        if (prop) {
            delete this.properties[this.properties.indexOf(prop)];
        }
    }

    serialize(): {} {
        let props: {}[] = []
        this.properties.forEach(p => props.push(p.serialize()))
        return {
            properties: props
        }
    }
}