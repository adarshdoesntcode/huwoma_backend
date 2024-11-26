const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_ACCESS_URL);

redis.on("command", (cmd) => {
  console.log("Redis Command:", cmd.name, cmd.args);
});

module.exports = redis;
