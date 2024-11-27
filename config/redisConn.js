const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_ACCESS_URL,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 100, 3000);
    console.log(`Retrying redis connection in ${delay}ms`);
    return delay;
  },
});

module.exports = redis;
