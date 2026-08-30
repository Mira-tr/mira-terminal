const applicationId = text(process.env.DISCORD_APPLICATION_ID);
const botToken = text(process.env.DISCORD_BOT_TOKEN);
const guildId = text(process.env.DISCORD_COMMAND_GUILD_ID);

if(!applicationId || !botToken){
    throw new Error("DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN must be configured locally.");
}

const commands = [
    { name: "卓", description: "参加中の卓を表示します", type: 1 },
    { name: "日程", description: "調整中の日程を確認します", type: 1 },
    { name: "回答", description: "候補日へ回答します", type: 1 },
    { name: "次の卓", description: "次に予定されている確定卓を表示します", type: 1 },
    { name: "予定", description: "今後の卓を表示します", type: 1 }
];

const baseUrl = guildId
    ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${applicationId}/commands`;
const headers = {
    authorization: `Bot ${botToken}`,
    "content-type": "application/json"
};

const existingResponse = await fetch(baseUrl, { headers });
if(!existingResponse.ok){
    throw new Error(`Discord command lookup failed (${existingResponse.status}).`);
}
const existing = await existingResponse.json();
const existingByName = new Map(Array.isArray(existing) ? existing.map(command => [command.name, command]) : []);

for(const command of commands){
    const known = existingByName.get(command.name);
    const response = await fetch(known ? `${baseUrl}/${known.id}` : baseUrl, {
        method: known ? "PATCH" : "POST",
        headers,
        body: JSON.stringify(command)
    });
    if(!response.ok){
        throw new Error(`Discord command registration failed for ${command.name} (${response.status}).`);
    }
}

console.log(`Registered ${commands.length} Discord scheduler commands (${guildId ? "guild" : "global"} scope).`);

function text(value){
    return String(value ?? "").trim();
}
