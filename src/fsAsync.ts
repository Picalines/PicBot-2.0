import * as util from "util";
import * as fs from "fs";

const promisify = util.promisify;

export const appendFileAsync = promisify(fs.appendFile);
export const writeFileAsync = promisify(fs.writeFile);
export const readFileAsync = promisify(fs.readFile);
export const readdirAsync = promisify(fs.readdir);
export const existsAsync = promisify(fs.exists);
export const mkdirAsync = promisify(fs.mkdir);
export const lstatAsync = promisify(fs.lstat);

export const isDirectory = async (path: string) => (await lstatAsync(path)).isDirectory();

export async function checkFolderAsync(path: string) {
    if (!(await existsAsync(path))) {
        await mkdirAsync(path);
    }
}