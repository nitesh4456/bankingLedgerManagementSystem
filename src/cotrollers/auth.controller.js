const userModel = require("../models/user.model");
const tokenBlackListModel = require("../models/blacklist.model")
const jwt = require("jsonwebtoken");
const dbgr = require("debug")("development:auth.controller");
// const {sendRegistrationEmail} = require("../services/email.service");
const emailService = require("../services/email.service");


/** 
* - user register controller
* - api/auth/register
*/
async function userRegisterController(req,res){
    try{
        const {email, name, password} = req.body;
        const isExists = await userModel.findOne({email});
        if(isExists){
            return res
            .status(422)
            .json({"message":"invalid email or password"});
        }
        const user = await userModel.create({email,name,password});
        const token = jwt.sign({userId:user._id}, process.env.JWT_KEY, {expiresIn:"1hr"});
        res.cookie("token",token);
        res.status(201).json({
            user:{
                "_id" : user._id,
                "email": user.email,
                "name":user.name
            },
            token
        })

        await emailService.sendRegistrationEmail(user.email, user.name);
    }
    catch(err){
        return res
        .status(500)
        .json({"error-message":err.message});
    }
}

/**
 * - user login controller
 * - POST /api/auth/login 
*/
async function userLoginController(req,res){
    try{
        const {email,password} = req.body;
        const user = await userModel.findOne({email}).select("+password");
        if(!user){
            return res
            .status(401)
            .json({"message":"email or passowrd is invalid"});
        }


        const isValidPassword = await user.comparePassword(password);
        if(!isValidPassword){
            return res
            .status(401)
            .json({"message":"email or password is invlaid"});
        }

        const token = jwt.sign({"userId":user._id},process.env.JWT_KEY, {expiresIn:"1hr"});
        res.cookie("token",token);
        res.status(200).json({
            user:{
                "_id" : user._id,
                "email": user.email,
                "name":user.name
            },
            token
        })
    }
    catch(err){
        return res
        .status(500)
        .json({"err-message":err.message});
    }


}

/*
* controller for userLogout
 */
async function userLogoutController(req,res){
    const {token} = req.cookies
    if(!token){
        res.status(400).json({
            message:"unauthorized access , token is missing"
        })
    }
    
    // //approach 1st;
    // res.clearCookie("token");
    // //clearCookie just do 2 things
    //     // i) it set the cookie to empty strig i.e  token ="";
    //     //ii) it modifies the expiray date of the cookie to current time 
    //     //iii- and browsers sees the PAST EXPIRAY time of cookie and deletes it,, (note:- postman does not perform step 2nd)
    //     // note:- this method is client dependent and not secured (as user can re-user the token if he copies it before deletion)
    
    // approach 2nd is TOKEN BLACKLISTING 
    res.clearCookie("token"); //the basic thing
    //will use it to prevent access if copies older token
    await tokenBlackListModel.create({
        token
    })
    res.status(200).json({
        message:"user logout successfully",
        user:{
            email:req.user.email,
            name:req.user.name
        }
    });
}

module.exports ={
    userRegisterController,
    userLoginController,
    userLogoutController
};