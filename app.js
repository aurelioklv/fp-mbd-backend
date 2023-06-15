const express = require("express");
const app = express();
const cors = require("cors");
const { db } = require("./db");
const session = require("express-session");
const crypto = require("crypto-js");
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
    const acc = await db.query("SELECT * FROM ACCOUNT WHERE ACC_EMAIL = $1", [
      email,
    ]);
    if (acc.rows.length === 1) {
      const storedPassword = acc.rows[0].acc_password;
      const hashedInputPassword = crypto.SHA256(password).toString();
      if (storedPassword === hashedInputPassword) {
        req.session.user = acc.rows[0];
        req.session.loggedIn = true;
        req.session.userKTP = acc.rows[0].acc_ktp_num;
        res.redirect("/home");
      } else {
        res.status(401).json({ message: "Incorrect Password" });
      }
    } else {
      res.status(404).json({ message: "User not found" });
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
    const hashedPassword = crypto.SHA256(data.password).toString();
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
        hashedPassword,
      ]
    );
    res.redirect("/login");
  } catch (err) {
    console.log(err.message);
  }
});

const updateUserDataMiddleware = async (req, res, next) => {
  try {
    if (req.session.loggedIn) {
      const acc = await db.query(
        "SELECT * FROM ACCOUNT WHERE ACC_KTP_NUM = $1",
        [req.session.user.acc_ktp_num]
      );
      req.session.user = acc.rows[0];
    }
    next();
  } catch (err) {
    console.log(err.message);
  }
};

app.get("/get-account-info", updateUserDataMiddleware, (req, res) => {
  try {
    if (req.session.loggedIn) {
      console.log(req.session.user);
      res.json({ user: req.session.user });
    } else {
      res.status(401);
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.get("/home", updateUserDataMiddleware, async (req, res) => {
  try {
    if (req.session.loggedIn) {
      const allInvoices = await db.query(
        `
        SELECT *
        FROM LOAN_INVOICE
        INNER JOIN TRANSACTION
        ON LI_T_ID = T_ID
        WHERE T_ACC_KTP_NUM = $1
        ORDER BY LI_DUE_DATE, LI_ID;`,
        [req.session.user.acc_ktp_num]
      );

      invoicesData = allInvoices.rows;
      res.render("home.ejs", {
        invoices: invoicesData,
        user: req.session.user,
      });
    } else {
      res.redirect("/login"); // Redirect to the login page if not logged in
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/admin", async (req, res) => {
  try {
    res.render("admin.ejs", {});
  } catch (err) {
    console.log(err.message);
  }
});

app.get("/account", updateUserDataMiddleware, async (req, res) => {
  try {
    if (req.session.loggedIn) {
      res.render("akun.ejs", { user: req.session.user });
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.post("/account", async (req, res) => {
  try {
    if (req.session.loggedIn) {
      const data = req.body;
      console.log(data);
      const updated = await db.query(
        `UPDATE ACCOUNT SET
          ACC_PHONE_NUM = $1,
          ACC_ADDRESS = $2,
          ACC_JOB = $3,
          ACC_SALARY = $4,
          ACC_BANK = $5,
          ACC_BANK_NUM = $6,
          ACC_EMERGENCY_PHONE_NUM = $7,
          ACC_EMERGENCY_CONTACT_RELATIONSHIP = $8
          WHERE ACC_KTP_NUM = $9;
        `,
        [
          data.phone,
          data.address,
          data.job,
          data.salary,
          data.bank,
          data.bank_num,
          data.emergency_contact,
          data.emergency_contact_rel,
          req.session.user.acc_ktp_num,
        ]
      );
      res.redirect("/account");
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.get("/loan", updateUserDataMiddleware, (req, res) => {
  try {
    if (req.session.loggedIn) {
      res.render("ajukanPeminjaman.ejs", { user: req.session.user });
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

app.get("/transaction", updateUserDataMiddleware, async (req, res) => {
  try {
    if (req.session.loggedIn) {
      const transactions = await db.query(
        "SELECT * FROM TRANSACTION WHERE T_ACC_KTP_NUM = $1 ORDER BY T_ID DESC",
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

app.post("/transaction", async (req, res) => {
  try {
    if (req.session.loggedIn) {
      const { loan, period } = req.body;
      const transactions = await db.query(
        `INSERT INTO TRANSACTION (
          T_ACC_KTP_NUM, T_LT_PERIOD,
          T_DATE,
          T_LOAN,
          T_MONTHLY_PAYMENT,
          T_PAYMENT_COUNT)
          VALUES($1, $2, date_trunc('second', CURRENT_TIMESTAMP), $3, NULL, 0);`,
        [req.session.user.acc_ktp_num, period, loan]
      );
      res.redirect("/transaction");
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/login");
  });
});

app.get("/invoice", updateUserDataMiddleware, async (req, res) => {
  try {
    if (req.session.loggedIn) {
      const id = req.query.id;
      const invoice = await db.query(
        "SELECT * FROM LOAN_INVOICE INNER JOIN TRANSACTION ON T_ID = LI_T_ID WHERE LI_ID = $1",
        [id]
      );
      const invoiceData = invoice.rows[0];
      res.render("bayar.ejs", { invoice: invoiceData, user: req.session.user });
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.post("/pay", async (req, res) => {
  try {
    if (req.session.loggedIn) {
      const id = req.body.id;
      const paid = await db.query(
        "UPDATE LOAN_INVOICE SET LI_STATUS = TRUE, LI_PAYMENT_DATE = NOW() WHERE LI_ID = $1",
        [id]
      );
      res.redirect("/home");
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
