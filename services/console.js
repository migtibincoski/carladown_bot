module.exports = {
  log: function (message) {
    console.log(`\x1b[1;37m`);
    console.log(message);
    console.log(`\x1b[0m`);
  },
  error: function (message) {
    console.error(`\x1b[0;31m`);
    console.error(message);
    console.error(`\x1b[0m`);
  },
  info: function (message) {
    console.info(`\x1b[1;34m`);
    console.info(message);
    console.info(`\x1b[0m`);
  },
  warn: function (message) {
    console.warn(`\x1b[1;33m`);
    console.warn(message);
    console.warn(`\x1b[0m`);
  },
  debug: function (message) {
    console.debug(`\x1b[0;33m`);
    console.debug(message);
    console.debug(`\x1b[0m`);
  },
  success: function (message) {
    console.log(`\x1b[0;32m`);
    console.log(message);
    console.log(`\x1b[0m`);
  },
  originalLog: console.log,
};
