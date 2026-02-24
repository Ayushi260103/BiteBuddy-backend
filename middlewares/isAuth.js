import jwt from "jsonwebtoken";

const isAuth = async(req, res, next) =>{
    try{
        const token=req.cookies.token;
        if(!token){
            return res.status(400).json({message:"token not found"});
        }
        const decodedToken=jwt.verify(token, process.env.JWT_SECRET);
        if(!decodedToken){
            return res.status(400).json({message:"token not verified"});
        }
        console.log("Decoded token in isAuth middleware", decodedToken);
        req.userId=decodedToken.userId;
        next();
    }catch(error){
        res.status(500).json({message:"isAuth Error", error});
    }
}
export {isAuth};