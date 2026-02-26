import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
export const sendOtpEmail = async (to, otp) => {
    try {
        await tranEmailApi.sendTransacEmail({
            sender: {
                email: process.env.BREVO_SENDER_EMAIL,
                name: "BiteBuddy",
            },
            to: [{ email: to }],
            subject: "Your OTP for BiteBuddy",
            htmlContent: `
        <p>Your OTP is <strong>${otp}</strong>.</p>
        <p>It expires in 5 minutes.</p>
      `,
        });

        return true; // ✅ IMPORTANT
    } catch (error) {
        console.error("Brevo OTP email failed:", error?.response?.body || error);
        return false; //  DO NOT THROW
    }
};

export const sendDeliveryOtpEmail = async (email, otp) => {
  try {
    const response = await tranEmailApi.sendTransacEmail({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: "BiteBuddy",
      },
      to: [{ email }],
      subject: "Delivery OTP",
      htmlContent: `
        <p>Your delivery OTP is <strong>${otp}</strong>.</p>
        <p>It expires in 5 minutes.</p>
      `,
    });

    console.log("BREVO RESPONSE:", response);
    return true; //  MUST RETURN
  } catch (error) {
    console.error(
      "Brevo delivery OTP failed:",
      error?.response?.body || error
    );
    return false; //  MUST RETURN
  }
};

