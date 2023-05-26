const { Pool, Client } = require("pg");
const dotenv = require("dotenv");

const result = dotenv.config();

if (result.error) {
  throw result.error;
}

// Local DB

const db = new Pool({
  host: result.parsed.PG_HOST,
  port: result.parsed.PG_PORT,
  database: result.parsed.PG_NAME,
  user: result.parsed.PG_USER,
  password: result.parsed.PG_PASSWORD,
});

// Live DB

// const db = new Pool({
//   host: result.parsed.AIVEN_HOST,
//   port: result.parsed.AIVEN_PORT,
//   database: result.parsed.AIVEN_NAME,
//   user: result.parsed.AIVEN_USER,
//   password: result.parsed.AIVEN_PASSWORD,
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });

// const db = new Client({
//   host: result.parsed.AIVEN_HOST,
//   port: result.parsed.AIVEN_PORT,
//   database: result.parsed.AIVEN_NAME,
//   user: result.parsed.AIVEN_USER,
//   password: result.parsed.AIVEN_PASSWORD,
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });
// db.connect();

module.exports = { db };
