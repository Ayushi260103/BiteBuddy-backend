import Item from "../models/item.model.js";
import Shop from "../models/shop.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


export const addItem = async (req, res) => {
    try {
        const { name, category, foodType, price } = req.body;

        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path); // Upload the image to Cloudinary and get the URL
        }
        const shop = await Shop.findOne({ owner: req.userId });

        if (!shop) {
            return res.status(400).json({ message: "Shop not found for the user" });
        }
        // 1. Create the item
        const item = await Item.create({
            name, category, foodType, price, image, shop: shop._id
        });

        // 2. Update shop and get FRESH data
        const updatedShop = await Shop.findByIdAndUpdate(
            shop._id,
            { $addToSet: { items: item._id } },
            { returnDocument: 'after' }
        ).populate("owner");

        // 3. Populate the items on the CORRECT variable
        await updatedShop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        });

        return res.status(201).json(updatedShop);
    } catch (error) {
        return res.status(500).json({ message: "Error adding item", error: error.message });
    }
}

export const editItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { name, category, foodType, price } = req.body;

        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path); // Upload the image to Cloudinary and get the URL
        }
        const item = await Item.findByIdAndUpdate(
            itemId,
            { name, category, foodType, price, image },
            { returnDocument: 'after' } // Changed from { new: true }
        );
        if (!item) {
            return res.status(400).json({ message: `Item with ID ${itemId} not found` });
        }
        // const shop=await Shop.findOne({owner:req.userId}).populate("items");
        const shop = await Shop.findOne({ owner: req.userId })
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        });
        if (!shop) {
            return res.status(400).json({ message: "Shop not found for the user" });
        }
        return res.status(201).json(shop);
    } catch (error) {
        return res.status(500).json({ message: "Error updating item", error: error.message });
    }
}

export const getItemById = async (req, res) => {
    try {
        const { itemId } = req.params;
        const item = await Item.findById(itemId);
        if (!item) {
            return res.status(400).json({ message: "Item not found" }, itemId);
        }
        return res.status(200).json({ message: "Item fetched successfully", item });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching item", error: error.message });
    }
}

export const deleteItem = async (req, res) => {
    try {
        const { itemId } = req.params;

        // 1. Delete the actual item document
        const item = await Item.findByIdAndDelete(itemId);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        // 2. Remove the ID from the Shop's items array and get the updated shop in one go
        const shop = await Shop.findOneAndUpdate(
            { owner: req.userId },
            { $pull: { items: itemId } }, // Atomically removes the item ID
            { new: true }
        ).populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        });

        if (!shop) {
            return res.status(400).json({ message: "Shop not found" });
        }

        return res.status(200).json(shop);
    } catch (error) {
        return res.status(500).json({ message: "Error deleting item", error: error.message });
    }
}

export const getItemByCity = async (req, res) => {
    try {
        const { city } = req.params;
        // 1. Guard against empty city parameter
        if (!city || city.trim() === "") {
            return res.status(400).json({ message: "City name is required" });
        }

        // 2. Search using case-insensitive regex
        const shops = await Shop.find({
            city: { $regex: new RegExp(`^${city}$`, 'i') } // Case-insensitive exact match
        }).populate('items');

        if (!shops) {
            return res.status(404).json({ message: "No shop found in this city" });
        }

        const shopIds = shops.map(shop => shop._id);
        const items = await Item.find({ shop: { $in: shopIds } });

        return res.status(200).json(items); // Return only items, as the frontend is interested in displaying items based on city

    } catch (error) {
        return res.status(500).json({ message: "Error fetching items by city", error: error.message });
    }
}

export const getItemByShop = async (req, res) => {
    try {
        const { shopId } = req.params;
        const shop = await Shop.findById(shopId)
            .populate("items");

        if (!shop) return res.status(400).json({ message: "shop not found" });
        return res.status(200).json({
            shop, items: shop.items
        })
    }
    catch (error) {
        return res.status(500).json({ message: " get item by shop error" });
    }
}

export const searchItems = async (req, res) => {
    try {
        const { query, city } = req.query;
        if (!query || !city) return res.status(400).json({ message: "Query and city required" });

        //get all shops in customer city
        const shops = await Shop.find({
            city: { $regex: new RegExp(`^${city}$`, 'i') } // Case-insensitive exact match
        }).populate('items');

        if (!shops) {
            return res.status(404).json({ message: "No shop found in this city" });
        }

        //store shops ids here
        const shopIds = shops.map(s => s._id);

        //search for the query item in these shop ids
        const items = await Item.find({
            shop: { $in: shopIds },
            $or: [
                { name: { $regex: query, $options: "i" } },
                { category: { $regex: query, $options: "i" } }
            ]
        }).populate("shop", "name image");

        return res.status(200).json(items);

    } catch (error) {
        return res.status(500).json({ message: 'search items error' });
    }
}


export const giveRating = async (req, res) => {
    try {
        const { itemId, rating } = req.body;
        const userId = req.userId;

        if (!itemId || !rating || !userId) {
            return res.status(400).json({
                message: "itemId, rating and userId required"
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                message: "rating must be between 1 to 5"
            });
        }

        const item = await Item.findById(itemId);

        if (!item) {
            return res.status(404).json({
                message: "item not found"
            });
        }

        // ensure array exists
        if (!item.userRatings) item.userRatings = [];

        const existingRating = item.userRatings.find(
            r => r.userId?.toString() === userId.toString()
        );

        if (existingRating) {
            return res.status(400).json({
                message: "Already rated"
            });
        }

        item.userRatings.push({
            userId,
            value: rating
        });

        if (!item.rating) {
            item.rating = { count: 0, average: 0 };
        }
        const newCount = item.rating.count + 1;

        const newAverage =
            ((item.rating.count * item.rating.average) + rating) / newCount;



        item.rating.count = newCount;
        item.rating.average = newAverage;

        await item.save();

        return res.status(200).json({
            rating: item.rating,
            userRating: rating
        });

    } catch (error) {
        console.log("RATING ERROR:", error);
        return res.status(500).json({
            message: "give rating error",
            error: error.message
        });
    }
};