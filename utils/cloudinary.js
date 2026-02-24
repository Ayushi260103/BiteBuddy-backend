import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs';
import dotenv from 'dotenv'
dotenv.config();

export const uploadOnCloudinary = async (file) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    try {
        const result = await cloudinary.uploader.upload(file);
        //delete from local storage after uploading to cloudinary
        fs.unlinkSync(file);

        return result.secure_url; // Return the URL of the uploaded image
     } catch (err) {
        fs.unlinkSync(file); // Delete the file from local storage in case of an error
        console.error("Error uploading to Cloudinary", err);
     }    
}
