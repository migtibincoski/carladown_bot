const { SlashCommandBuilder, InteractionCollector } = require("discord.js");
const ytdl = require("@distube/ytdl-core");
const fs = require("node:fs");
const path = require("node:path");
const database = require("../database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("download_video")
    .setDescription(
      "Send me the YouTube link and i'll give you the video to download."
    )
    .addStringOption((option) =>
      option
        .setName("youtube_url")
        .setDescription("The YouTube video url to download the video.")
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

    const request = await database.createURL(
      new URL(videoURL).searchParams.get("v"),
      false
    );
    if (!request.error) {
      interaction.editReply({
        content: "Vídeo baixado! Link para baixar: " + request.shortLink,
      });
    } else {
      interaction.editReply({
        content:
          "Deu algum problema ao baixar o vídeo. Aqui está o problema: ```\n" +
          request.error +
          "```",
      });
    }
  },
};
