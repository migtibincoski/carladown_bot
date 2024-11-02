require("dotenv").config();
const console = require("./services/console");

console.log("------------------------------------");

const manager = new (require("discord.js").ShardingManager)("./bot.js", {
  token: process.env.DISCORD_BOT_TOKEN,
});
manager.on("shardCreate", (shard) =>
  console.info(`Launched shard ${shard.id}`)
);
manager.spawn();