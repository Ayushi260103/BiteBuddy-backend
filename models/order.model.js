import mongoose from "mongoose";

const shopOrderItemSchema = new mongoose.Schema({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
    },
    name: String,
    price: Number,           //price of total quantity of this item (price * quantity)
    quantity: Number,
}, { timestamps: true });

const shopOrderSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    subtotal: Number,
    shopOrderItems: [shopOrderItemSchema],
    status: {
        type: String,
        enum: ['pending', 'preparing', 'out for delivery', 'delivered'],
        default: 'pending'
    },
    assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryAssignment",
        default: null
    },
    assignedDeliveryBoy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    deliveryOtp: {      //this field will store the OTP for password reset for some time
        type: String,
        default: null
    },
    otpExpires: {   //this field will store the expiration time of the OTP
        type: Date,
        default: null
    },
    deliveredAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });


const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", required: true
    },
    paymentMethod: {
        type: String,
        enum: ["cod", "online"],
        required: true
    },
    deliveryAddress: {
        text: String,
        latitude: Number,
        longitude: Number
    },
    totalAmount: {
        type: Number
    },
    shopOrders: [shopOrderSchema],//if user added items from multiple shops, we will create separate order for each shop and store them in this array with shopId and items ordered from that shop
    payment:{      //payment done or not
        type: Boolean,
        default: false,
    },
    razorpayOrderId: {
        type: String,
        default: ""
    },
    razorpayPaymentId: {
        type: String,
        default: ""
    }
    
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

export default Order;