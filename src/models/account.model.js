const mongoose = require("mongoose");
const ledgerModel =  require("../models/ledger.model")
const accountSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:[true, "Account must be associated with a user"],
        index:true
    },
    status:{
        type:String,
        enum:{
            values:["ACTIVE","FROZEN","CLOSED"],
            message:"Status can be either ACTIVE, FROZEN, CLOSED"
        },
        default:"ACTIVE"
    },
    currencry:{
        type:String,
        required:[true,"Currency is required to create an account"],
        default:"INR"
    },
    systemUser:{
        type:Boolean,
        default:false,
        immutable:[true,"systemUser field cant be modified programmatically. Make it true using DATABASE for using the account"],
        select:false
    }


},{
    timestamps:true
})

accountSchema.index({userId:1, status:1}); ///compound index
accountSchema.methods.getBalance = async function(){
    //aggregation pipeline to calculate the balance of the account using ledger entries
    const balanceData = await ledgerModel.aggregate([
        {$match : {account:this._id}},
        {
            $group :{
                _id:null,
                totalCredit:{
                    $sum:{
                        $cond:[
                            {$eq:["$type","CREDIT"]},
                            "$amount",
                            0
                        ]
                    }
                },
                totalDebit:{
                    $sum:{
                        $cond:[
                            {$eq:["$type","DEBIT"]},
                            "$amount",
                            0
                        ]
                    }
                }
            }
        },
        {
            $project:{
                _id:0,
                balance:{$subtract:["$totalCredit","$totalDebit"]}
            }
        }
    ])// aggregation pipeline --- array of steps
    if(balanceData.length === 0){
        return 0
    }
    return balanceData[0].balance
}
module.exports=mongoose.model("account",accountSchema);