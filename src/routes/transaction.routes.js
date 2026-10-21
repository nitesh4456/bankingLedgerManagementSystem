const express = require("express")
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const transactionController = require("../cotrollers/transaction.controller");
/*
 * - POST /api/transaction/ 
 * - Create a new transacation
 */
router.post("/", authMiddleware.authMiddleware, transactionController.createTransaction)


//approach 1st introduce another middleware and place in line  ;  router.post("/", authMiddleware.authMiddleware, authmiddleware.systemAuthMiddleware ,transactionController.createTransaction)
//approach 2nd introduce diff middleware for system user and diff controller for transaction
/*
 * - POST /api/transaction/system/initial-funds 
 * - Create a initial fund transaction from system user
 */
router.post("/system/initial-funds",  authMiddleware.systemAuthMiddleware, transactionController.createInitialFundsTransaction)

module.exports = router;