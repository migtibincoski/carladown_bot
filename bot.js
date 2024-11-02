require("dotenv").config();
const Discord = require("discord.js");
const ytdl = require("@distube/ytdl-core");
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.DirectMessages,
  ],
});
const ffmpeg = require("ffmpeg-static");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const console = require("./services/console");

const { getAgents } = require("./services/agents");

client.once(Discord.Events.ClientReady, () => {
  console.info(
    "O bot " +
      client.user.tag +
      " (" +
      client.application.id +
      ") foi iniciado com sucesso!"
  );

  client.commands = [];
  const foldersPath = path.join(__dirname, "commands");
  const commandFiles = fs
    .readdirSync(foldersPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const command = require("./commands/" + file);
    if ("data" in command && "execute" in command) {
      client.commands.push(command.data.toJSON());
    } else {
      console.warn(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }

  const rest = new Discord.REST().setToken(process.env.DISCORD_BOT_TOKEN);
  (async () => {
    try {
      console.info(
        `Started refreshing ${client.commands.length} application (/) commands.`
      );

      const data = await rest.put(
        Discord.Routes.applicationCommands(client.application.id),
        { body: client.commands }
      );

      console.success(
        `Successfully reloaded ${data.length} application (/) commands.`
      );
    } catch (error) {
      console.error(error);
    }
  })();

  setInterval(async () => {
    const guildsCount = await client.shard.fetchClientValues(
      "guilds.cache.size"
    );

    const usersCount = await client.shard.fetchClientValues("users.cache.size");
    client.user.setActivity(
      `${guildsCount.reduce(
        (acc, guildCount) => acc + guildCount,
        0
      )} guilds and ${usersCount.reduce(
        (acc, userCount) => acc + userCount,
        0
      )} users`,
      { type: Discord.ActivityType.Listening }
    );
  }, 5000);
});

client.on(Discord.Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.find(
    (commandData) => commandData.name === interaction.commandName
  );
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await require("./commands/" + command.name).execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

client.on(Discord.Events.GuildCreate, async (guild) => {
  console.info(
    '[INFO] Adicionado ao servidor "' + guild.name + '" (' + guild.id + ")."
  );

  const webhook = await fetch(
    `https://discord.com/api/webhooks/1301784003979776030/${process.env.DISCORD_WEBHOOK_TOKEN}`,
    {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        content: `Adicionado ao servidor "${guild.name}" (${guild.id}).`,
        username:
          (process.env.IS_PRODUCTION.toString().toLowerCase() == "true"
            ? "CarlaDown [PROD]"
            : "CarlaDown [DEV]") + " | GuildCreate",
      }),
    }
  );
});

client.login(process.env.DISCORD_BOT_TOKEN);

// web server
const express = require("express");
const cors = require("cors");
const app = express();
const database = require("./database");
const { MongoClient, ServerApiVersion } = require("mongodb");

const dbClient = new MongoClient(
  `mongodb+srv://admin:${process.env.MONGODB_PASSWORD}@carladown.d3xwq.mongodb.net/?retryWrites=true&w=majority&appName=CarlaDown`,
  {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  }
);

app.use(
  cors({
    origin: "*",
    methods: ["GET"],
    allowedHeaders: ["Content-Type"],
  })
);
app.set("view engine", "ejs");

app.listen(8080, () => {});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/api/download_mp4", async (req, res) => {
  const agent = getAgents()[Math.floor(Math.random() * getAgents().length)];

  await dbClient.connect();
  const myDB = await dbClient.db(
    `carladown_${
      process.env.IS_PRODUCTION.toString() == "true" ? "prod" : "dev"
    }`
  );
  const myColl = await myDB.collection("mp4");
  const query = await myColl.findOne({
    downloadID: req.query.id,
  });
  if (query !== null) {
    const data = {
      error: null,
      videoID: `${query.videoID}`,
    };
  } else {
    const data = {
      error: {
        message:
          "No video has found. The download ID (" +
          downloadID +
          ") is correct?",
      },
      videoID: null,
    };
    return res.status(404).json(data);
  }

  try {
    let url = "https://www.youtube.com/watch?v=" + data.videoID;

    if (!ytdl.validateURL(url))
      return res.sendStatus(400).json({
        error: "Invalid URL",
      });

    const video = await ytdl.getInfo(url, { agent });
    video.formats.filter(
      (format) =>
        format.container === "mp4" && format.hasVideo && format.hasAudio
    );

    let title = `${video.videoDetails.title} | ${video.videoDetails.author.name}`;

    title = title.replace(/[^\x00-\x7F]/g, "");

    let videoFile = ytdl(url, { filter: "videoonly" });
    let audioFile = ytdl(url, { filter: "audioonly", highWaterMark: 1 << 25 });

    const ffmpegProcess = cp.spawn(
      ffmpeg,
      [
        "-i",
        `pipe:3`,
        "-i",
        `pipe:4`,
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-c:v",
        "copy",
        "-c:a",
        "libmp3lame",
        "-crf",
        "27",
        "-preset",
        "veryfast",
        "-movflags",
        "frag_keyframe+empty_moov",
        "-f",
        "mp4",
        "-loglevel",
        "error",
        "-",
      ],
      {
        stdio: ["pipe", "pipe", "pipe", "pipe", "pipe"],
      }
    );

    videoFile.pipe(ffmpegProcess.stdio[3]);
    audioFile.pipe(ffmpegProcess.stdio[4]);

    res.header(
      "Content-Disposition",
      'attachment; filename="' + title + '.mp4"'
    );
    res.header("Content-Type", "video/mp4");
    ffmpegProcess.stdio[1].pipe(res);
  } catch (error) {
    console.originalLog(error);
  }
});

app.get("/api/download_mp3", async (req, res, next) => {
  const agent = getAgents()[Math.floor(Math.random() * getAgents().length)];

  await dbClient.connect();
  const myDB = await dbClient.db(
    `carladown_${
      process.env.IS_PRODUCTION.toString() == "true" ? "prod" : "dev"
    }`
  );
  const myColl = await myDB.collection("mp3");
  const query = await myColl.findOne({
    downloadID: req.query.id,
  });
  let data = {};
  if (query !== null) {
    data = {
      error: null,
      videoID: `${query.videoID}`,
    };
  } else {
    return res.status(404).json({
      error: {
        message:
          "No video has found. The download ID (" +
          downloadID +
          ") is correct?",
      },
      videoID: null,
    });
  }

  try {
    let url = "https://www.youtube.com/watch?v=" + data.videoID;

    if (!ytdl.validateURL(url))
      return res.json({
        error: "Invalid URL",
      });

    const video = await ytdl.getInfo(url, { agent });

    let title = `${video.videoDetails.title} | ${video.videoDetails.author.name}`;

    title = title.replace(/[^\x00-\x7F]/g, "");

    let audioFile = ytdl(url, {
      agent,
      filter: "audioonly",
      highWaterMark: 1 << 25,
    });

    res.header(
      "Content-Disposition",
      'attachment; filename="' + title + '.mp3"'
    );
    res.header("Content-Type", "video/mp3");
    audioFile.pipe(res);
  } catch (error) {
    console.originalLog(error);
  }
});

app.get("/a265d7c96e5198da2e9336e524ca1e08.html", (req, res) => {
  res.render("./shrtfly_verification.ejs");
});
