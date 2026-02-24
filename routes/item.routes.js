import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { addItem, editItem, getItemByShop, giveRating, searchItems } from "../controllers/item.controllers.js";
import {upload} from "../middlewares/multer.js";
import { getItemById } from "../controllers/item.controllers.js";
import { deleteItem } from "../controllers/item.controllers.js";
import { getItemByCity } from "../controllers/item.controllers.js";

const itemRouter = express.Router();

itemRouter.post("/add-item",isAuth,upload.single("image"),addItem);
itemRouter.get("/search-items", isAuth, searchItems);
itemRouter.post("/rating", isAuth, giveRating);

itemRouter.post("/edit-item/:itemId",isAuth,upload.single("image"),editItem);
itemRouter.get("/get-by-id/:itemId",isAuth,getItemById);
itemRouter.delete("/delete-item/:itemId",isAuth,deleteItem);
itemRouter.get("/get-by-city/:city",isAuth,getItemByCity);
itemRouter.get("/get-by-shop/:shopId", isAuth, getItemByShop);

export default itemRouter;