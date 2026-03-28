import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';  
import { generateToken } from '../lib/utils.js';
import { sendWelcomeEmail } from '../emails/emailHandler.js';
import { ENV } from '../lib/env.js';  
import cloudinary from '../lib/cloudinary.js';
export const signup = async (req, res) => {
    const {fullName, email, password} = req.body;
    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if(password.length < 6){
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        const user=await User.findOne({email});
        if(user){
            return res.status(400).json({ message: 'Email already exists' });
        }
       const salt=await bcrypt.genSalt(10);
       const hashedPassword=await bcrypt.hash(password, salt);
       const newUser = new User({
            username: fullName,
            email: email,
            password: hashedPassword
        });
        // Persist user first, then issue auth cookie
        const savedUser = await newUser.save();
        generateToken(savedUser._id, res);
          res.status(201).json({
            _id: savedUser._id,
            fullName: savedUser.username,
            email: savedUser.email,
            profilePic: savedUser.profilePic,
        });

      try {                 
        await sendWelcomeEmail(savedUser.email, savedUser.username, ENV.CLIENT_URL);        
      }catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }
    } catch (error) {
        console.error('Error in signup:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
export const login=async(req,res)=>{
    const {email,password}=req.body;        
    try {
        const user=await User.findOne({email});
        if(!user){
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        generateToken(user._id, res);
        // include full profile (excluding sensitive fields)
        const profile = user.toObject ? user.toObject() : { ...user };
        delete profile.password;
        delete profile.__v;

        res.status(200).json({
            _id: user._id,
            fullName: user.username,
            email: user.email,
            profilePic: user.profilePic,
            profile,
        });
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
} 
export const logout=(_,res)=>{
    res.clearCookie("jwt",{
        httpOnly:true,
        sameSite:"strict",
        secure:ENV.NODE_ENV==="production"
    });
    res.status(200).json({message:"Logged out successfully"});
}  

export const updateProfile=async(req,res)=>{
    const { profilePic} = req.body; 
    try {
        const userId=req.user._id;
         const uploadResult = await cloudinary.uploader.upload(profilePic, {
            folder: 'chatnova/profile_pics',
            public_id: `profile_${userId}`,
            overwrite: true,
            resource_type: 'image',
        }); 
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profilePic: uploadResult.secure_url },
            { new: true, select: '-password -__v' }
        );
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
            _id: updatedUser._id,
            fullName: updatedUser.username,
            email: updatedUser.email,
            profilePic: updatedUser.profilePic,
        });
    } catch (error) {
        console.error('Error in updateProfile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }   
}
    