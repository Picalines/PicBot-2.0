import * as util from "util";
import * as fs from "fs";

const promisify = util.promisify;

export const appendFileAsync = promisify(fs.appendFile);
export const writeFileAsync = promisify(fs.writeFile);
export const readFileAsync = promisify(fs.readFile);
export const readdirAsync = promisify(fs.readdir);
export const existsAsync = promisify(fs.exists);