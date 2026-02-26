// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';

// // Create a transporter using Ethereal test credentials.
// // For production, replace with your actual SMTP server details.

// dotenv.config();
// const resendApiKey = process.env.RESEND_API_KEY;
// const resendFromEmail = process.env.RESEND_FROM_EMAIL;

// const transporter = nodemailer.createTransport({
// //   service: "Gmail",
// host: "smtp.gmail.com",
//   port: 465,
//   secure: true, // Use true for port 465, false for port 587
//   connectionTimeout: 10000,
//   greetingTimeout: 10000,
//   socketTimeout: 15000,
//   auth: {
//     user: process.env.EMAIL, // Your email address
//     pass: process.env.APP_PASSWORD // Your email password or app password,
//   },
// });

// const sendViaResend = async ({ to, subject, html }) => {
//     if (!resendApiKey || !resendFromEmail) {
//         throw new Error("RESEND_API_KEY or RESEND_FROM_EMAIL is missing");
//     }

//     const response = await fetch("https://api.resend.com/emails", {
//         method: "POST",
//         headers: {
//             "Authorization": `Bearer ${resendApiKey}`,
//             "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//             from: resendFromEmail,
//             to: [to],
//             subject,
//             html
//         })
//     });

//     if (!response.ok) {
//         const errorBody = await response.text();
//         throw new Error(`Resend send failed: ${response.status} ${errorBody}`);
//     }
// };

// const sendMail = async ({ to, subject, html }) => {
//     // Render-friendly path (HTTPS egress)
//     if (resendApiKey && resendFromEmail) {
//         await sendViaResend({ to, subject, html });
//         return;
//     }

//     // Local/dev fallback
//     await transporter.sendMail({
//         from: process.env.EMAIL,
//         to,
//         subject,
//         html
//     });
// };

// export const sendOtpEmail = async (to, otp) => {
//     try{
//         await sendMail({
//             to,
//             subject: "Your OTP for BiteBuddy",
//             html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes</p>`
//         });
//     } catch (error) {
//         throw error;
//     }
// }


// export const sendDeliveryOtpEmail = async (to, otp) => {
//     try{
//         await sendMail({
//             to,
//             subject: "Delivery otp",
//             html: `<p>Your OTP for delivery is <strong>${otp}</strong>. It expires in 5 minutes</p>`
//         });
//     } catch (error) {
//         throw error;
//     }
// }

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create Gmail SMTP transporter (Render compatible)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD, // Gmail App Password
  },
});

// Verify SMTP connection (important for Render debugging)
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP ERROR:", error);
  } else {
    console.log("SMTP READY");
  }
});

export const sendOtpEmail = async (to, otp) => {
  try {
    await transporter.sendMail({
      from: `"BiteBuddy" <${process.env.EMAIL}>`,
      to,
      subject: "Your OTP for BiteBuddy",
      html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
    });
  } catch (error) {
    console.error("sendOtpEmail failed:", error);
    throw error;
  }
};

export const sendDeliveryOtpEmail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: `"BiteBuddy" <${process.env.EMAIL}>`,
      to: email,
      subject: "Delivery OTP",
      html: `<p>Your delivery OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
    });
  } catch (error) {
    console.error("sendDeliveryOtpEmail failed:", error);
    throw error;
  }
};
