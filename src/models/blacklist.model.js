const mongoose = require('mongoose')
const blacklistSchema = new mongoose.Schema({
        token:{
            type : String,
            required:[true, "blacklisting required token to blacklist"],
            unique:[true, "single use token"],
        }
    },
    {timestamps:true}
)
blacklistSchema.index(
    {createdAt:1},
    {expireAfterSeconds:60*60*24*3}//3days TTL to autoDelete
)
module.exports = mongoose.model("blacklist",blacklistSchema)