import { deserializeGuildData, guildsData } from "./guildData";
import { Debug } from "./debug";
import * as fs from "./fsAsync";
import { bot } from "./main";

export const databaseFolderPath = "./database/";
export const guildsFolderPath = databaseFolderPath + "guilds/";
export const assetsFolderPath = "./assets/";

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

    const files = (await fs.readdir(guildsFolderPath)).filter(f => f.endsWith(".json"));

    const loads: Promise<void>[] = files.map(file => (async () => {
        const id = file.replace(".json", "");
        if (bot.guilds.find(g => g.id == id) != null) {
            const data = await fs.readJson(guildsFolderPath + file);
            guildsData[id] = deserializeGuildData(data);
        }
    })());

    await Promise.all(loads);

    Debug.Log("guilds data successfully loaded");
}

export async function saveGuilds() {
    Debug.Log("saving guilds data...");

    const writes: Promise<void>[] = Object.values(guildsData).map(guild => {
        const serialized = JSON.stringify(guild.serialize());
        return fs.writeFile(guildsFolderPath + guild.guild.id + ".json", serialized);
    });

    await Promise.all(writes);

    Debug.Log("guilds data successfully saved");
}

// #endregion