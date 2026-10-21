const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dbgr = require("debug")("development:user.model");
const userSchema = new mongoose.Schema({
    email:{
        type:String,
        required:[true, "Email is required for creating an account"],
        unique :[true, "Email already exist"],
        trim: true,
        lowercase: true,
        match:[/^[^\s@]+@[^\s@]+\.[^\s@]+$/]
    },
    name:{
        type:String,
        required:[true, "Name is required for creating an account"],
        lowercase:true
    },
    password:{
        type:String,
        required:[true, "Password is required to create an account"],
        minlength: [6, "password should contain more than 6 characters"],
        select:false
    },
    systemUser:{
        type:Boolean,
        default:false,
        immutable:[true, "systemUser field cant be make true programmaticaly. make it true via DATABASE"],
        select:false
    }
}, {
    timestamps:true
})

userSchema.pre("save", async function (){/// middleware before saving any user
    if(!this.isModified("password")){// this refers to current user
        return ;
    }else{
        const hash = await bcrypt.hash(this.password,10);
        this.password = hash;
        return ;
    }
})

userSchema.methods.comparePassword = async function(password){
    return await bcrypt.compare(password, this.password);
}

const userModel = mongoose.model("user",userSchema);
module.exports = userModel;