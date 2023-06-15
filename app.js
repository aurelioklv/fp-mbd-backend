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
    const total_pengguna = await db.query(
      "SELECT COUNT (*) AS TOTAL_ACCOUNT FROM ACCOUNT"
    );
    const total_account = total_pengguna.rows[0].total_account;

    const total_penalti = await db.query(
      "SELECT COUNT(LI_PENALTY) AS TOTAL_PENALTI FROM LOAN_INVOICE WHERE LI_PENALTY > 0 AND LI_STATUS = FALSE"
    );
    const total_penalty = total_penalti.rows[0].total_penalti;

    const frekuensi_periode = await db.query(
      "SELECT T_LT_PERIOD AS MOST_PICKED_PERIODE, COUNT(ACCOUNT.ACC_KTP_NUM) AS SUM FROM TRANSACTION INNER JOIN ACCOUNT ON ACCOUNT.ACC_KTP_NUM = TRANSACTION.T_ACC_KTP_NUM GROUP BY T_LT_PERIOD ORDER BY SUM DESC"
    );
    const period_frequency = frekuensi_periode.rows[0].most_picked_periode;

    const gaji_ratarata = await db.query(
      "SELECT ROUND(AVG(ACC_SALARY),2) AS AVERAGE_SALARY FROM ACCOUNT"
    );
    const average_salary = gaji_ratarata.rows[0].average_salary;

    const peminjaman_ratarata =
      await db.query(`SELECT ROUND(SUM(T.T_LOAN) / COUNT(DISTINCT A.ACC_KTP_NUM), 2) AS AVERAGE_LOAN_PER_MONTH
    FROM ACCOUNT A, transaction T
    WHERE T.T_ACC_KTP_NUM = A.ACC_KTP_NUM
    AND EXTRACT(MONTH FROM T.T_DATE) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM T.T_DATE) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY EXTRACT(MONTH FROM T.T_DATE), EXTRACT(YEAR FROM T.T_DATE);`);
    const average_loan_per_month =
      peminjaman_ratarata.rows[0].average_loan_per_month;

    const total_pinjaman = await db.query(
      "SELECT ROUND (SUM (T_LOAN),2) AS TOTAL_LOAN FROM TRANSACTION"
    );
    const total_loan = total_pinjaman.rows[0].total_loan;

    const peminjam_bermasalah =
      await db.query(`SELECT ACC_KTP_NUM, ACC_NAME, ACC_ADDRESS, ACC_PHONE_NUM, ACC_EMERGENCY_PHONE_NUM, ACC_EMERGENCY_CONTACT_RELATIONSHIP, ACC_RATING, T_LT_PERIOD,
		LI_T_ID, LI_ID, LI_NO, LI_STATUS, LI_TOTAL_PAYMENT
    FROM LOAN_INVOICE LI
    INNER JOIN TRANSACTION T ON LI.LI_T_ID = T.T_ID
    INNER JOIN ACCOUNT A ON A.ACC_KTP_NUM =  T.T_ACC_KTP_NUM
    WHERE LI.LI_PENALTY > 0 AND LI_STATUS = FALSE`);

    const akun_penalti =
      await db.query(`SELECT ACC_KTP_NUM, ACC_NAME, ACC_PHONE_NUM, ACC_ADDRESS, ACC_EMERGENCY_PHONE_NUM, ACC_EMERGENCY_CONTACT_RELATIONSHIP
    FROM LOAN_INVOICE LI
    INNER JOIN TRANSACTION T ON LI.LI_T_ID = T.T_ID
    INNER JOIN ACCOUNT A ON A.ACC_KTP_NUM =  T.T_ACC_KTP_NUM
    WHERE LI.LI_PENALTY > 0 AND LI_STATUS = FALSE
    GROUP BY A.ACC_KTP_NUM`);

    const penalty_account = akun_penalti.rows;

    const problem_loaner = peminjam_bermasalah.rows;
    const data_dashboard = {
      total_account,
      total_penalty,
      period_frequency,
      average_salary,
      average_loan_per_month,
      total_loan,
    };

    res.render("admin.ejs", {
      data_dashboard,
      problem_loaner,
      penalty_account,
    });
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
        "SELECT *, T_DATE AS log_date FROM TRANSACTION WHERE T_ACC_KTP_NUM = $1 ORDER BY T_ID DESC",
        [req.session.user.acc_ktp_num]
      );
      const transactionData = transactions.rows;
      const invoices = await db.query(
        "SELECT *, LI_DATE AS log_date FROM LOAN_INVOICE INNER JOIN TRANSACTION ON T_ID = LI_T_ID WHERE T_ACC_KTP_NUM = $1",
        [req.session.user.acc_ktp_num]
      );
      const invoicesData = invoices.rows;
      res.render("transaksi.ejs", {
        invoices: invoicesData,
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
      const new_transaction = await db.query(
        `INSERT INTO TRANSACTION (
          T_ACC_KTP_NUM, T_LT_PERIOD,
          T_DATE,
          T_LOAN,
          T_MONTHLY_PAYMENT,
          T_PAYMENT_COUNT)
          VALUES($1, $2, date_trunc('second', CURRENT_TIMESTAMP), $3, NULL, 0)
          RETURNING *;`,
        [req.session.user.acc_ktp_num, period, loan]
      );
      const transactions = await db.query(
        "SELECT *, T_DATE AS log_date FROM TRANSACTION WHERE T_ACC_KTP_NUM = $1 ORDER BY T_ID DESC",
        [req.session.user.acc_ktp_num]
      );
      const invoices = await db.query(
        "SELECT *, LI_DATE AS log_date FROM LOAN_INVOICE INNER JOIN TRANSACTION ON T_ID = LI_T_ID WHERE T_ACC_KTP_NUM = $1",
        [req.session.user.acc_ktp_num]
      );
      const invoicesData = invoices.rows;
      const transactionData = transactions.rows;
      const newTransactionData = new_transaction.rows[0];
      res.render("transaksi.ejs", {
        invoices: invoicesData,
        transactions: transactionData,
        user: req.session.user,
        newTransaction: newTransactionData,
      });
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
