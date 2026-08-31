const applicationId = text(process.env.DISCORD_APPLICATION_ID);
const botToken = text(process.env.DISCORD_BOT_TOKEN);
const guildId = text(process.env.DISCORD_COMMAND_GUILD_ID);
const environment = option("--environment");
const expectedApplicationIds = {
    production: "1540825749945196614",
    staging: "1540646111042076702"
};

if(!applicationId || !botToken){
    throw new Error("DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN must be configured locally.");
}
if(!expectedApplicationIds[environment]){
    throw new Error("Pass --environment production or --environment staging.");
}
if(applicationId !== expectedApplicationIds[environment]){
    throw new Error(`DISCORD_APPLICATION_ID does not match the expected ${environment} application.`);
}
if(environment === "production" && guildId){
    throw new Error("Production Scheduler commands must be registered globally; clear DISCORD_COMMAND_GUILD_ID.");
}

const commandContext = guildId
    ? {}
    : {
        // Global commands support both personal installs and private DM surfaces.
        integration_types: [0, 1],
        contexts: [0, 1, 2]
    };

const commands = [
    { name: "卓", description: "参加中の卓を表示します", type: 1 },
    { name: "日程", description: "調整中の日程を確認します", type: 1 },
    { name: "回答", description: "候補日へ回答します", type: 1 },
    { name: "次の卓", description: "次に予定されている確定卓を表示します", type: 1 },
    { name: "予定", description: "今後の卓を表示します", type: 1 },
    { name: "設定", description: "Discord通知の設定を変更します", type: 1 }
].map(command => ({ ...command, ...commandContext }));

const baseUrl = guildId
    ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${applicationId}/commands`;
const headers = {
    authorization: `Bot ${botToken}`,
    "content-type": "application/json"
};

const applicationResponse = await fetch("https://discord.com/api/v10/oauth2/applications/@me", { headers });
if(!applicationResponse.ok){
    throw new Error(`Discord application lookup failed (${applicationResponse.status}).`);
}
const tokenApplication = await applicationResponse.json();
if(text(tokenApplication?.application?.id ?? tokenApplication?.id) !== expectedApplicationIds[environment]){
    throw new Error(`DISCORD_BOT_TOKEN does not belong to the expected ${environment} application.`);
}

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

console.log(`Registered ${commands.length} ${environment} Discord scheduler commands (${guildId ? "guild" : "global"} scope; app suffix ${applicationId.slice(-4)}).`);

function text(value){
    return String(value ?? "").trim();
}

function option(name){
    const index = process.argv.indexOf(name);
    return index >= 0 ? text(process.argv[index + 1]) : "";
}
