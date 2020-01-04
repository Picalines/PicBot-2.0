import * as fs from "./fsAsync";

export type LogType = "event" | "error" | "warning"

export abstract class Debug {
    private static datePattern = /.+(\d+:){2}\d+/;

    private static lastLogs: string[] = [];

    private static getDate(): string {
        const res = this.datePattern.exec(Date());
        return res !== null ? res.slice()[0] : ":/";
    }

    static Log(msg: any, type: LogType = "event") {
        const date = `[${this.getDate()}]`;
        let m = date + " - " + String(msg);

        switch (type) {
            default: throw new Error(`unsupported log type '${type}'`);
            case "event": break;
            case "error": m = "[ERROR] " + m; break;
            case "warning": m = "[WARNING] " + m; break;
        }

        console.log(m);

        const lastCount = Number(process.env.LAST_LOGS_COUNT) || 3;
        this.lastLogs.push(m);
        if (this.lastLogs.length > lastCount) {
            this.lastLogs.shift();
        }

        if (type == "error") {
            this.Save().then(() => console.log("\nerror data saved\n"));
        }
    }

    static async Save() {
        if (this.lastLogs.length == 0) return;

        const path = String(process.env.LOGS_PATH || "./logs.txt");
        let text = `\n/* SAVED AT ${Date()} */\n\n`;
        for (const log of this.lastLogs) {
            text += log + "\n";
        }

        await fs.appendFileAsync(path, text);
        this.lastLogs = [];
    }
}