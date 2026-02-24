import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

const getToken= async (userId)=>{
    try{
        const token= await jwt.sign({userId},process.env.JWT_SECRET,{expiresIn:"7d"}); //sign is used to sign a jwt token
        return token;
    }
    catch(error){
        console.log("Error generating token",error);
    }
}
export default getToken;