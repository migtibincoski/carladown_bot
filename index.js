require("dotenv").config();
const { AutoPoster } = require("topgg-autoposter");
const console = require("./services/console");

console.log("------------------------------------");

const manager = new (require("discord.js").ShardingManager)("./bot.js", {
  token: process.env.DISCORD_BOT_TOKEN,
});
manager.on("shardCreate", (shard) =>
  console.info(`Launched shard ${shard.id}`)
);
manager.spawn();

if (process.env.IS_PRODUCTION === "true") {
  const poster = AutoPoster(process.env.TOPGG_TOKEN, manager);
  poster.on("posted", (stats) => {
    console.log(`Posted stats to Top.gg. ${stats.serverCount} servers.`);
  });
}
