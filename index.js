import express from "express";
import dotenv from "dotenv";
dotenv.config();
import connectDb from "./config/db.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import shopRouter from "./routes/shop.routes.js";
import itemRouter from "./routes/item.routes.js";
import orderRouter from "./routes/order.routes.js";

import cors from "cors";

// for socket io
import http from "http"
import { Server } from "socket.io";
import { socketHandler } from "./socket.js";


const app = express();

// for socket io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", //frontend ka url
        credentials: true, //allow cookies to be sent in cross-origin requests
        methods: ['POST', 'GET']
    }
})
app.set("io",io);  //now it can be used anywhere


const port = process.env.PORT || 5000;
//connect backend to frontend using cors middleware, it allows cross-origin requests from the frontend to the backend, we need to specify the origin of the frontend and allow credentials to be sent in cross-origin requests
app.use(cors({
    origin: "http://localhost:5173", //frontend ka url
    credentials: true //allow cookies to be sent in cross-origin requests
}))

//global middlewares-- 'app.use' isse guzarna pade har route ko jo middleware m likhte h
app.use(express.json()); //ye middleware h jo incoming request ke body ko json format m convert kr deta h taki hum usko easily access kr ske
app.use(cookieParser()); //ye middleware h jo incoming request ke cookies ko parse kr deta h taki hum usko easily access kr ske
app.use("/api/auth", authRouter); //ye middleware h jo authRouter ko use krta h taki hum authRouter m defined routes ko access kr ske, will put /api/auth before all routes in authRouter
app.use("/api/user", userRouter);
app.use("/api/shop", shopRouter);
app.use("/api/item", itemRouter);
app.use("/api/order", orderRouter);

socketHandler(io);

server.listen(port, () => {
    connectDb()
    console.log(`Server is running on port ${port}`);
})