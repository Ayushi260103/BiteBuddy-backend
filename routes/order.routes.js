import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { acceptOrderAssignment, getCurrentOrder, getDeliveryBoyAssignment, getMyOrders, 
    getOrderById, placeOrder, updateOrderStatus,sendDeliveryOtp, verifyDeliveryOtp,
    verifyPayment,
    getTodayDeliveries
} from "../controllers/order.controllers.js";

const orderRouter = express.Router();

orderRouter.post("/place-order",isAuth, placeOrder);
orderRouter.post("/verify-payment",isAuth, verifyPayment);
orderRouter.get("/my-orders",isAuth, getMyOrders);
orderRouter.get("/get-assignments",isAuth, getDeliveryBoyAssignment);
orderRouter.get("/get-current-order", isAuth, getCurrentOrder);
orderRouter.post("/send-delivery-otp", isAuth, sendDeliveryOtp);
orderRouter.post("/verify-delivery-otp", isAuth, verifyDeliveryOtp);
orderRouter.get("/get-today-deliveries", isAuth, getTodayDeliveries);

orderRouter.post("/update-status/:orderId/:shopId", isAuth, updateOrderStatus);
orderRouter.get("/accept-order/:assignmentId", isAuth, acceptOrderAssignment);
orderRouter.get("/get-order-by-id/:orderId", isAuth, getOrderById);

export default orderRouter;