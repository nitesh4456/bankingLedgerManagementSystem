const mongoose = require("mongoose")
const ledgerSchema = new mongoose.Schema({
    account:{
        type:mongoose.Types.ObjectId,
        ref:"account",
        required:[true,"evey ledger belongs to an account"],
        index:true,
        immutable:true
    },
    amount:{
        type:Number,
        required:[true, "ledger must contain an amount"],
        min:[0, "ledger cant have a negative value"],
        immutable:true
    },
    transaction:{
        type:mongoose.Types.ObjectId,
        ref:"transaction",
        required:[true, "every ledger is associated with a transaction"],
        immutable:true,
        index:true
    },
    type:{
        type:String,
        enum:{
            values:["DEBIT", "CREDIT"],
            message:"any ledger is either of DEBIT or CREDIT"
        },
        required:[true, "ledger must contain its type"],
        immutable:true
    }
},{timestamps:true})


function preventFromLedgerModification(){
    throw new Error("Ledger entries are immutable and cant be modified or deleted")
}

ledgerSchema.pre("findOneAndDelete",preventFromLedgerModification)
ledgerSchema.pre("deleteMany",preventFromLedgerModification)
ledgerSchema.pre("deleteOne",preventFromLedgerModification)
ledgerSchema.pre("findOneAndUpdate",preventFromLedgerModification)
ledgerSchema.pre("findOneAndReplace",preventFromLedgerModification)
ledgerSchema.pre("updateOne",preventFromLedgerModification)
ledgerSchema.pre("deleteOne",preventFromLedgerModification)
ledgerSchema.pre("remove",preventFromLedgerModification)
//find a better approach to prevent from ledger modification



ledgerModel = mongoose.model("ledger",ledgerSchema)
module.exports = ledgerModel