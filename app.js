const express = require("express");
const app = express();
const cors = require("cors");
const { db } = require("./db");
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server has started on port ${port}`);
});
