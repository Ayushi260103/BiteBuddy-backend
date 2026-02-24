import express from "express";
import { signUp, signIn, signOut, sendOtp, verifyOtp, resetPassword, googleAuth } from "../controllers/auth.controllers.js";

const authRouter = express.Router();

authRouter.post("/signup", signUp); //signup route pr signUp controller ko call krna h 
authRouter.post("/signin", signIn);
authRouter.get("/signout", signOut); //signout is a get request because we are just clearing the cookie and not sending any data in the body
authRouter.post("/send-otp",sendOtp);
authRouter.post("/verify-otp", verifyOtp);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/google-auth",googleAuth);


export default authRouter;