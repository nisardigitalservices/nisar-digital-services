const express=require('express');
const cors=require('cors');
const fs=require('fs');
const path=require('path');
const catalog=require('./services.json');
const app=express();
app.use(cors());
app.use(express.json({limit:'1mb'}));
const DATA=path.join(__dirname,'recharge-data.json');
function load(){try{return JSON.parse(fs.readFileSync(DATA,'utf8'));}catch{return {requests:[],wallets:{},history:[]};}}
function save(d){fs.writeFileSync(DATA,JSON.stringify(d,null,2));}
function admin(req,res,next){const pin=req.get('x-admin-pin');const expected=process.env.ADMIN_PIN;if(!expected){return res.status(503).json({message:'Admin PIN is not configured. Set ADMIN_PIN before using admin approval.'});}if(pin!==expected)return res.status(401).json({message:'Invalid admin PIN'});next();}
app.use(express.static(path.join(__dirname,'../website')));
app.get('/api/health',(req,res)=>res.json({ok:true,app:'NISAR DIGITAL SERVICES',banking:false,categories:catalog.categories.length,services:catalog.services.length}));
app.get('/api/categories',(req,res)=>res.json(catalog.categories));
app.get('/api/services',(req,res)=>{let q=(req.query.q||'').toLowerCase();let category=req.query.category;let items=catalog.services.filter(x=>(!q||x.name.toLowerCase().includes(q)||x.category.toLowerCase().includes(q))&&(!category||x.category===category));res.json({total:items.length,services:items});});
app.get('/api/wallet/:mobile',(req,res)=>{const m=String(req.params.mobile||'');if(!/^\d{10}$/.test(m))return res.status(400).json({message:'Enter a valid 10-digit mobile number'});const d=load();res.json({mobile:m,balance:d.wallets[m]||0,history:d.history.filter(x=>x.mobile===m).slice(-20).reverse()});});
app.post('/api/recharge/submit',(req,res)=>{const {name,mobile,role,amount,bank,utr}=req.body||{};const n=Number(amount);if(!name||!/^\d{10}$/.test(String(mobile||''))||!['Retailer','Distributor'].includes(role)||!Number.isInteger(n)||n<100||n>3000||!['Paytm QR - Andhra Pradesh Bank','Airtel Payments Bank QR'].includes(bank)||!String(utr||'').trim())return res.status(400).json({message:'Please enter valid details. Recharge must be ₹100–₹3,000 and UTR is required.'});const d=load();const id='NDS'+Date.now().toString();d.requests.push({id,name:String(name).slice(0,80),mobile:String(mobile),role,amount:n,bank,utr:String(utr).trim().slice(0,80),status:'Pending',createdAt:new Date().toISOString()});save(d);res.status(201).json({message:'Request submitted. Wallet balance will be added only after admin verifies the payment.',id});});
app.get('/api/admin/recharges',admin,(req,res)=>{const d=load();res.json({requests:d.requests.filter(x=>x.status==='Pending')});});
app.post('/api/admin/recharges/:id/approve',admin,(req,res)=>{const d=load();const item=d.requests.find(x=>x.id===req.params.id);if(!item)return res.status(404).json({message:'Recharge request not found'});if(item.status!=='Pending')return res.status(409).json({message:'Request is already processed'});item.status='Approved';item.approvedAt=new Date().toISOString();d.wallets[item.mobile]=(d.wallets[item.mobile]||0)+item.amount;d.history.push({id:item.id,mobile:item.mobile,role:item.role,amount:item.amount,bank:item.bank,utr:item.utr,status:'Credited',createdAt:item.createdAt,approvedAt:item.approvedAt});save(d);res.json({message:'Approved and wallet credited',balance:d.wallets[item.mobile]});});
app.post('/api/admin/recharges/:id/reject',admin,(req,res)=>{const d=load();const item=d.requests.find(x=>x.id===req.params.id);if(!item)return res.status(404).json({message:'Recharge request not found'});if(item.status!=='Pending')return res.status(409).json({message:'Request is already processed'});item.status='Rejected';item.rejectedAt=new Date().toISOString();save(d);res.json({message:'Request rejected'});});
app.post('/api/enquiries',(req,res)=>res.status(501).json({message:'Secure enquiry storage is not enabled yet. Add database, consent, validation and admin authentication before production.'}));
const port=process.env.PORT||3000;app.listen(port,()=>console.log(`NISAR API running at http://localhost:${port}`));
