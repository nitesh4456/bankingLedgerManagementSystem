const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")
const dbgr = require("debug")("development:transaction.controller")
const crypto= require('crypto')

/* - Create a new transaction
* THE 10-STEP TRANSFER FLOW:
* 1. Validate request
* 2. Validate idempotency key
* 3. Check account status
* 4. Derive sender balance from ledger
* 5. Create transaction (PENDING)
* 6. Create DEBIT ledger entry
* 7. Create CREDIT ledger entry
* 8. Mark transaction COMPLETED
* 9. Commit MongoDB session
* 10. Send email notification
*/

async function createTransaction(req,res){
    /*
     * 1.Validate Request
     */
    const {fromAccount, toAccount, amount, idempotencyKey} =req.body;
    //N-> fromAccount should be of the user who make request to the api of this controller i.e. POAT /api/transaction
    if(!fromAccount || !toAccount || !amount || !idempotencyKey){
        return res.status(400).json(
            {message:"fromAccount, toAccount, amount, idempotencyKey is required"
        })
    }
    const fromUserAccount = await accountModel.findOne({
        _id:fromAccount
    })
    const toUserAccount = await accountModel.findOne({
        _id:toAccount
    })
    if(!fromUserAccount || !toUserAccount){
        return res.status(400).json({
            message:"Invalid FromAccount or ToAccount"
        })
    }

    /*
    * 2. Validate idempotencyKey  (this is optional as the idempotnecyKey field was set to be unique)
    * check does a transaction exist with the same idempotncyKey
    */
    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey
    })
    if(isTransactionAlreadyExists){
        if(isTransactionAlreadyExists.status === "PENDING"){
            return res.status(200).json({
                message:"Transaction is still processing"
            })
        }
        else if(isTransactionAlreadyExists.status === "COMPLETED"){
            return res.status(200).json({
                message:"Transaction already processed",
                transaction:isTransactionAlreadyExists
            })
        }
        else if(isTransactionAlreadyExists.status === "FAILED"){
            return res.status(500).json({
                message:"Transaction processing failed , pleade retry"
            })
        }
        else if(isTransactionAlreadyExists.status === "REVERSED"){
            return res.status(500).json({
                message:"Transaction processing reversed , pleade retry"
            })
        }
        else{
            return res.status(400).json({
                message:"invalid transaction status"
            })
        }
    }

    /* 
    * 3. Check Account Status
    */
    if(fromUserAccount.status !=="ACTIVE" || toUserAccount.status !== "ACTIVE"){
        return res.status(400).json({
            message:"both fromAccount and toAccount must be ACTIVE to perform a transaction"
        })
    }

    /*
     *  the idempotency key check was done outside the session-transaction
    *   therefore two request with same idempotnecy key from the same user will pass the idempotency check (still both the trasaction processing) 
    *   although one of the request will
    *       commitTransaction
    *               after control passes to second request
    *               second request tries to made  an transaction entry with the same idempotnecy key
    *               but since one has already made 1 transaction entry with same idempotncy key,  the second request will encounter 
    *               ``duplicate key error ```` (bcz the idempotnecy key field in transaction model was set to be ``unique```) 
    *               then second request will be aborted in the catch(err) ()
    *        abortTransaction
    *           first request made no changes to the database (as aborted or roll back the changes) 
    *           the second request tries to add a transactin entry with the same idempotency key
    *           but no entry with same transaction earlier made, the second request will perform normally
    *               no depending on the cases;
    *                   second request will commitTransaction or abortTransaction      
    */
    const session = await mongoose.startSession();
    requestId = crypto.randomUUID();

    /*
        * 5. Create transaction (PENDING)
        * provide``` PENDING transaction handlers``` properly
        * we made a transaction so that new transaction with same idempotency can be identified
    */
    /**returns an array therefore we are destructuring  i.e [transaction] */
    dbgr(`requestId: ${requestId}, sessionId: ${session.id.id.toString('hex')} -- transaction creation`)
    const [transaction] = await transactionModel.create(
        //array of objects i.e we are using ````multi-document ```` approach (i.e some documents added to the database and
        [
            {
            fromAccount:fromUserAccount._id,
            toAccount:toUserAccount._id,
            amount,
            idempotencyKey,
            status:"PENDING"
            }
        ],
        {session}
    )


    session.startTransaction();
    /// N-> all the code part below till session.endTransaction() will execute "Whole" otherwise "None"(i.e. that is ``rolled back``)
    try{
        /*
        * 4.  Derive sender balance from ledger
        * balance fectching is in the session-transaction (i.e bcz diff transaction can modify the database)
        */
        const balance = await fromUserAccount.getBalance()
        dbgr(`requestId: ${requestId}, sessionId: ${session.id.id.toString('hex')} -- balance check `)
        if(balance < amount ){
            await transactionModel.findOneAndDelete(
                {   
                    idempotencyKey,
                    status:"PENDING"
                })
            await session.commitTransaction(),
            session.endSession()
            return res.status(400).json({
                message:`Insufficeint balance . Current balance is ${balance}. Requested amount is ${amount}.`
            })
        }
        
        /*
        * 6. Create DEBIT ledger entry
        */
        /**returns an array therefore we are destructuring  i.e [debitLedgerEntry] */
        dbgr(`requestId: ${requestId}, sessionId: ${session.id.id.toString('hex')} -- debit creation`)
        const [debitLedgerEntry] = await ledgerModel.create(
            [
                {
                account:fromUserAccount._id,
                amount,
                transaction:transaction._id,
                type:"DEBIT",
                }
            ],
            {session}
        )

        /*
        * simulation of network issue of n sec
        * such that debit ledger entries is added in the database but the credit ledger entry stucked (or a long time)
        */
            
        // console.time(`Debit-to-credit delayrequestId: ${requestId}, sessionId: ${session.id.id.toString('hex')}`); 
        // console.log(`requestId: ${requestId}, sessionId: ${session.id.id.toString('hex')}---  Before delay : `, new Date().toISOString());
        // await new Promise(resolve => setTimeout(resolve, 50_000));
        // console.log(`requestId: ${requestId}, sessionId: ${session.id.id.toString('hex')} -- After delay :`, new Date().toISOString());
        // console.time(`Debit-to-credit delayrequestId: ${requestId}, sessionId: ${session.id.id.toString('hex')}`); 
        // throw "error"

        /*
        * 7. Create CREDIT ledger entry
        */
        dbgr(`requestId: ${requestId}, sessionId: ${session.id.id.toString('hex')} -- credit creation`)
        const [creditLedgerEntry] = await ledgerModel.create(
            [
                {
                account:toUserAccount._id,
                amount,
                transaction:transaction._id,
                type:"CREDIT",
                }
            ],
            {session}
        )
        /*
        * 8. Mark transaction COMPLETED
        */
        dbgr(`requestId: ${requestId}, sessionId: ${session.id.id.toString('hex')} -- transaction status competing`)
        transaction.status = "COMPLETED"
        await transaction.save({session})

        /*
        * 9. Commit MongoDB session
        */
        dbgr(`requestId: ${requestId}, sessionId: ${session.id.id.toString('hex')} -- transaction commiting`)
        await session.commitTransaction(),
        dbgr(`requestId: ${requestId}, sessionId: ${session.id.id.toString('hex')} -- transaction committed`)
        session.endSession()

        /*
        * 10. Send email notification
         */
        // await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toUserAccount._id)
        return res.status(201).json({
            message:"Transaction completed successfully",
            transaction:transaction
        })
    }
    catch(err){
        dbgr(err)
        if(session.inTransaction()){
            //if due to internal error the previous transaction provides err then abort it and roll back the changes
            await session.abortTransaction();            //roll back uncommited changes  (entries of debit or ledger or both)
            
            //approach 1st //delete the Pending transaction 
            // await transactionModel.findOneAndDelete({
            //     idempotencyKey,
            //     status:"PENDING"
            // })
            // session.endSession();
            // return res.status(500).json({
            //     message:"the current transacion is aborted (i.e. cancelled) due to some ineternal/network/other errors , pls re-try",
            //     err
            // })
            
            //approach 2nd: make the transaction entry with FAILED status
            transaction.status = "FAILED"
            await transaction.save({session})
            session.endSession();
            return res.status(500).json({
                message:"the current transacion failed  due to an unknown error (i.e. server/network/other errors ) , pls re-try the transaction with diff idempotencyKey",
                err
            })
        }
        return res.status(500).json({
            message:"transaction completed succefully,( but other related functionlaties made an error)",
            // [if want the related functionalities to be done with the transaction otherwsei abort transaction then include the related functionalities inside session-transaction"
            transaction
        })
    }
}

