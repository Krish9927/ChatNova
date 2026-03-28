import express from 'express'
import {signup,login,logout,updateProfile} from '../controllers/auth.controller.js';
import { protectedRoute } from '../middleware/auth.middleware.js';
const router=express.Router();

router.post('/signup', signup);
router.post('/login',login);

router.post('/logout',logout);
// support POST logout (some clients send POST)
router.post('/logout', logout);
router.put('/update-profile',protectedRoute,updateProfile);
router.get('/check-auth', protectedRoute, (req, res) => {
    res.status(200).json({ message: 'User is authenticated' });
});
export default router;