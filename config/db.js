import mongoose from "mongoose";
import dns from "dns";

const connectDb = async () => {
  try {
    // Work around local resolver issues where Node can't resolve MongoDB SRV records.
    dns.setServers(["8.8.8.8", "1.1.1.1"]);

    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to database successfully");
  } catch (error) {
    console.log("Error connecting to database", error);
  }
};

export default connectDb;
