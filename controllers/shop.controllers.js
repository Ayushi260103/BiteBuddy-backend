import Shop from "../models/shop.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


export const createEditShop = async (req, res) => {
    try{
        const {name, city, state, address}= req.body;
        let image;
        if(req.file){
            image = await uploadOnCloudinary(req.file.path); // Upload the image to Cloudinary and get the URL
        }

        let shop = await Shop.findOne({ owner: req.userId });
        // If shop doesn't exist, create a new one. If it exists, update the existing shop with new details
        if(!shop){
           shop = await Shop.create({
            name,
            city,
            state,
            address,
            image,
            owner: req.userId
        });
        }else{
            shop = await Shop.findByIdAndUpdate(shop._id, {
            name,
            city,
            state,
            address,
            image,
            owner: req.userId
        },{ returnDocument: 'after' } );
        }
        
        await shop.populate("owner items");
        return res.status(201).json(shop);
    }
    catch (error) {
        return res.status(500).json({ message: "Error creating shop", error: error.message });
    }
}

export const getMyShop = async (req, res) => {
    try{
        const shop = await Shop.findOne({ owner: req.userId }).populate("owner")
        await shop.populate({
            path:"items",
            options:{sort:{updatedAt:-1}}
        });
        if(!shop){
            return res.status(404).json({ message: "No shop found" });
        }
        return res.status(200).json(shop);
    }
    catch (error) {
        return res.status(500).json({ message: "get my shop error", error: error.message });
    }
}

export const getShopByCity = async (req,res)=>{
    try{
        const {city} = req.params;
        // 1. Guard against empty city parameter
        if (!city || city.trim() === "") {
            return res.status(400).json({ message: "City name is required" });
        }

        // 2. Search using case-insensitive regex
        const shops = await Shop.find({
            city:{$regex: new RegExp(`^${city}$`, 'i')} // Case-insensitive exact match
        }).populate('items');
        
        if(!shops){
            return res.status(404).json({ message: "No shop found in this city" });
        }

        return res.status(200).json(shops);
    } catch (error) {
        return res.status(500).json({message:"get shop by city error", error: error.message});
    }
}