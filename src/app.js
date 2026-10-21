const express = require("express");
const app = express();
const cookieParser = require('cookie-parser');
const path = require('path');

const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/account.routes") ;
const transactionRouter = require("./routes/transaction.routes");


app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(cookieParser());

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "/public")));

app.use("/api/auth", authRouter);
app.use("/api/account", accountRouter);
app.use("/api/transaction",transactionRouter);

module.exports = app;