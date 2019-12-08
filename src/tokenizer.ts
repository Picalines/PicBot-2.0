export interface IReadOnlyToken<T extends string = string> {
    readonly type: T;
    readonly value: string;
    readonly position: number;
}

export class Token<T extends string = string> implements IReadOnlyToken<T> {
    public readonly type: T;
    public value: string;
    public position: number;

    constructor(type: T, value: string, pos: number) {
        this.type = type;
        this.value = value;
        this.position = pos;
    }
}

export class TokenDefinition<T extends string = string> {
    public readonly regex: RegExp;
    public readonly type: T;

    constructor(type: T, regex: RegExp) {
        this.type = type;
        this.regex = regex;
    }
}

export class Tokenizer<T extends string = string> {
    private tokenDefs: TokenDefinition<T>[];

    constructor(tokenDefs: { [type in T]: RegExp }) {
        this.tokenDefs = [];
        for (let defType in tokenDefs) {
            this.tokenDefs.push(new TokenDefinition(defType, tokenDefs[defType]));
        }
    }

    tokenize(value: string): Token<T>[] {
        let tokens: Token<T>[] = [];

        for (var i = 0; i < value.length; i++) {
            var result = this.read_token(value, i);
            if (result != null) {
                tokens.push(result);
                i += result.value.length - 1;
            }
        }

        return tokens;
    }

    tokeinizeReadOnly(value: string): IReadOnlyToken<T>[] {
        return this.tokenize(value);
    }

    private read_token(value: string, pos: number): Token<T> | null {
        for (let i in this.tokenDefs) {
            let def = this.tokenDefs[i];
            
            let sliced = value.slice(pos);
            let result = sliced.match(def.regex);
            if (result != null && sliced.startsWith(result[0])) {
                return new Token(def.type, result[0], pos);
            }
        }
        return null;
    }
}