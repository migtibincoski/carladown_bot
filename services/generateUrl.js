require("dotenv").config();

module.exports = {
  generateUrl: function (link) {
    const userID = process.env.LINKADVERTISE_ID;

    var base_href = markup(link);

    if (base_href.match(new RegExp("^https?://")) != null) return;

    var base_url =
      "https://link-to.net/" +
      user_id +
      "/" +
      Math.random() * 1000 +
      "/dynamic/";

    var href = base_url + "?r=" + btoa(encodeURI(base_href));

    if (process.env.IS_PRODUCTION.toString().toLowerCase() == "true") {
      fetch(
        `https://discord.com/api/webhooks/1301784003979776030/${process.env.DISCORD_WEBHOOK_TOKEN}`,
        {
          method: "POST",
          body: JSON.stringify({
            content: `Link criado: ${href}`,
            username: "CarlaDown | NewShortLink",
          }),
        }
      );
    }

    return href;
  },
};

var markup = function (href) {
  var c = href;
  if (c.substring(c.length - 1) == "/") c = c.substring(0, c.length - 1);
  return c;
};
