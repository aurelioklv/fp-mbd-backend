const { Client } = require("pg");
require("dotenv").config();

const db = new Client({
  host: process.env.AIVEN_HOST,
  port: process.env.AIVEN_PORT,
  database: process.env.AIVEN_NAME,
  user: process.env.AIVEN_USER,
  password: process.env.AIVEN_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});
db.connect();

module.exports = { db };
