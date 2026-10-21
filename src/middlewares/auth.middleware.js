const express = require('express');
const jwt = require('jsonwebtoken');
const userModel = require("../models/user.model");
const tokenBlackListModel = require("../models/blacklist.model");

async function authMiddleware(req,res,next){
    try{
        let {token} = req.cookies;  
        //// add to check in headers as well;
        if(!token){
            return res
            .status(401)
            .json({
                "message":"token is required to access"
            })
        }
        // is token blacklisted
        const blackListedToken = await tokenBlackListModel.findOne(
            {token}
        )
        if(blackListedToken){
            return res
            .status(401)
            .json({
                message:"token is expired"
            })
        }
        const decoded_payload = jwt.verify(token,process.env.JWT_KEY) ;
        const user = await userModel.findById(decoded_payload.userId);
        if(!user){
            return res
            .status(401)
            .json({
                "message":"invalid token"
            })
        }
        req.user = user;//attach user details in the req for next controller
        return next();//forward to next controller
    }
    catch(e){
        return res
        .status(500)
        .json({
            "err-message":String(e)
        })
    }
}


async function systemAuthMiddleware(req,res,next){
    try{
        let {token} = req.cookies;  
        //// add to check in headers as well;
        if(!token){
            return res
            .status(401)
            .json({
                "message":"token is required to access"
            })
        }
        const blackListedToken = await tokenBlackListModel.findOne(
            {token}
        )
        if(blackListedToken){
            return res.status(401).json({
                message:"token is expired"
            })
        }
        const decoded_payload = jwt.verify(token,process.env.JWT_KEY) ;
        const user = await userModel.findById(decoded_payload.userId).select("+systemUser");
        if(!user){
            return res
            .status(401)
            .json({
                "message":"invalid token"
            })
        }

        if(!user.systemUser){
            return res.status(403).json({
                messagge: "forbidden access, not a system user"
            })
        }
        req.user = user;//attach user details in the req for next controller
        return next();//forward to next controller
    }
    catch(e){
        return res
        .status(500)
        .json({
            "err-message":String(e)
        })
    }
}

module.exports = {
    authMiddleware,
    systemAuthMiddleware
};

