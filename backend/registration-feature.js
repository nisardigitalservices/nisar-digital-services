// Express router starter. Mount after app.use(express.json()).
// Replace JSON-file storage with a transactional database before production.
const express=require('express'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const router=express.Router(),file=path.join(__dirname,'registrations.json');
const read=()=>JSON.parse(fs.readFileSync(file,'utf8'));
const save=d=>{const t=file+'.tmp';fs.writeFileSync(t,JSON.stringify(d,null,2));fs.renameSync(t,file);};
router.get('/api/registrations/count',(req,res)=>{const d=read();res.set('Cache-Control','no-store');res.json({registered:d.registered.length,waiting:d.waiting.length,limit:1000});});
router.post('/api/registrations',(req,res)=>{
 const name=String(req.body.name||'').trim().slice(0,80),mobile=String(req.body.mobile||'').replace(/\D/g,'');
 if(name.length<2||!/^[6-9]\d{9}$/.test(mobile))return res.status(400).json({message:'Enter a valid name and 10-digit Indian mobile number.'});
 const d=read();if(d.registered.concat(d.waiting).some(x=>x.mobile===mobile))return res.status(409).json({message:'This mobile number is already registered or waitlisted.'});
 const item={id:crypto.randomUUID(),name,mobile,createdAt:new Date().toISOString()};
 if(d.registered.length<1000){d.registered.push(item);save(d);return res.status(201).json({status:'registered',number:d.registered.length});}
 d.waiting.push(item);save(d);return res.status(201).json({status:'waiting',number:d.waiting.length});
});
module.exports=router;