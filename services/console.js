module.exports = {
  log: function (message) {
    console.log(`\x1b[1;37m${message}\x1b[0m`);
  },
  error: function (message) {
    console.log(`\x1b[0;31m${message}\x1b[0m`);
  },
  info: function (message) {
    console.log(`\x1b[1;34m${message}\x1b[0m`);
  },
  warn: function (message) {
    console.log(`\x1b[1;33m${message}\x1b[0m`);
  },
  debug: function (message) {
    console.log(`\x1b[0;33m${message}\x1b[0m`);
  },
  success: function (message) {
    console.log(`\x1b[0;32m${message}\x1b[0m`);
  },
  originalLog: console.log,
};
