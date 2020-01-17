import * as fs from "./fsAsync";

export type LogType = "event" | "error" | "warning"

interface Log {
    type: LogType;
    msg: string;
}

export abstract class Debug {
    private static datePattern = /.+(\d+:){2}\d+/;

    private static lastLogs: Log[] = [];

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
        this.lastLogs.push({ type, msg: m });
        if (this.lastLogs.length > lastCount) {
            this.lastLogs.shift();
        }

        if (type == "error") {
            Debug.Save().then(() => console.log("\nerror data saved\n"));
        }
    }

    static async Save() {
        if (this.lastLogs.find(l => l.type == "error") == undefined) return;

        const text = this.lastLogs.reduce((acc, log) => acc + log.msg + "\n", `\n/* SAVED AT ${Date()} */\n\n`);
        await fs.appendFile(String(process.env.LOGS_PATH || "./logs.txt"), text);
        
        this.lastLogs = [];
    }
}