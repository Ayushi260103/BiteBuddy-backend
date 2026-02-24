import Shop from '../models/shop.model.js'
import Order from '../models/order.model.js'
import User from '../models/user.model.js'
import DeliveryAssignment from '../models/deliveryAssignment.model.js';
import { sendDeliveryOtpEmail } from '../utils/mail.js';
import dotenv from 'dotenv';
dotenv.config();
import Razorpay from 'razorpay';

let instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


export const placeOrder = async (req, res) => {
    try {
        console.log("BODY:", req.body);
        console.log("USER:", req.user);
        console.log("PARAMS:", req.params);
        const { cartItems, paymentMethod, deliveryAddress, totalAmount } = req.body;

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: 'cart is empty' });
        }

        if (!deliveryAddress?.text || deliveryAddress?.latitude == null || deliveryAddress?.longitude == null) {
            return res.status(400).json({ message: 'send complete delivery address' });
        }

        const groupItemsByShop = {};

        cartItems.forEach((item) => {
            const shopId = typeof item.shop === 'object' ? item.shop?._id : item.shop;
            if (!shopId) {
                throw new Error('shop id missing in cart item');
            }

            if (!groupItemsByShop[shopId]) {
                groupItemsByShop[shopId] = [];
            }
            groupItemsByShop[shopId].push(item);
        });

        const shopOrders = await Promise.all(
            Object.keys(groupItemsByShop).map(async (shopId) => {
                const shop = await Shop.findById(shopId).populate('owner');
                if (!shop) {
                    throw new Error(`shop not found: ${shopId}`);
                }

                const items = groupItemsByShop[shopId];
                const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0);

                return {
                    shop: shop._id,
                    owner: shop.owner._id,
                    subtotal,
                    shopOrderItems: items.map((item) => ({
                        item: item._id || item.id,
                        name: item.name,
                        price: Number(item.price),
                        quantity: Number(item.quantity)
                    }))
                };
            })
        );

        // for Online razorpay order

        if (paymentMethod == 'online') {
            const razorpayOrder = await instance.orders.create({
                amount: Math.round(totalAmount * 100),    //conver to paise from rs
                currency: 'INR',
                receipt: `receipt_${Date.now()}`
            })

            const newOrder = await Order.create({
                userId: req.userId,
                paymentMethod,
                deliveryAddress,
                totalAmount,
                shopOrders,
                razorpayOrderId: razorpayOrder.id,
                payment: false     //payment not yet completed
            })

            return res.status(200).json({
                razorpayOrder,
                orderId: newOrder._id,
            })
        }

        // for COD

        const newOrder = await Order.create({
            userId: req.userId,
            paymentMethod,
            deliveryAddress,
            totalAmount,
            shopOrders
        })
        await newOrder.populate("shopOrders.shopOrderItems.item", "name image price rating userRatings")
        await newOrder.populate("shopOrders.shop", "name")
        await newOrder.populate("shopOrders.owner", "name socketId")
        await newOrder.populate("userId", "name email mobile")

        //  socket io for real time updates
        const io = req.app.get('io');
        if (io) {
            //for every shop order as updates are to be made for specific shop only to which order belongs
            newOrder.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner.socketId;
                if (ownerSocketId) {
                    // io.emit sends that event to all socket ids
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: newOrder._id,
                        paymentMethod: newOrder.paymentMethod,
                        deliveryAddress: newOrder.deliveryAddress,
                        user: newOrder.userId,
                        shopOrders: shopOrder,
                        createdAt: newOrder.createdAt,
                        payment: newOrder.payment
                    })
                }
            });
        }

        return res.status(201).json(newOrder);
    } catch (err) {
        return res.status(500).json({ message: 'placeOrder failed', error: err.message });
    }
};

// verify online razorpayment
export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, orderId } = req.body;
        //will fetch if any payment has been done with this payment id
        const payment = await instance.payments.fetch(razorpay_payment_id)
        //payment has status
        if (!payment || payment.status != "captured") {
            return res.status(400).json({ message: "payment not captured" });
        }

        const order = await Order.findById(orderId);
        if (!order) return res.status(400).json({ message: "order not found" });

        order.payment = true;                                   //payment done
        order.razorpayPaymentId = razorpay_payment_id;
        await order.save();
        await order.populate("shopOrders.shopOrderItems.item", "name image price")
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.owner", "name socketId")
        await order.populate("userId", "name email mobile")

        //  socket io for real time updates
        const io = req.app.get('io');
        if (io) {
            //for every shop order as updates are to be made for specific shop only to which order belongs
            order.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner.socketId;
                if (ownerSocketId) {
                    // io.emit sends that event to all socket ids
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: order._id,
                        paymentMethod: order.paymentMethod,
                        deliveryAddress: order.deliveryAddress,
                        user: order.userId,
                        shopOrders: shopOrder,
                        createdAt: order.createdAt,
                        payment: order.payment
                    })
                }
            });
        }

        return res.status(200).json(order);
    }
    catch (error) {
        return res.status(500).json({ message: 'verify payment error', error: err.message });
    }
}

