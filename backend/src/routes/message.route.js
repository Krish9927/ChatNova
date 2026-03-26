import express from 'express' 

const router=express.Router();

router.get('/send',(req,res)=>{
    res.send("Send Endpoints");
}) 

router.get('/receive',(req,res)=>{
    res.send("Receive Endpoints");
})  

export default router;  