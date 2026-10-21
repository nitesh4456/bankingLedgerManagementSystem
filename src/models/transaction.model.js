const mongoose = require("mongoose");
const transactionSchema = new mongoose.Schema({
    fromAccount:{
        type: mongoose.Types.ObjectId,
        ref: "account",
        required:[true, "Transaction must be associated with a from"],
        index:true
    },
    toAccount:{
        type:mongoose.Types.ObjectId,
        ref:"account",
        required:[true, "Transaction must be associated with a to"],
        index:true
    },
    status:{
        type:String,
        enum:{
            values:["PENDING", "COMPLETED", "FAILED", "REVERSED"],
            message:"Status can either be PENDING, COMPLETED, FAILED, REVERSED"
        },
        default:"PENDING"
    },
    amount:{
        type:Number,
        required:[true, "a transaction contain amount of the transaction"],
        min:[0, "transaction cant be of negative amount"]
    },
    idempotencyKey:{
        type:String,
        required:[true, "transaction must have unique idempotency key"],
        index:true,
        unique:true
    }

},{
    timestamps:true
})

transactionModel = mongoose.model("transaction", transactionSchema)
module.exports = transactionModel