export const getMyOrders = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(400).json({ message: 'user not found' });

        if (user.role == 'user') {
            const orders = await Order.find({ userId: req.userId })
                .sort({ createdAt: -1 }) //latest order at top
                .populate("shopOrders.shop", "name")
                .populate("shopOrders.owner", "name email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price rating userRatings");

            return res.status(200).json(orders);

        }
        else if (user.role == 'owner') {
            const orders = await Order.find({ "shopOrders.owner": req.userId })
                .sort({ createdAt: -1 }) //latest order at top
                .populate("shopOrders.shop", "name")
                .populate("userId")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile");

            //we need to do this because above orders have all orders that have any suborder 
            //of that owner
            const ownerOnlyOrders = orders
                .map((order => ({
                    _id: order._id,
                    paymentMethod: order.paymentMethod,
                    deliveryAddress: order.deliveryAddress,
                    user: order.userId,
                    shopOrders: order.shopOrders.find(o => o.owner.toString() == req.userId),
                    createdAt: order.createdAt,
                    payment: order.payment
                })))

            return res.status(200).json(ownerOnlyOrders);

        }

        return res.status(403).json({ message: 'not allowed to access orders' });


    } catch (error) {
        return res.status(500).json({ message: 'error by get my orders', error: error.message })
    }
}

export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, shopId } = req.params;
        const { status } = req.body;
        const order = await Order.findById(orderId);
        const shopOrder = order.shopOrders.find(odr => odr.shop == shopId)
        if (!shopOrder) return res.status(400).json({ message: 'shop order not found' });

        shopOrder.status = status;

        //will contain all data
        let deliveryBoysPayload = [];

        //send update to delivery guy
        if (status == "out for delivery") {

            //check if already assigned
            if (shopOrder.assignment) {
                return res.json({
                    message: "Already assigned"
                });
            }

            const existingAssignment = await DeliveryAssignment.findOne({
                shopOrderId: shopOrder._id,
                status: { $ne: "completed" }
            });

            if (existingAssignment) {
                return res.json({
                    message: "Assignment exists"
                });
            }

            // create assignment


            //get delivery guys with in particular range (5-6 km)

            const { latitude, longitude } = order.deliveryAddress;    //get order lat lon

            const nearByDeliveryBoys = await User.find({
                role: 'deliveryBoy',
                location: {
                    $near: {        //5km ke andar ka order h agar kisi delivery boy kitoh return krega
                        $geometry: {
                            type: 'Point',
                            coordinates: [
                                Number(longitude),     // Mongo expects [lng, lat]
                                Number(latitude)
                            ]
                        },
                        $maxDistance: 5000
                    }
                }
            })


            //filter delivery boys who are not busy

            const nearByIds = nearByDeliveryBoys.map(boy => boy._id);

            //busy boys in near by delivery boys
            const busyDeliveryIds = await DeliveryAssignment.find({
                assignedTo: { $in: nearByIds },     //pehle se ye delivery boy ko order assigned hai
                status: { $nin: ["broadcasted", "completed"] }    //sirf assigned vale status vala busy hota h
            }).distinct("assignedTo")   //will return assignedTo ids that have ids of nearbydeliveryboys and their status is assigned

            //remove duplicate ids 
            const busyDeliveryIdsSet = new Set(busyDeliveryIds.map(id => String(id)));

            //available near by delivery boys
            const freeNearByDeliveryBoys = nearByDeliveryBoys.filter(b => !busyDeliveryIdsSet.has(String(b._id)));

            const candidateIds = freeNearByDeliveryBoys.map(b => b._id);

            if (candidateIds.length == 0) {
                await order.save();
                return res.json({ message: 'No delivery boy available' });
            }

            // create a delivery assignment and make broadcast
            const deliveryAssignment = await DeliveryAssignment.create({
                order: order._id,
                shop: shopOrder.shop,
                shopOrderId: shopOrder._id,
                broadcastedTo: candidateIds,       //assignedTo is default null and will change when delivery boys accepts delivery
                status: "broadcasted"
            })
            await deliveryAssignment.populate('order');
            await deliveryAssignment.populate('shop');

            shopOrder.assignedDeliveryBoy = deliveryAssignment.assignedTo;
            shopOrder.assignment = deliveryAssignment._id;

            deliveryBoysPayload = freeNearByDeliveryBoys.map(b => ({
                id: b._id,
                fullName: b.fullName,
                longitude: b.location.coordinates?.[0],
                latitude: b.location.coordinates?.[1],
                mobile: b.mobile
            }));

            //real time assignment display to delivery boy from shop
            //socket io
            const io = req.app.get('io');
            if (io) {
                freeNearByDeliveryBoys.forEach(boy => {
                    const deliveryBoySocketId = boy.socketId;
                    if (deliveryBoySocketId) {
                        const shopOrderData = deliveryAssignment.order.shopOrders
                            .find(so => so._id.equals(deliveryAssignment.shopOrderId));

                        io.to(deliveryBoySocketId).emit('newAssignment', {
                            sentTo: boy._id,
                            assignmentId: deliveryAssignment._id,
                            orderId: deliveryAssignment.order._id,
                            shopName: deliveryAssignment.shop.name,
                            deliveryAddress: deliveryAssignment.order.deliveryAddress,
                            items: shopOrderData?.shopOrderItems || [],
                            subtotal: shopOrderData?.subtotal || 0
                        });
                    }
                });
            }
        }

        await order.save();
        const updatedShopOrder = order.shopOrders.find(odr => odr.shop == shopId)
        await order.populate("shopOrders.shop", "name");
        await order.populate("shopOrders.assignedDeliveryBoy", "fullName email mobile");
        await order.populate("userId", "socketId");

        // real time status updates
        //socket io event 
        const io = req.app.get('io');
        if (io) {
            const userSocketId = order.userId.socketId;
            io.to(userSocketId).emit('updateStatus', {
                orderId: order._id,
                shopId: updatedShopOrder.shop._id,
                status: updatedShopOrder.status,
                userId: order.userId._id
            })
        }

        return res.status(200).json({
            shopOrder: updatedShopOrder,
            assignedDeliveryBoy: updatedShopOrder?.assignedDeliveryBoy,
            availableBoys: deliveryBoysPayload,
            assignment: updatedShopOrder?.assignment
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'error from update order status', error: error.message });
    }
}

