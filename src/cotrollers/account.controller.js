const express = require("express");
const accountModel = require("../models/account.model");
const userModel = require("../models/user.model");
const dbgr = require("debug")("development:account.controller");
const mongoose = require('mongoose')
async function createAccountController(req,res){
    try{
        const user = req.user;
        const userAccountCount = await accountModel.countDocuments({userId:user._id});
        if(userAccountCount >= 5){
            return res 
            .status(451)
            .json({"message":"user can only have atmost 5 accounts"});
        }

        const userWithSystemUserField = await userModel.findOne({_id:user._id}).select("+systemUser")

        if(userWithSystemUserField.systemUser && userAccountCount >= 1){
            return res 
            .status(451)
            .json({"message":"system user can only have atmost 1 account"});
        }

        const account = await accountModel.create({userId:user._id});
        return res
        .status(201)
        .json(account);
    }
    catch(e){
        return res
        .status(500)
        .json({"err-message":String(e)});
    }
}

async function getUserAccountsController(req,res){
    const accounts = await accountModel.find({userId : req.user._id})
    return res.status(200).json({
        accounts
    })
}

async function getUserAccountBalanceController(req,res){
    // params: [Object: null prototype] { accountId: '6ad08bba6677be48391a60a4' },
    const {accountId} = req.params
    if(!mongoose.Types.ObjectId.isValid(accountId)){// e.g     // params: [Object: null prototype] { accountId: ':6ad08bba6677be48391a60a4' },
        return res.status(400).json({
            message:"invalid accountId format"
        })
    }
    const account = await accountModel.findOne({
        userId: req.user._id,
        _id : accountId
    })
    if(!account){
        return res.status(401).json({
            message:"user cant access balance of another user's account"
        })
    }
    return res.status(200).json({
        accountId,
        balance: await account.getBalance()
    })
}


module.exports ={
    createAccountController,
    getUserAccountsController,
    getUserAccountBalanceController
}