const ytdl = require("@distube/ytdl-core");

module.exports = {
  getAgents: function () {
    const buffer = Buffer.from(process.env.YTDL_AGENTS, "base64");
    const agentsBuffer = JSON.parse(buffer.toString("utf-8"));

    const agents = [];

    agentsBuffer[0].forEach((agent) => {
      const data = ytdl.createAgent(agent);
      agents.push(data);
    });

    return agents;
  },
};
