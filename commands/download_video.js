const { SlashCommandBuilder } = require("discord.js");
const ytdl = require("@distube/ytdl-core");
const { MongoClient, ServerApiVersion } = require("mongodb");

const client = new MongoClient(
  `mongodb+srv://admin:${process.env.MONGODB_PASSWORD}@carladown.d3xwq.mongodb.net/?retryWrites=true&w=majority&appName=CarlaDown`,
  {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  }
);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("download_video")
    .setDescription(
      "Send me the YouTube link and I'll give you the audio to download."
    )
    .addStringOption((option) =>
      option
        .setName("youtube_url")
        .setDescription("The YouTube video URL to download the audio.")
        .setRequired(true)
    ),
  execute: async (interaction) => {
    await interaction.deferReply();

    let videoURL = interaction.options.data.find(
      (option) => option.name === "youtube_url"
    ).value;

    if (!ytdl.validateURL(videoURL)) {
      await interaction.editReply({
        content:
          "O URL informado não é do YouTube. Tente novamente com uma URL correta.",
        ephemeral: true,
      });
      return;
    }

    if (videoURL.includes("youtu.be/"))
      videoURL =
        "https://www.youtube.com/watch?v=" +
        new URL(videoURL).pathname.split("/")[1];

    const videoID = ytdl.getURLVideoID(videoURL);
    console.log("Creating URL for videoID: " + videoID);

    try {
      await client.connect();

      const myDB = await client.db(
        `carladown_${process.env.IS_PRODUCTION === "true" ? "prod" : "dev"}`
      );
      const myColl = await myDB.collection("mp4");

      const alreadyHaveThisVideo = await myColl.findOne({ videoID });

      if (alreadyHaveThisVideo) {
        if (alreadyHaveThisVideo.shortLink) {
          const request = {
            error: null,
            shortLink: alreadyHaveThisVideo.shortLink,
          };
          await interaction.editReply({
            content:
              "Vídeo já disponível! Link para baixar: " + request.shortLink,
          });
          return;
        } else {
          await myColl.deleteOne({ videoID });
          const request = {
            error: {
              message:
                "There is a video with the same ID, but without a short link. Retry.",
            },
            shortLink: null,
          };
          await interaction.editReply({
            content:
              "Deu algum problema ao baixar o vídeo. Aqui está o problema: ```\n" +
              request.error.message +
              "```",
          });
          return;
        }
      }

      const downloadID = `${Date.now()}_${Math.random()}`;
      const link = `http://${process.env.SERVER_DOMAIN}/api/download_mp4?id=${downloadID}`;

      if (!link.match(new RegExp("^https?://"))) {
        interaction.editReply({
          content:
            "Deu algum problema ao baixar o áudio. Aqui está o problema: ```O link não é válido.```",
        });
        return;
      }

      const base_url =
        "https://link-to.net/" +
        process.env.LINKADVERTISE_ID +
        "/" +
        Math.random() * 1000 +
        "/dynamic/";
      const base64 = Buffer.from(encodeURI(link)).toString("base64");

      const request = {
        error: null,
        shortLink: `${base_url}?r=${base64}`,
      };

      if (!request.error) {
        await myColl.insertOne({
          videoID,
          downloadID,
          shortLink: request.shortLink,
        });

        await interaction.editReply({
          content: "Vídeo baixado! Link para baixar: " + request.shortLink,
        });
      } else {
        await interaction.editReply({
          content:
            "Deu algum problema ao baixar o vídeo. Aqui está o problema: ```\n" +
            request.error +
            "```",
        });
      }
    } catch (err) {
      await interaction.editReply({
        content:
          "Deu algum problema ao baixar o vídeo. Aqui está o problema: ```\n" +
          err.message +
          "```",
      });
    } finally {
      await client.close();
    }
  },
};
