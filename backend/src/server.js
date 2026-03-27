import express from 'express'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import path from 'path';
import { fileURLToPath } from 'url';
import {connectDB} from './lib/db.js';
import { ENV } from './lib/env.js'; 


const app=express();
app.use(express.json());
const __dirname=path.resolve();
console.log(ENV.PORT); 
const PORT=ENV.PORT || 3001;
app.use(express.json());

app.use("/api/auth",authRoutes);
app.use("/api/message",messageRoutes);  
if(ENV.NODE_ENV==="production"){
    app.use(express.static(path.join(__dirname,"../frontend/dist")));
    app.get("*",(_,res)=>{
        res.sendFile(path.join(__dirname,"../frontend/build/index.html"));
    });
}


app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
    connectDB();
})

// Error handler for JSON parse errors and other errors — respond with JSON
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Invalid JSON payload' });
    }
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: 'Malformed JSON' });
    }
    if (err) {
        console.error('Unhandled error:', err);
        return res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
    next();
});
