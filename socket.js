import User from "./models/user.model.js";


export const socketHandler = (io) => {
    // connection is an inbuilt event in io 
    //when connection happens socket id will be created that will be assigned to user
    // access this id using socket.id
    //socket means user, as a user gets connected this will run
    io.on('connection', (socket) => {
        //jo data frontend se bheja h voh yaha mil jayega i.e userId

        socket.on('identity', async ({ userId }) => {
            console.log("Identity received:", userId);
            try {
                const user = await User.findByIdAndUpdate(userId, {
                    socketId: socket.id,
                    isOnline: true
                }, { new: true });
                console.log(user);

            } catch (error) {
                console.log(error);
            }
        })

        // like map tracking - delivery boy location
        socket.on('updateLocation', async ({ latitude, longitude, userId }) => {
            try {
                //DB updated
                const user = await User.findByIdAndUpdate(userId, {
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    isOnline: true,
                    socketId: socket.id
                })

                //socket se ye event bhejna h to user track order
                if (user) {
                    io.emit('updateDeliveryLocation', {
                        deliveryBoyId: userId,
                        latitude,
                        longitude
                    })
                }

            } catch (error) {
                console.log(error);
            }
        })

        socket.on('disconnect', async () => {
            try {
                await User.findOneAndUpdate({ socketId: socket.id }, {
                    socketId: null,
                    isOnline: false
                })
            } catch (error) {
                console.log(error);
            }
        })
    })
}