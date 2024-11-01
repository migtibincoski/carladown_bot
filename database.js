const { MongoClient, ServerApiVersion } = require("mongodb");
const { get } = require("axios");
require("dotenv").config();

const uri = `mongodb+srv://admin:${process.env.MONGODB_PASSWORD}@carladown.d3xwq.mongodb.net/?retryWrites=true&w=majority&appName=CarlaDown`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
module.exports = {
  createURL: async (videoID, isMP3) => {
    await client.connect();
    const myDB = client.db(
      `carladown_${
        process.env.IS_PRODUCTION.toString() == "true" ? "prod" : "dev"
      }`
    );

    const myColl = myDB.collection(`${isMP3 ? "mp3" : "mp4"}`);
    const alreadyHaveThisVideo = await myColl.findOne({
      videoID,
    });

    if (alreadyHaveThisVideo !== null) {
      return {
        error: null,
        shortLink: alreadyHaveThisVideo.shortLink,
      };
    }

    const downloadID = `${Date.now()}_${Math.random()}`;

    /*const { data } = await get(
        "https://shrtfly.com/api?api=" +
          process.env.SHRTFLY_API_KEY +
          "&url=http://" +
          process.env.SERVER_DOMAIN +
          "/api/download_" +
          (isMP3 ? "mp3" : "mp4") +
          "?id=" +
          downloadID +
          "&type=1&format=json"
      );*/

    const request = await fetch(
      `https://shrtfly.com/api?api=${
        process.env.SHRTFLY_API_KEY
      }&url=${encodeURIComponent(
        `http://${process.env.SERVER_DOMAIN}/api/download_${
          isMP3 ? "mp3" : "mp4"
        }?id=${downloadID}`
      )}&type=1&format=json`
    );

    const data = await request.json();

    const shortLink = data.result.shorten_url;
    const result = await myColl.insertOne({
      downloadID,
      videoID,
      shortLink,
    });
    await client.close();
    return {
      error: null,
      shortLink,
    };
  },
  getURL: async (downloadID, isMP3) => {
    await client.connect();
    const myDB = client.db(
      `carladown_${
        process.env.IS_PRODUCTION.toString() == "true" ? "prod" : "dev"
      }`
    );
    const myColl = myDB.collection(`${isMP3 ? "mp3" : "mp4"}`);
    const query = await myColl.findOne({
      downloadID,
    });
    if (query !== null) {
      return {
        error: null,
        videoID: `${query.videoID}`,
      };
    } else {
      return {
        error: {
          message:
            "No video has found. The download ID (" +
            downloadID +
            ") is correct?",
        },
        videoID: null,
      };
    }
  },
};
