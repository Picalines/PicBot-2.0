import { promisify } from "util";
import * as fs from "fs";

export const appendFileAsync = promisify(fs.appendFile);
export const writeFileAsync = promisify(fs.writeFile);
export const readFileAsync = promisify(fs.readFile);
export const readdirAsync = promisify(fs.readdir);
export const existsAsync = promisify(fs.exists);
export const mkdirAsync = promisify(fs.mkdir);
export const lstatAsync = promisify(fs.lstat);

export const isDirectory = async (path: string) => (await lstatAsync(path)).isDirectory();

export async function readJsonAsync<T = any>(path: string): Promise<T> {
    return JSON.parse((await readFileAsync(path)).toString()) as T;
}

export async function checkFolderAsync(path: string) {
    if (!(await existsAsync(path))) {
        await mkdirAsync(path);
    }
}