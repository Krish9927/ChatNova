import express from 'express' 
import {protectedRoute } from '../middleware/auth.middleware.js';
import { getAllContacts,getChatPartners,getMessagesByUserId,sendMessage} from '../controllers/message.controller.js';
import arcjetProtection from '../middleware/arcjet.middleware.js';
const router=express.Router();

router.use(arcjetProtection,protectedRoute)

router.get('/contacts',getAllContacts)
router.get('/chat',getChatPartners)
// Must be before GET /:id so "send" is not treated as a user id
router.post('/send/:id', sendMessage)
// Same handler: use JSON body { receiverId, text, image? } when path has no id
router.post('/send', sendMessage)
router.get('/:id',getMessagesByUserId)
 
export default router;  