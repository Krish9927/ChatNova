import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ENV } from '../lib/env.js'; 

export const protectedRoute = async (req, res, next) => {
        const token = req.cookies.jwt || req.cookies.token;      
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }   
    try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET);
        const userId = decoded.userId || decoded.id || decoded.userid;
        const user = await User.findById(userId).select('-password');  
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: User not found' });
        }   
        req.user = user;
        next();
    }
    catch (error) {
        console.error('Error in protectedRoute middleware:', error);
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
}
