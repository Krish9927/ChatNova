import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';  
import { generateToken } from '../lib/utils.js';
import { sendWelcomeEmail } from '../emails/emailHandler.js';
import { ENV } from '../lib/env.js';  
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