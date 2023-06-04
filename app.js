const express = require("express");
const app = express();
const cors = require("cors");
const { db } = require("./db");
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

app.get("/transactions/:id", async (req, res) => {
  const acc_ktp = req.params.id;
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

app.post("/transactions/:id", async (req, res) => {
  const acc_ktp = req.params.id;
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
  const acc_ktp = 1111222233334444;
  try {
    const allInvoices = await db.query(
      `
    SELECT * FROM LOAN_INVOICE
    INNER JOIN TRANSACTION
    ON LI_T_ID = T_ID
    WHERE T_ACC_KTP_NUM = $1
    ORDER BY LI_DUE_DATE;`,
      [acc_ktp]
    );
    res.json(allInvoices.rows);
  } catch (err) {
    console.log(err);
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server has started on port ${port}`);
});
