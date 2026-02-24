import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import genToken from "../utils/token.js";
import { sendOtpEmail } from "../utils/mail.js";

export const signUp= async(req, res) => {
    try {
        const {fullName, email, password, mobile, role} = req.body;
        //check if user already exists
        let user = await User.findOne({email});
        if(user){
            return res.status(400).json({message:"User already exists"});
        }
        //validate password length
        if(password.length < 6){
            return res.status(400).json({message:"Password must be at least 6 characters long"});
        }
        //check mobile number length
        if(mobile.length<10){
            return res.status(400).json({message:"Mobile number must be at least 10 digits long"});
        }
        //hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        //create new user
        user= await User.create({
            fullName,
            email,
            password:hashedPassword,
            mobile,
            role
        });

        const token= await genToken(user._id);
        res.cookie("token",token, {
            secure: false, //set to true in production
            sameSite: "strict",
            maxAge: 7*24*60*60*1000, //7 days
            httpOnly: true
        })

        res.status(201).json(user);

    } catch (error) {
        res.status(500).json({message:"Error creating user", error}); //server error so code 500
    }
}

export const signIn= async(req, res) => {
    try {
        const {email, password} = req.body;
        //check if user already exists
        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({message:"User does not exist"});
        }
        //compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(400).json({message:"Invalid credentials"});
        }
        const token= await genToken(user._id);
        res.cookie("token",token, {
            secure: false, //set to true in production
            sameSite: "strict",
            maxAge: 7*24*60*60*1000, //7 days
            httpOnly: true
        })
        res.status(200).json(user);

    } catch (error) {
        res.status(500).json({message:"Error signing in", error}); //server error so code 500
    }
}

export const signOut= async(req, res) => {
    try {
        res.clearCookie("token");
        res.status(200).json({message:"Signed out successfully"});
    } catch (error) {
        res.status(500).json({message:"Error signing out", error}); //server error so code 500
    }
}

export const sendOtp = async (req,res)=>{
    try{
        const {email} = req.body;
        const user= await User.findOne({email});
        if(!user){
            return res.status(400).json({message:"User does not exist"});
        }
        //generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        //save OTP to user document
        user.resetOtp = otp;
        user.otpExpires = Date.now() + 5*60*1000; //5 minutes
        user.isOtpVerified = false; //reset OTP verification status

        await user.save();

        //send OTP via email
        await sendOtpEmail(email, otp);
        res.status(200).json({message:"OTP sent successfully"});
    }
    catch (error) {
        
        console.error("Error signing in:", error);
        res.status(500).json({message:"Error sending OTP", error}); //server error so code 500
    }
}

export const verifyOtp = async (req,res)=>{
    try{
        const {email, otp} = req.body;
        const user= await User.findOne({email});
        if(!user){
            return res.status(400).json({message:"User does not exist"});
        }
        //check if OTP is valid
        if(user.resetOtp !== otp){
            return res.status(400).json({message:"Invalid OTP"});
        }
        //check if OTP is expired
        if(user.otpExpires < Date.now()){
            return res.status(400).json({message:"OTP has expired"});
        }
        //mark OTP as verified
        user.isOtpVerified = true;
        user.resetOtp = null; //clear OTP after verification
        user.otpExpires = null; //clear OTP expiration time
        //save user document
        await user.save();
        res.status(200).json({message:"OTP verified successfully"});
    } catch (error) {
        res.status(500).json({message:"Error verifying OTP", error}); //server error so code 500
    }
}

export const resetPassword = async (req,res)=>{
    try{
        const {email, newPassword} = req.body;
        const user= await User.findOne({email});

        if(!user){
            return res.status(400).json({message:"User does not exist"});
        }
        //check if OTP is verified
        if(!user.isOtpVerified){
            return res.status(400).json({message:"OTP not verified"});
        }

        //hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        //update user password
        user.password = hashedPassword;
        user.isOtpVerified = false; //reset OTP verification status
        await user.save();
        res.status(200).json({message:"Password reset successfully"});
    } catch (error) {
        res.status(500).json({message:"Error resetting password", error}); //server error so code 500
    }
}

//use both in sign up and sign in
//if user is signing up with google for the first time then create a new user document in the database 
//and if user already exists then just sign in the user and send token
export const googleAuth = async (req,res) => {
    try{
        const {email, fullName, mobile, role} = req.body;
        //check if user already exists
        let user = await User.findOne({email}); 
        if(user){
            //user already exists, just sign in the user and send token
            const token= await genToken(user._id);
            res.cookie("token",token, {
                secure: false, //set to true in production
                sameSite: "strict",
                maxAge: 7*24*60*60*1000, //7 days
                httpOnly: true
            })
            return res.status(200).json(user);
        }
        else{
            //user does not exist, create a new user document in the database
            user= await User.create({
                fullName,
                email,
                mobile,
                role,
                password: null //no password since user is signing up with google
            });
        }
    
    }
    catch (error) {
        res.status(500).json({message:"Error with Google authentication", error}); //server error so code 500
    }
}
