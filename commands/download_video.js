const { SlashCommandBuilder } = require("discord.js");
const ytdl = require("@distube/ytdl-core");
const { getAuthor } = require("@distube/ytdl-core/lib/info-extras");
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
      "Send me the YouTube link and I'll give you the video to download."
    )
    .addStringOption((option) =>
      option
        .setName("youtube_url")
        .setDescription("The YouTube video URL to download the video.")
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
          "The URL provided is not from YouTube or the link is broken. Try again with a correct URL.",
      });
      return;
    }

    const videoID = ytdl.getURLVideoID(videoURL);

    console.log("Creating URL for video: " + ytdl.getURLVideoID(videoURL));

    const videoInfo = (await ytdl.getInfo(videoURL)).videoDetails;

    videoInfo.thumbnails.sort((a, b) => {
      return b.height - a.height;
    });

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
            content: `<@${interaction.user.id}>`,
            tts: false,
            embeds: [
              {
                id: 652627557,
                title: `${videoInfo.title}`,
                description: videoInfo.description
                  ? `\`\`\`${videoInfo.description}\`\`\``
                  : undefined,
                color: 27957,
                fields: [
                  {
                    id: 430795494,
                    name: "Views",
                    value: `${videoInfo.viewCount || "not avaliable"}`,
                    inline: true,
                  },
                  {
                    id: 89801635,
                    name: "Likes",
                    value: `${videoInfo.likes || "not avaliable"}`,
                    inline: true,
                  },
                ],
                author: {
                  name: "Download link avaliable!",
                },
                url: `${request.shortLink}`,
                image: {
                  url: `${videoInfo.thumbnails[0].url}`,
                },
                footer: {
                  text: `${videoInfo.author.name || videoInfo.author}`,
                  image: `${videoInfo.author.thumbnails[0].url}`,
                },
              },
            ],
            components: [
              {
                id: 701444722,
                type: 1,
                components: [
                  {
                    id: 154376095,
                    type: 2,
                    style: 5,
                    label: "DOWNLOAD VIDEO NOW!",
                    action_set_id: "806424063",
                    url: `${request.shortLink}`,
                    emoji: {
                      name: "📁",
                      animated: false,
                    },
                  },
                ],
              },
            ],
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
              "There was a problem downloading the video. Here is the problem: ```\n" +
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
            "There was a problem downloading the video. Here is the problem: ```The link is not valid.```",
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
          downloadID,
          videoID,
          shortLink: request.shortLink,
        });

        await interaction.editReply({
          content: `<@${interaction.user.id}>`,
          tts: false,
          embeds: [
            {
              id: 652627557,
              title: `${videoInfo.title}`,
              description: `\`\`\`${videoInfo.description}\`\`\``,
              color: 27957,
              fields: [
                {
                  id: 430795494,
                  name: "Views",
                  value: `${videoInfo.viewCount}`,
                  inline: true,
                },
                {
                  id: 89801635,
                  name: "Likes",
                  value: `${videoInfo.likes}`,
                  inline: true,
                },
              ],
              author: {
                name: "Download link avaliable!",
              },
              url: `${request.shortLink}`,
              image: {
                url: `${videoInfo.thumbnails[0].url}`,
              },
              footer: {
                text: `${videoInfo.author.name || videoInfo.author}`,
                image: `${videoInfo.author.thumbnails[0].url}`,
              },
            },
          ],
          components: [
            {
              id: 701444722,
              type: 1,
              components: [
                {
                  id: 154376095,
                  type: 2,
                  style: 5,
                  label: "DOWNLOAD MP4 NOW!",
                  action_set_id: "806424063",
                  url: `${request.shortLink}`,
                  emoji: {
                    name: "📁",
                    animated: false,
                  },
                },
              ],
            },
          ],
        });
      } else {
        await interaction.editReply({
          content:
            "There was a problem downloading the video. Here is the problem: ```\n" +
            request.error +
            "```",
        });
      }
    } catch (err) {
      await interaction.editReply({
        content:
          "There was a problem downloading the video. Here is the problem: ```\n" +
          err.message +
          "```",
      });
    } finally {
      await client.close();
    }
  },
};
