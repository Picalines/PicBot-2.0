import { deserializeGuildData, guildsData } from "./guildData";
import { Debug } from "./debug";
import * as fs from "./fsAsync";
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
    await fs.checkFolder(databaseFolderPath);
    await fs.checkFolder(guildsFolderPath);
    const files = (await fs.readdir(guildsFolderPath)).filter(f => f.endsWith(".json"));
    for (const file of files) {
        const id = file.replace(".json", "");
        if (bot.guilds.find(g => g.id == id) != null) {
            let data = await fs.readJson(guildsFolderPath + file);
            guildsData[id] = deserializeGuildData(data);
        }
    }
    Debug.Log("guilds data successfully loaded");
}

export async function saveGuilds() {
    Debug.Log("saving guilds data...");
    await fs.checkFolder(databaseFolderPath);
    await fs.checkFolder(guildsFolderPath);
    for (const guild of Object.values(guildsData)) {
        guild.cleanAccounts();
        let serialized = JSON.stringify(guild.serialize());
        await fs.writeFile(guildsFolderPath + guild.guild.id + ".json", serialized);
    }
    Debug.Log("guilds data successfully saved");
}

// #endregion