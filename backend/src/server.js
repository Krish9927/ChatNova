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