export const getDeliveryBoyAssignment = async (req, res) => {
    try {
        const deliveryBoyId = req.userId;
        const assignments = await DeliveryAssignment.find({
            broadcastedTo: deliveryBoyId,
            status: "broadcasted"
        })
            .populate("order")
            .populate("shop")

        const formattedData = assignments.map(a => {

            if (!a.order) return null;

            const shopOrder = a.order.shopOrders?.find(
                so => so._id.equals(a.shopOrderId)
            );

            return {
                assignmentId: a._id,
                orderId: a.order._id,
                shopName: a.shop?.name,
                deliveryAddress: a.order.deliveryAddress,
                items: shopOrder?.shopOrderItems || [],
                subtotal: shopOrder?.subtotal || 0,
            };
        }).filter(Boolean);

        return res.status(200).json(formattedData);
    }
    catch (error) {
        return res.status(500).json({ message: 'get delivery boy assignment error', error: error.message });
    }
}

export const acceptOrderAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await DeliveryAssignment.findById(assignmentId);

        if (!assignment) return res.status(400).json({ message: "assignment not found" });
        if (assignment.status != "broadcasted") return res.status(400).json({ message: "assignment is expired" });


        //if delivery boy is already delivering an order which is not yet delivered
        const alreadyAssigned = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: { $nin: ["broadcasted", "completed"] }
        })
        if (alreadyAssigned) return res.status(400).json({ message: "you are already assigned to another order" });

        //assign it to the delivery guy who clicked accept
        assignment.assignedTo = req.userId;
        assignment.status = "assigned"
        assignment.acceptedAt = new Date();
        await assignment.save();

        // update the info in order
        const order = await Order.findById(assignment.order);
        if (!order) return res.status(400).json({ message: "order not found" });

        const shopOrder = order.shopOrders.find(
            so => so._id.equals(assignment.shopOrderId)
        );
        if (!shopOrder) {
            return res.status(400).json({ message: "shopOrder not found" });
        }
        shopOrder.assignedDeliveryBoy = req.userId;
        await order.save();
        await order.populate("shopOrders.assignedDeliveryBoy");

        return res.status(200).json({ message: "order assignment accepted" });
    }
    catch (error) {
        return res.status(500).json({ message: 'accept order assignment error', error: error.message });
    }
}

