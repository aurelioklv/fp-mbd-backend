const express = require("express");
const app = express();
const cors = require("cors");
const { db } = require("./db");
const session = require("express-session");
const path = require("path");
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "rahasiabanget",
    cookie: {
      maxAge: 5 * 60 * 1000,
    },
    resave: false,
    saveUninitialized: false,
    rolling: true,
  })
);

app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  try {
    if (req.session.loggedIn) {
      res.redirect("/home");
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.get("/login", (req, res) => {
  try {
    if (req.session.loggedIn) {
      res.redirect("/home");
    } else {
      res.render("login.ejs");
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);
    const acc = await db.query(
      "SELECT * FROM ACCOUNT WHERE ACC_EMAIL = $1 AND ACC_PASSWORD = $2",
      [email, password]
    );
    if (acc.rows.length === 1) {
      req.session.user = acc.rows[0];
      req.session.loggedIn = true;
      req.session.userKTP = acc.rows[0].acc_ktp_num;
      res.redirect("/home");
    }
  } catch (err) {
    console.log(err.message);
  }
});

// Check if email exists
app.get("/check-email-exists", async (req, res) => {
  try {
    const { email } = req.query;
    const acc = await db.query("SELECT * FROM ACCOUNT WHERE ACC_EMAIL = $1", [
      email,
    ]);
    const emailExists = acc.rows.length > 0;
    res.json({ email_exists: emailExists });
  } catch (err) {
    console.log(err.message);
    res.sendStatus(500);
  }
});

//Check if KTP exists
app.get("/check-ktp-exists", async (req, res) => {
  try {
    const { ktp } = req.query;
    const acc = await db.query("SELECT * FROM ACCOUNT WHERE ACC_KTP_NUM = $1", [
      ktp,
    ]);
    const ktpExists = acc.rows.length > 0;
    res.json({ ktp_exists: ktpExists });
  } catch (err) {
    console.log(err.message);
    res.sendStatus(500);
  }
});

app.get("/signup", (req, res) => {
  try {
    if (req.session.loggedIn) {
      res.redirect("/home");
    } else {
      res.render("daftar.ejs");
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.post("/signup", async (req, res) => {
  try {
    const data = req.body;
    console.log(data);
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
    res.redirect("/login");
    // res.sendStatus(200).json({ message: "Terdaftar" });
  } catch (err) {
    console.log(err.message);
  }
});

app.get("/home", async (req, res) => {
  try {
    if (req.session.loggedIn) {
      const ktp = req.session.userKTP;
      const allInvoices = await db.query(
        `
        SELECT LI_ID, LI_T_ID, LI_STATUS, LI_DUE_DATE, LI_TOTAL_PAYMENT
        FROM LOAN_INVOICE
        INNER JOIN TRANSACTION
        ON LI_T_ID = T_ID
        WHERE T_ACC_KTP_NUM = $1
        ORDER BY LI_DUE_DATE, LI_ID;`,
        [ktp]
      );

      const acc = await db.query(
        "SELECT * FROM ACCOUNT WHERE ACC_KTP_NUM = $1",
        [ktp]
      );
      userData = acc.rows[0];
      invoicesData = allInvoices.rows;
      res.render("home.ejs", {
        invoices: invoicesData,
        user: userData,
      });
    } else {
      res.redirect("/login"); // Redirect to the login page if not logged in
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/account", async (req, res) => {
  try {
    if (req.session.loggedIn) {
      const ktp = req.session.user.acc_ktp_num;
      const acc = await db.query(
        "SELECT * FROM ACCOUNT WHERE ACC_KTP_NUM = $1",
        [ktp]
      );
      userData = acc.rows[0];
      res.render("akun.ejs", { user: userData });
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.put("/account", async (req, res) => {});

app.get("/loan", (req, res) => {
  try {
    if (req.session.loggedIn) {
      res.render("ajukanPeminjaman.ejs");
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.post("/confirm", async (req, res) => {
  try {
    if (req.session.loggedIn) {
      res.render("konfirmasiPeminjaman.ejs", {
        confirmation: req.body,
        user: req.session.user,
      });
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.get("/transaction", async (req, res) => {
  try {
    if (req.session.loggedIn) {
      const transactions = await db.query(
        "SELECT * FROM TRANSACTION WHERE T_ACC_KTP_NUM = $1",
        [req.session.user.acc_ktp_num]
      );
      const transactionData = transactions.rows;
      res.render("transaksi.ejs", {
        transactions: transactionData,
        user: req.session.user,
      });
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.listen(port, () => {
  console.log(`Server has started on port ${port}`);
});
