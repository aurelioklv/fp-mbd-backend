const express = require("express");
const app = express();
const cors = require("cors");
const { db } = require("./db");
const session = require("express-session");
const store = new session.MemoryStore();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "rahasiabanget",
    cookie: {
      maxAge: 30000,
    },
    resave: false,
    saveUninitialized: false,
    store,
  })
);

// app.use((req, res, next) => {
//   console.log(store);
//   next();
// });

const acc_ktp = 3504098213010001;

app.use(express.static("public"));

app.get("/account", async (req, res) => {
  const { email, ktp } = req.query;
  try {
    if (email) {
      const acc = await db.query("SELECT * FROM ACCOUNT WHERE ACC_EMAIL = $1", [
        email,
      ]);
      if (acc.rows.length === 0) {
        return res.json({ email_exists: false }); // Account not found
      }
      res.json({ email_exists: true });
    } else if (ktp) {
      const acc = await db.query(
        "SELECT * FROM ACCOUNT WHERE ACC_KTP_NUM = $1",
        [ktp]
      );
      if (acc.rows.length === 0) {
        return res.json({ ktp_exists: false }); // Account not found
      }
      res.json({ ktp_exists: true });
    } else {
      const acc = await db.query(
        "SELECT * FROM ACCOUNT WHERE ACC_KTP_NUM = $1",
        [acc_ktp]
      );
      res.json(acc.rows);
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.post("/account", async (req, res) => {
  try {
    const data = req.body;
    const new_acc = await db.query(
      `INSERT INTO ACCOUNT(
          ACC_KTP_NUM,
          ACC_AT_ID,
          ACC_NAME,
          ACC_EMAIL,
          ACC_PHONE_NUM,
          ACC_ADDRESS,
          ACC_BANK_NUM,
          ACC_BANK,
          ACC_JOB,
          ACC_SALARY,
          ACC_REG_DATE,
          ACC_EMERGENCY_PHONE_NUM,
          ACC_EMERGENCY_CONTACT_RELATIONSHIP,
          ACC_RATING,
          ACC_BALANCE,
          ACC_BIOLOGICAL_MOTHER_NAME,
          ACC_PASSWORD
        )
        VALUES (
          $1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, NOW(),  $10, $11, DEFAULT, NULL, $12, $13
        )`,
      [
        data.ktp,
        data.name,
        data.email,
        data.phone,
        data.address,
        data.bank_num,
        data.bank,
        data.job,
        data.salary,
        data.emergency_contact,
        data.emergency_contact_rel,
        data.mother,
        data.password,
      ]
    );
    res.redirect("login.html");
    // res.sendStatus(200).json({ message: "Terdaftar" });
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
