import { promisify } from "util";
import * as fs from "fs";

export const appendFile = fs.promises.appendFile;
export const writeFile = fs.promises.writeFile;
export const readFile = fs.promises.readFile;
export const readdir = fs.promises.readdir;
export const exists = promisify(fs.exists);
export const mkdir = fs.promises.mkdir;
export const lstat = fs.promises.lstat;

export const isDirectory = async (path: string) => (await lstat(path)).isDirectory();

export async function readJson<T = any>(path: string): Promise<T> {
    return JSON.parse((await readFile(path)).toString()) as T;
}

export async function checkFolder(path: string) {
    if (!(await exists(path))) {
        await mkdir(path);
    }
}