async function createInitialFundsTransaction(req,res){
    /*
     * 1.Validate Request
     */
    const {toAccount, amount, idempotencyKey} = req.body
    if(!toAccount ||  !amount || !idempotencyKey){
        return res.status(400).json({
            message:"toAccount, amount, idempotencyKey is required"
        })
    }
    
    const toUserAccount = await accountModel.findOne({
        _id : toAccount
    })
    if(!toUserAccount){
        return res.status(400).json({
            message: "invalid toAccount"
        })
    }
    /*
    * assumption that system user will have single account
     */
    const fromUserAccount = await accountModel.findOne({
        systemUser:true,
        userId:req.user._id
    })
    if(!fromUserAccount){
        return res.status(500).json({
            message:"system user account cant be find"
        })
    }

    //fromUserAccount, //toUserAccount, // amount , //idempotencyKey

    /*
    * 2. Validate idempotencyKey
    */
    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey
    })
    if(isTransactionAlreadyExists){
        if(isTransactionAlreadyExists.status === "PENDING"){
            return res.status(200).json({
                message:"Transaction is still processing"
            })
        }
        else if(isTransactionAlreadyExists.status === "COMPLETED"){
            return res.status(200).json({
                message:"Transaction already processed",
                transaction:isTransactionAlreadyExists
            })
        }
        else if(isTransactionAlreadyExists.status === "FAILED"){
            return res.status(500).json({
                message:"Transaction processing failed , pleade retry"
            })
        }
        else if(isTransactionAlreadyExists.status === "REVERSED"){
            return res.status(500).json({
                message:"Transaction processing reversed , pleade retry"
            })
        }
        else{
            return res.status(400).json({
                message:"invalid transaction status"
            })
        }
    }

    /* 
    * 3. Check Account Status
    */
    if(!fromUserAccount.status ==="ACTIVE" || !toUserAccount.status === "ACTIVE"){
        return res.status(400).json({
            message:"both fromAccount and toAccount must be ACTIVE to perform a transaction"
        })
    }

    /*
    * 4.  Derive sender balance from ledger
    * - we dont have to check the sender balance in initail fund transaction
    * - assumption -- initial fund is deposited in the form of cash
    * - for the deposit of cash 
    * --- i) make a debit entry in system account
    * ---ii) make a credit entery in user account
    * this transaction does not depends on balance of system account ( as new cash increase systsem account)
    * note:- debit in system account is increase of physical cash, credit in user account is increase in user account
    */
    
    const session = await mongoose.startSession()

    /*
    * 5. Create transaction (PENDING)
    */
    const [transaction] = await transactionModel.create(
        [
            {
            fromAccount:fromUserAccount._id,
            toAccount:toUserAccount._id,
            amount,
            idempotencyKey,
            status:"PENDING"
            }
        ],
        {session}
    )

    try{
    session.startTransaction()
    /// N-> all the code part below till session.endTransaction() will execute "Whole" otherwise "None" 
    // dbgr(`fromAccount:${fromUserAccount._id},
    //     toAccount:${toUserAccount._id},
    //     amount:${amount},
    //     idempotencyKey:${idempotencyKey},
    //     status:"PENDING")`)
    //         
        /*
        * 6. Create DEBIT ledger entry
         */
    const [debitLedgerEntry] = await ledgerModel.create(
        [
            {
            account:fromUserAccount._id,
            amount,
            transaction:transaction._id,
            type:"DEBIT",
            }
        ],
        {session}
    )
    // //simulation of error
    //     await new Promise(resolve => setTimeout(resolve, 50_000));
    //     throw "err"

        /*
        * 7. Create CREDIT ledger entry
         */
    const [creditLedgerEntry] = await ledgerModel.create(
        [
            {
            account:toUserAccount._id,
            amount,
            transaction:transaction._id,
            type:"CREDIT",
            }
        ],
        {session}
    )
        /*
        * 8. Mark transaction COMPLETED
         */
    transaction.status = "COMPLETED"
    await transaction.save({session})

        /*
        * 9. Commit MongoDB session
        */
    await session.commitTransaction(),
    session.endSession()
    
    /*
    * 10. Send email notification
     */
    // await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toUserAccount._id)
    return res.status(201).json({
        message:"Transaction completed successfully",
        transaction:transaction
    })
    }
    catch(err){
        if(session.inTransaction()){
            //roll back uncommited changes
            await session.abortTransaction();
            //mark the transaction as FAILED
            transaction.status = "FAILED"
            await transaction.save({session})
            //end the current session
            session.endSession()
            return res.status(500).json({
                message:"the current transacion failed  due to an unknown error (i.e. server/network/other errors ) , pls re-try the transaction with diff idempotencyKey",
                err
            })
        }
        return res.status(500).json({
            message:"transaction completed succefully,( but other related functionlaties made an error)",
            // [if want the related functionalities to be done with the transaction otherwsei abort transaction then include the related functionalities inside session-transaction"
            transaction
        })
    }
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}