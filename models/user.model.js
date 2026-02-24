import mongoose from "mongoose";
import { type } from "os";
const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String, //required:true is notset here bcoz if user wants then he can directly authenticate using google
    },
    mobile: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["user", "owner", "deliveryBoy"],
        required: true
    },
    resetOtp: {      //this field will store the OTP for password reset for some time
        type: String
    },
    isOtpVerified: { //this field will be used to check if the OTP is verified or not
        type: Boolean,
        default: false
    },
    otpExpires:{   //this field will store the expiration time of the OTP
        type:Date
    },
    location: {        //geojson format --- helps in writing queries
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates:{         // Mongo expects [lng, lat]
            type: [Number],
            default:[0,0]
        }
    },
    socketId:{
        type: String
    },
    isOnline: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });//timestamps will automatically add createdAt and updatedAt fields to the schema

userSchema.index({location: '2dsphere'});        //treats like map

const User = mongoose.model("User", userSchema);

export default User;