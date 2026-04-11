import express from 'express'
import multer from 'multer';
import { protectedRoute } from '../middleware/auth.middleware.js';
import { getAllContacts, getChatPartners, getMessagesByUserId, sendMessage, sendAudioMessage } from '../controllers/message.controller.js';
import { transcribeAudio } from '../controllers/transcribe.controller.js';
import arcjetProtection from '../middleware/arcjet.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(arcjetProtection, protectedRoute);

router.get('/contacts', getAllContacts);
router.get('/chat', getChatPartners);
router.post('/transcribe', transcribeAudio);
router.post('/send-audio/:id', upload.single('audio'), sendAudioMessage);
router.post('/send-audio', upload.single('audio'), sendAudioMessage);
router.post('/send/:id', sendMessage);
router.post('/send', sendMessage);
router.get('/:id', getMessagesByUserId);

export default router;