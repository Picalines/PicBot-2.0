import * as fs from "./fsAsync";

export type LogType = "event" | "error" | "warning"

export abstract class Debug {
    private static datePattern = /\S{3} \d{2} \d{4} (\d{2}:?){3}/gm;

    static readonly logsPath = "./logs.txt";

    private static lastLogs = "";

    private static getDate(): string {
        const pat = /.+(\d+:){2}\d+/g;
        let res = pat.exec(Date());
        return res ? res.slice()[0] : ":/";
    }

    static Log(msg: any, type: LogType = "event") {
        let date = `[${this.getDate()}]`;
        let m = date + " - " + String(msg);

        switch (type) {
            default: throw new Error(`unsupported log type '${type}'`);
            case "event": break;
            case "error": m = "[ERROR] " + m;
            case "warning": m = "[WARNING] " + m;
        }

        console.log(m);
        this.lastLogs += m + "\n";
    }

    static async Save() {
        await fs.appendFileAsync(this.logsPath, this.lastLogs + "\n");
    }
}