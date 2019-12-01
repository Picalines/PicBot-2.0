export interface IReadOnlyToken {
    readonly type: string;
    readonly value: string;
    readonly position: number;
}

export class Token implements IReadOnlyToken {
    public readonly type: string;
    public value: string;
    public position: number;

    constructor(type: string, value: string, pos: number) {
        this.type = type;
        this.value = value;
        this.position = pos;
    }
}

export class TokenDefinition {
    public readonly regex: RegExp;
    public readonly type: string;

    constructor(type: string, regex: RegExp) {
        this.type = type;
        this.regex = regex;
    }
}

export type TokenDefinitionsDict = { [type: string]: RegExp }

export class Tokenizer {
    private tokenDefs: TokenDefinition[];

    constructor(tokenDefs: TokenDefinitionsDict) {
        this.tokenDefs = [];
        for (let defType in tokenDefs) {
            this.tokenDefs.push(new TokenDefinition(defType, tokenDefs[defType]));
        }
    }

    tokenize(value: string): Token[] {
        let tokens: Token[] = [];

        for (var i = 0; i < value.length; i++) {
            var result = this.read_token(value, i);
            if (result != null) {
                tokens.push(result);
                i += result.value.length - 1;
            }
        }

        return tokens;
    }

    private read_token(value: string, pos: number): Token | null {
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