import { deserializeGuildData, guildsData } from "./guildData";
import * as fs from "./fsAsync";
import { Debug } from "./debug";
import { bot } from "./main";

export const databaseFolderPath = "./database/";
export const guildsFolderPath = databaseFolderPath + "guilds/";
export const assetsFolderPath = databaseFolderPath + "assets/";

export async function load() {
    Debug.Log("loading database...");
    await loadGuilds();
    Debug.Log("database successfully loaded");
}

export async function save() {
    Debug.Log("saving database...");
    await saveGuilds();
    Debug.Log("database successfully saved");
}

// #region guild data

export async function loadGuilds() {
    Debug.Log("loading guilds data...");
    await fs.checkFolderAsync(databaseFolderPath);
    await fs.checkFolderAsync(guildsFolderPath);
    let files = (await fs.readdirAsync(guildsFolderPath)).filter(f => f.endsWith(".json"));
    for (let i in files) {
        let file = files[i];
        let id = file.replace(".json", "");
        let guild = bot.guilds.find(g => g.id == id);
        if (guild != null) {
            let data = JSON.parse((await fs.readFileAsync(guildsFolderPath + file)).toString());
            guildsData[guild.id] = deserializeGuildData(data);
        }
    }
    Debug.Log("guilds data successfully loaded");
}

export async function saveGuilds() {
    Debug.Log("saving guilds data...");
    await fs.checkFolderAsync(databaseFolderPath);
    await fs.checkFolderAsync(guildsFolderPath);
    for (let i in guildsData) {
        let guild = guildsData[i];
        let serialized = JSON.stringify(guild.serialize());
        await fs.writeFileAsync(guildsFolderPath + guild.guild.id + ".json", serialized);
    }
    Debug.Log("guilds data successfully saved");
}

// #endregion

// #region assets

export async function readAsset(path: string, defaultData?: string): Promise<string> {
    path = assetsFolderPath + path;
    if (!(await fs.existsAsync(path))) {
        if (defaultData != undefined) {
            await fs.writeFileAsync(path, defaultData);
        }
        else {
            throw new Error(`Asset '${path}' not found`);
        }
    }

    return (await fs.readFileAsync(path)).toString();
}

export async function readAssetObject(path: string, defaultData?: {}): Promise<{}> {
    return JSON.parse(await readAsset(path, JSON.stringify(defaultData)));
}

// #endregion