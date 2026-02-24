import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Create a transporter using Ethereal test credentials.
// For production, replace with your actual SMTP server details.

dotenv.config();
const transporter = nodemailer.createTransport({
  service: "Gmail",
  port: 465,
  secure: true, // Use true for port 465, false for port 587
  auth: {
    user: process.env.EMAIL, // Your email address
    pass: process.env.APP_PASSWORD // Your email password or app password,
  },
});

export const sendOtpEmail = async (to, otp) => {
    try{
        await transporter.sendMail({
            from: process.env.EMAIL,
            to: to,
            subject: "Your OTP for BiteBuddy",
            html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes</p>`
        });
    } catch (error) {
        throw error;
    }
}


export const sendDeliveryOtpEmail = async (user, otp) => {
    try{
        await transporter.sendMail({
            from: process.env.EMAIL,
            to: user.email,
            subject: "Delivery otp",
            html: `<p>Your OTP for delivery is <strong>${otp}</strong>. It expires in 5 minutes</p>`
        });
    } catch (error) {
        throw error;
    }
}