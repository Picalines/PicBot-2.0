import { deserializeGuildData, guildsData } from "./guildData";
import { readdirAsync, existsAsync, mkdirAsync, writeFileAsync, readFileAsync } from "./fsAsync";
import { bot } from "./main";
import { Debug } from "./debug";

export const databaseFolderPath = "./database/";

export const guildsFolderPath = databaseFolderPath + "guilds/";

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

export async function loadGuilds() {
    Debug.Log("loading guilds data...");
    await checkFolder(databaseFolderPath);
    await checkFolder(guildsFolderPath);
    let files = (await readdirAsync(guildsFolderPath)).filter(f => f.endsWith(".json"));
    for (let i in files) {
        let file = files[i];
        let id = file.replace(".json", "");
        let guild = bot.guilds.find(g => g.id == id);
        if (guild != null) {
            let data = JSON.parse((await readFileAsync(guildsFolderPath + file)).toString());
            guildsData[guild.id] = deserializeGuildData(data);
        }
    }
    Debug.Log("guilds data successfully loaded");
}

export async function saveGuilds() {
    Debug.Log("saving guilds data...");
    await checkFolder(databaseFolderPath);
    await checkFolder(guildsFolderPath);
    for (let i in guildsData) {
        let guild = guildsData[i];
        let serialized = JSON.stringify(guild.serialize());
        await writeFileAsync(guildsFolderPath + guild.guild.id + ".json", serialized);
    }
    Debug.Log("guilds data successfully saved");
}

async function checkFolder(path: string) {
    if (!(await existsAsync(path))) {
        await mkdirAsync(path);
    }
}