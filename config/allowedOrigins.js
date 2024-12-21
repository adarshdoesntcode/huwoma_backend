//creating whiteList in order to ensure your server is accessed by limited domain
const allowedOrigins = [
  "http://localhost:5173",
  "https://huwoma.vercel.app",
  "http://192.168.1.131:5173",
  "http://192.168.1.143:5173",
];

module.exports = allowedOrigins;
