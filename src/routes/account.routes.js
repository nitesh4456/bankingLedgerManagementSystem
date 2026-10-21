const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const accountController = require('../cotrollers/account.controller');


/*
* - POST /api/account
  - Create A New Account
  - Protected Route
*/
router.post("/", authMiddleware.authMiddleware, accountController.createAccountController);

/*
* - GET /api/account
  - get All Accounts of the user
  - Protected Route
*/
router.get("/", authMiddleware.authMiddleware, accountController.getUserAccountsController);

/*
* - GET /api/account/balance/:accountId
  - get balance of user account
  - Protected Route
*/

router.get("/balance/:accountId",authMiddleware.authMiddleware, accountController.getUserAccountBalanceController);



module.exports = router;