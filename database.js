const { MongoClient, ServerApiVersion } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

const uri = `mongodb+srv://admin:${process.env.MONGODB_PASSWORD}@carladown.d3xwq.mongodb.net/?retryWrites=true&w=majority&appName=CarlaDown`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const createURL = async (videoID, isMP3) => {
  try {
    console.log("Creating URL for videoID: " + videoID);
    client.connect();
    const myDB = await client.db(
      `carladown_${
        process.env.IS_PRODUCTION.toString() == "true" ? "prod" : "dev"
      }`
    );

    const myColl = await myDB.collection(`${isMP3 ? "mp3" : "mp4"}`);
    const alreadyHaveThisVideo = await myColl.findOne({
      videoID,
    });

    await client.close();

    if (alreadyHaveThisVideo) {
      if (alreadyHaveThisVideo.shortLink) {
        return {
          error: null,
          shortLink: alreadyHaveThisVideo.shortLink,
        };
      } else {
        await myColl.deleteOne({
          videoID,
        });
        return {
          error: {
            message:
              "Thers is a video with the same ID, but without a short link. Retry.",
          },
          shortLink: null,
        };
      }
    }

    const downloadID = `${Date.now()}_${Math.random()}`;

    const link = `http://${process.env.SERVER_DOMAIN}/api/download_${
      isMP3 ? "mp3" : "mp4"
    }?id=${downloadID}`;

    if (link.match(new RegExp("^https?://")) != null) return;

    const base_url =
      "https://link-to.net/" +
      process.env.LINKADVERTISE_ID +
      "/" +
      Math.random() * 1000 +
      "/dynamic/";

    const base64 = Buffer.from(encodeURI(link)).toString("base64");

    client.close();
    console.log(`link: ${base_url}?r=${base64}`);
    return {
      error: "sem erro",
      shortLink: `link encurtado: ${base_url}?r=${base64}`,
    };
  } catch (e) {
    console.error(e);
  }

  // myColl.insertOne({
  //   downloadID,
  //   videoID,
  //   shortLink: href,
  // });

  return "oi";
};

const getURL = async (downloadID, isMP3) => {
  await client.connect();
  const myDB = await client.db(
    `carladown_${
      process.env.IS_PRODUCTION.toString() == "true" ? "prod" : "dev"
    }`
  );
  const myColl = await myDB.collection(`${isMP3 ? "mp3" : "mp4"}`);
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
};

var markup = function (href) {
  var c = href;
  if (c.substring(c.length - 1) == "/") c = c.substring(0, c.length - 1);
  return c;
};

module.exports = {
  createURL,
  getURL,
  markup,
};
