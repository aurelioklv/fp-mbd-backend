const express = require("express");
const app = express();
const cors = require("cors");
const { db } = require("./db");
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.get("/transactions", async (req, res) => {
  const acc_ktp = "3525015201880002";
  try {
    const allTransaction = await db.query(
      "SELECT * FROM TRANSACTION WHERE T_ACC_KTP_NUM = $1 ORDER BY T_ID",
      [acc_ktp]
    );
    res.json(allTransaction.rows);
  } catch (err) {
    console.log(err.message);
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server has started on port ${port}`);
});
