const mongoose = require("mongoose");
const dbgr = require("debug")("development:db");
async function connectToDb(){
    // dbgr("database connection function hit")
    await mongoose.connect(process.env.MONGODB_URI)
    .then(()=>{
        dbgr("connected to mongodb cluster")
    })
    .catch((err)=>{
        dbgr("database connection error\n");
        dbgr(err.message+"\n");
        process.exit(1);
    })
}

module.exports = connectToDb;