export const getCurrentOrder = async (req, res) => {
    try {

        const assignment = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: "assigned"
        })
            .populate("shop", "name")
            .populate("assignedTo", "fullName email mobile location")
            .populate({
                path: "order",    //order ke andar user ko populate kra
                populate: [{ path: "userId", select: "fullName email location mobile" }]

            })

        if (!assignment) return res.status(400).json({ message: "assignment not found" });
        if (!assignment.order) return res.status(400).json({ message: "order not found" });

        const shopOrder = assignment.order.shopOrders.find(so => toString(so.id) == toString(assignment.shopOrderId));
        if (!shopOrder) return res.status(400).json({ message: "shop order not found" });

        let deliveryBoyLocation = { lat: null, lon: null }

        if (assignment.assignedTo.location.coordinates.length == 2) {
            deliveryBoyLocation.lat = assignment.assignedTo.location.coordinates[1];
            deliveryBoyLocation.lon = assignment.assignedTo.location.coordinates[0];
        }

        let customerLocation = { lat: null, lon: null }
        if (assignment.order.deliveryAddress) {
            customerLocation.lat = assignment.order.deliveryAddress.latitude;
            customerLocation.lon = assignment.order.deliveryAddress.longitude;
        }

        return res.status(200).json({
            _id: assignment.order._id,
            user: assignment.order.userId,
            shopOrder,
            deliveryAddress: assignment.order.deliveryAddress,
            deliveryBoyLocation,
            customerLocation
        });

    }
    catch (error) {
        return res.status(500).json({ message: `get current order error ${error}` });
    }
}


// track order for customer
export const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId)
            .populate("userId")
            .populate({
                path: "shopOrders.shop",
                model: "Shop"
            })
            .populate({
                path: "shopOrders.assignedDeliveryBoy",
                model: "User"
            })
            .populate({
                path: "shopOrders.shopOrderItems.item",
                model: "Item"
            }).lean()


        if (!order) return res.status(400).json({ message: "order not found" });

        return res.status(200).json(order);

    } catch (error) {
        return res.status(500).json({ message: "get order by id error", error: error.message });
    }
}

export const sendDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.body;

        const order = await Order.findById(orderId).populate("userId");
        const shopOrder = order.shopOrders.id(shopOrderId);
        if (!order || !shopOrder) return res.status(400).json({ message: "enter valid order/ shopOrder id" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        shopOrder.deliveryOtp = otp;
        shopOrder.otpExpires = Date.now() + 5 * 60 * 1000;   //expires after 5 min

        await order.save();

        await sendDeliveryOtpEmail(order.userId, otp);
        res.status(200).json({ message: `Delivery OTP sent successfully to ${order?.userId?.fullName}` });
    }
    catch (error) {
        return res.status(500).json({ message: "Delivery OTP not send" });
    }
}

export const verifyDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId, otp } = req.body;
        const order = await Order.findById(orderId).populate("userId");
        const shopOrder = order.shopOrders.id(shopOrderId);
        if (!order || !shopOrder) return res.status(400).json({ message: "enter valid order/ shopOrder id" });

        if (shopOrder.deliveryOtp != otp || !shopOrder.otpExpires || shopOrder.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid/Expired OTP" });
        }

        shopOrder.status = "delivered";
        shopOrder.deliveredAt = Date.now();
        shopOrder.deliveryOtp = null;
        shopOrder.otpExpires = null;

        await order.save();

        // delete the delivery assignment that was made earlier as order is delivered
        await DeliveryAssignment.deleteOne({
            shopOrderId: shopOrder._id,
            order: order._id,
            assignedTo: shopOrder.assignedDeliveryBoy
        })

        res.status(200).json({ message: `Order delivered to ${order?.userId?.fullName} successfully!` });
    }
    catch (error) {
        return res.status(500).json({ message: "Delivery OTP not verified" });
    }
}

export const getTodayDeliveries = async (req, res) => {
    try {
        const deliveryBoyId = req.userId;
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0);   //midnight 12:00:00:00

        const orders = await Order.find({
            "shopOrders.assignedDeliveryBoy": deliveryBoyId,
            "shopOrders.status": "delivered",
            "shopOrders.deliveredAt": { $gte: startOfDay }
        }).lean()

        let todaysDeliveries = []
        orders.forEach(order => {
            order.shopOrders.forEach(shopOrder => {
                if (shopOrder.assignedDeliveryBoy == deliveryBoyId &&
                    shopOrder.status == "delivered" &&
                    shopOrder.deliveredAt && shopOrder.deliveredAt >= startOfDay) {
                    todaysDeliveries.push(shopOrder);
                }
            })
        })
        let stats = {}

        todaysDeliveries.forEach(shopOrder => {
            const hour = new Date(shopOrder.deliveredAt).getHours();
            stats[hour] = (stats[hour] || 0) + 1;               //10am -- 2 deliveries
        }) 

        let formattedStats = Object.keys(stats).map(hour=>({      // {
            hour: parseInt(hour),                                 //      hour: 10,
            count: stats[hour]                                    //      count:2  
        }))                                                       //},

        formattedStats.sort((a,b)=>a.hour-b.hour)    //ascending order

        return res.status(200).json(formattedStats);

    } catch (error) {
        return res.status(500).json({ message: `get today deliveries error ${error}` });
    }
}