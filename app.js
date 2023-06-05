const express = require("express");
const app = express();
const cors = require("cors");
const { db } = require("./db");
const session = require("express-session");
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "rahasiabanget",
    cookie: {
      sameSite: "strict",
    },
  })
);

const acc_ktp = 3504098213010001;

app.get("/account", async (req, res) => {
  try {
    const acc = await db.query("SELECT * FROM ACCOUNT WHERE ACC_KTP_NUM = $1", [
      acc_ktp,
    ]);
    res.json(acc.rows);
  } catch (err) {
    console.log(err.message);
  }
});

app.post("/account", async (req, res) => {
  try {
  } catch (err) {
    console.log(err.message);
  }
});

app.get("/transactions", async (req, res) => {
  try {
    const allTransaction = await db.query("SELECT * FROM TRANSACTION");
    res.json(allTransaction.rows);
  } catch (err) {
    console.log(err.message);
  }
});

app.get("/transactions", async (req, res) => {
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

app.post("/transactions", async (req, res) => {
  try {
    const { ...transaction } = req.body;
    // console.log(transaction);

    const newTransaction = await db.query(
      "INSERT INTO TRANSACTION (T_ACC_KTP_NUM, T_LT_PERIOD, T_DATE) VALUES($1, $2, date_trunc('second', NOW())) RETURNING *;",
      [acc_ktp, transaction.t_lt_period]
    );
    res.json(newTransaction.rows);
  } catch (err) {
    console.log(err.message);
  }
});

app.get("/invoices", async (req, res) => {
  try {
    const allInvoices = await db.query(
      `
      SELECT LI_ID, LI_T_ID, LI_STATUS, LI_DUE_DATE, LI_TOTAL_PAYMENT
      FROM LOAN_INVOICE
      INNER JOIN TRANSACTION
      ON LI_T_ID = T_ID
      WHERE T_ACC_KTP_NUM = $1
      ORDER BY LI_DUE_DATE, LI_ID;`,
      [acc_ktp]
    );
    res.json(allInvoices.rows);
  } catch (err) {
    console.log(err);
  }
});

app.post("/pay", (req, res) => {});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server has started on port ${port}`);
});
