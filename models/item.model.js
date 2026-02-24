import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true
    },
    category: {
        type: String,
        enum: ["Snacks", "Main Course",
            "Desserts", "Pizza", "Burgers",
            "Sandwiches", "South Indian", "North Indian",
            "Chinese", "Fast Food", "Beverages", "Others"],
        required: true
    },
    price: {
        type: Number,
        min: 0,
        required: true
    },
    foodType: {
        type: String,
        enum: ["veg", "non-veg"],
        required: true
    },
    rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 } //how many people rated the item, used to calculate average rating
    },
    userRatings: {
        type: [
            {
                userId: String,
                value: Number
            }
        ],
        default: []
    }
}, { timestamps: true });

const Item = mongoose.model("Item", itemSchema);

export default Item;