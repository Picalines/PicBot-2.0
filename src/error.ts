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

export class NotFoundError extends Error {
    constructor(name: string, item: string) {
        super(`${name} '${item}' не найден`);
        this.name = "NotFoundError";
    }
}

export class MemberNotFoundError extends NotFoundError {
    constructor(id: string) {
        super('участник сервера', id);
        this.name = "MemberNotFoundError";
    }
}

export class RoleNotFoundError extends NotFoundError {
    constructor(id: string) {
        super('роль', id);
        this.name = "RoleNotFoundError";
    }
}

export class MemberIsBotError extends Error {
    constructor(id: string) {
        super(`участник сервера '${id}' бот`);
        this.name = "MemberIsBotError";
    }
}

export class AssetNotFoundError extends NotFoundError {
    constructor(path: string) {
        super('ассет', path);
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