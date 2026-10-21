const express = require('express');
const authController = require("../cotrollers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware")

const router = express.Router();
/*
* POST /api/auth/register
*/
router.post("/register", authController.userRegisterController);
/*
* POST /api/auth/login
*/
router.post("/login", authController.userLoginController)
/*
* POST /api/auth/logout
 */
router.post("/logout",authMiddleware.authMiddleware , authController.userLogoutController)
module.exports = router;