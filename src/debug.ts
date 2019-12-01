import * as fs from "./fsAsync";

export type LogType = "event" | "error" | "warning"

export abstract class Debug {
    private static datePattern = /\S{3} \d{2} \d{4} (\d{2}:?){3}/gm;

    static readonly logsPath = "./logs.txt";

    private static lastLogs = "";

    static Log(msg: any, type: LogType = "event") {
        let date = `[${(this.datePattern.exec(Date()) as RegExpExecArray)[0]}]`;
        let m = date + " " + String(msg);

        switch (type) {
            case "error": m = "[ERROR] " + m;
            case "warning": m = "[WARNING] " + m;
        }

        console.log(m);
        this.lastLogs = this.lastLogs == "" ? m : "\n" + m;
    }

    static async Save() {
        await fs.appendFileAsync(this.logsPath, this.lastLogs);
    }
}