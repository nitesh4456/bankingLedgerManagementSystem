const dbgr = require("debug")("development:server");
require("dotenv").config();
const app = require("./src/app");
const connectToDb = require("./src/config/db")

connectToDb()
.then(()=>{
    app.listen(3000, ()=>{
        dbgr("server is running on port 3000");
    })
})
.catch((err)=>{
    dbgr("server creation failed");
    dbgr(err.message);
})