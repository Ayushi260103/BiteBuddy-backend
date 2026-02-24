import mongoose from "mongoose";

const deliveryAssignmentSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop"
    },
    shopOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    broadcastedTo: [{           //out for delivery is send to which deliver guys
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    assignedTo: {          //kisko assign hui delivery
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    status: {
        type: String,
        enum: ['broadcasted','assigned','completed'],
        default:'broadcasted'
    },
    acceptedAt: {
        type: Date
    }
}, { timestamps: true })

const DeliveryAssignment = mongoose.model("DeliveryAssignment", deliveryAssignmentSchema);

export default DeliveryAssignment;