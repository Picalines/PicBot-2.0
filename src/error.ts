import { ArgumentType, ArgumentEnumerator } from "./command";
import { Token } from "./tokenizer";

export class SyntaxError extends Error {
    constructor(token: Token<ArgumentType> | ArgumentEnumerator, message: string) {
        if (!(token instanceof Token)) {
            token = token.current();
        }
        if (token != undefined) {
            super(`синтаксическая ошибка на слове '${token.value}': ${message}`);
        }
        else {
            super(`синтаксическая ошибка: ${message}`);
        }
        this.name = "SyntaxError";
    }
}

export class MemberNotFound extends Error {
    constructor(id: string) {
        super(`участник сервера '${id}' не найден`);
        this.name = "MemberNotFound";
    }
}

export class MemberIsBot extends Error {
    constructor(id: string) {
        super(`участник сервера '${id}' бот`);
        this.name = "MemberIsBot";
    }
}

export class AssetNotFound extends Error {
    constructor(path: string) {
        super(`ассет '${path}' не найден`);
        this.name = "AssetNotFound";
    }
}

export class DeserializationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DeserializationError";
    }
}

export class NullReferenceError extends Error {
    constructor(variable: string) {
        super(`${variable} is null or undefined`);
        this.name = "NullReferenceError";
    }
}