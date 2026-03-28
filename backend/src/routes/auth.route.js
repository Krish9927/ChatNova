import express from 'express'
import {signup,login,logout,updateProfile} from '../controllers/auth.controller.js';
import { protectedRoute } from '../middleware/auth.middleware.js';
import arcjetProtection from '../middleware/arcjet.middleware.js';
const router=express.Router();
router.use(arcjetProtection)
router.post('/signup',arcjetProtection, signup);
router.post('/login',arcjetProtection,login);
router.post('/logout',arcjetProtection  ,logout);
// support POST logout (some clients send POST) 
router.put('/update-profile',protectedRoute,updateProfile);
router.get('/check-auth', protectedRoute, (req, res) => {
    res.status(200).json({ message: 'User is authenticated' });
});
export default router;