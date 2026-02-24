import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { createEditShop } from "../controllers/shop.controllers.js";
import {upload} from "../middlewares/multer.js";
import { getMyShop } from "../controllers/shop.controllers.js";
import { getShopByCity } from "../controllers/shop.controllers.js";

const shopRouter = express.Router();

shopRouter.post("/create-edit-shop",isAuth,upload.single("image"), createEditShop); //upload.single("image") is used to upload a single image with the field name "image" from the frontend form data. This middleware will process the uploaded file and make it available in req.file for the createEditShop controller to use.
shopRouter.get("/get-my",isAuth, getMyShop);
shopRouter.get("/get-by-city/:city",isAuth, getShopByCity);

export default shopRouter;