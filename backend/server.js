const express=require('express'),cors=require('cors'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const catalog=require('./services.json'),app=express();
app.use(cors());app.use(express.json({limit:'1mb'}));
const DATA_DIR=process.env.DATA_DIR||__dirname;fs.mkdirSync(DATA_DIR,{recursive:true});
const files={wallet:path.join(DATA_DIR,'recharge-data.json'),partners:path.join(DATA_DIR,'partner-registrations.json'),services:path.join(DATA_DIR,'service-requests.json'),passwordResets:path.join(DATA_DIR,'password-reset-requests.json')};
function arr(f){try{let x=JSON.parse(fs.readFileSync(f,'utf8'));return Array.isArray(x)?x:[]}catch{return []}}
function obj(f,def){try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return def}}
function write(f,x){fs.mkdirSync(path.dirname(f),{recursive:true});let t=f+'.tmp';fs.writeFileSync(t,JSON.stringify(x,null,2));fs.renameSync(t,f)}
function wallet(){return obj(files.wallet,{requests:[],wallets:{},history:[]})}
function admin(req,res,next){if(!process.env.ADMIN_PIN)return res.status(503).json({message:'ADMIN_PIN not configured on Render'});if(req.get('x-admin-pin')!==process.env.ADMIN_PIN)return res.status(401).json({message:'Invalid Admin PIN'});next()}
function hash(p,s){return crypto.scryptSync(p,s,64).toString('hex')}
function tokenFor(id){if(!process.env.AUTH_SECRET)throw Error('AUTH_SECRET is not configured');const payload=Buffer.from(JSON.stringify({id,exp:Date.now()+7*86400000})).toString('base64url');const sig=crypto.createHmac('sha256',process.env.AUTH_SECRET||process.env.ADMIN_PIN||'').update(payload).digest('base64url');return payload+'.'+sig}
function partnerAuth(req,res,next){try{if(!process.env.AUTH_SECRET)throw Error('AUTH_SECRET missing');const t=(req.get('authorization')||'').replace(/^Bearer\s+/i,'');const [p,sig]=t.split('.');const expected=crypto.createHmac('sha256',process.env.AUTH_SECRET||process.env.ADMIN_PIN||'').update(p).digest('base64url');if(!p||!sig||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw Error();const x=JSON.parse(Buffer.from(p,'base64url').toString());if(x.exp<Date.now())throw Error();const partner=arr(files.partners).find(a=>a.partnerId===x.id&&a.status==='Approved');if(!partner)throw Error();req.partner=partner;next()}catch{return res.status(401).json({message:'Please login with an approved Partner ID and password.'})}}
function officialUrl(name){const n=String(name||'').toLowerCase().replace(/\s+/g,' ').trim();
if(/uti.*pan|pan.*uti/.test(n))return 'https://www.pan.utiitsl.com/';
if(/\b(aadhaar|aadhar|uidai)\b/.test(n))return 'https://myaadhaar.uidai.gov.in/';
if(/\b(pan|e-pan)\b/.test(n)&&!/pan.?aadhaar|aadhaar.?pan/.test(n))return 'https://tinpan.proteantech.in/services/pan/pan-index';
if(/\b(voter|elector|epic)\b/.test(n))return 'https://voters.eci.gov.in/';
if(/passport/.test(n))return 'https://www.passportindia.gov.in/psp/';
if(/driving licence|driving license|learner.?licen[cs]e|sarathi/.test(n))return 'https://sarathi.parivahan.gov.in/';
if(/\brc\b|vehicle registration|vehicle fitness|vehicle tax|permit information|parivahan/.test(n))return 'https://parivahan.gov.in/';
if(/challan|traffic fine|e.?challan/.test(n))return 'https://echallan.parivahan.gov.in/';
if(/digilocker|digital locker/.test(n))return 'https://www.digilocker.gov.in/';
if(/pm.?kisan|kisan samman/.test(n))return 'https://pmkisan.gov.in/';
if(/epfo|provident fund|uan|pf claim/.test(n))return 'https://unifiedportal-mem.epfindia.gov.in/';
if(/e.?shram|unorganised worker/.test(n))return 'https://register.eshram.gov.in/';
if(/ayushman|pm.?jay/.test(n))return 'https://beneficiary.nha.gov.in/';
if(/abha|health id/.test(n))return 'https://abha.abdm.gov.in/';
if(/scholarship|national scholarship/.test(n))return 'https://scholarships.gov.in/';
if(/\bgst\b|goods and services tax/.test(n))return 'https://www.gst.gov.in/';
if(/udyam|msme/.test(n))return 'https://udyamregistration.gov.in/';
if(/ration|nfsa|food security|one nation one ration/.test(n))return 'https://nfsa.gov.in/';
if(/birth certificate|death certificate|civil registration/.test(n))return 'https://crsorgi.gov.in/';
if(/mgnrega|nrega|job card/.test(n))return 'https://nrega.nic.in/';
if(/consumer complaint|consumer helpline/.test(n))return 'https://consumerhelpline.gov.in/';
if(/rti online|right to information/.test(n))return 'https://rtionline.gov.in/';
if(/public grievance|cpgrams/.test(n))return 'https://pgportal.gov.in/';
if(/cybercrime|cyber crime/.test(n))return 'https://cybercrime.gov.in/';
if(/income tax|itr filing|income.?tax return|tax return/.test(n))return 'https://www.incometax.gov.in/iec/foportal/';
if(/nta|neet|jee|entrance exam/.test(n))return 'https://www.nta.ac.in/';
if(/employment|job seeker|national career service/.test(n))return 'https://www.ncs.gov.in/';
if(/fssai|food safety|foscos/.test(n))return 'https://foscos.fssai.gov.in/';
if(/trademark|intellectual property/.test(n))return 'https://ipindia.gov.in/';
if(/startup india/.test(n))return 'https://www.startupindia.gov.in/';
if(/ge.?m seller|government e marketplace/.test(n))return 'https://gem.gov.in/';
if(/india post|post office/.test(n))return 'https://www.indiapost.gov.in/';
if(/railway|pnr/.test(n))return 'https://www.indianrail.gov.in/';
return 'https://services.india.gov.in/';}
function feeFor(s){return String(s.status||'').toUpperCase()==='FREE_INFORMATION'?100:50}
app.get('/',(q,s)=>s.send('Government & Digital Services Portal API running'));
app.get('/api/health',(q,s)=>s.json({ok:true,services:catalog.services.length}));
app.get('/api/services',partnerAuth,(q,s)=>{let term=String(q.query.q||'').toLowerCase();let services=catalog.services.filter(x=>!term||(`${x.name} ${x.category}`).toLowerCase().includes(term));s.json({total:services.length,services})});
app.get('/api/partner/me',partnerAuth,(q,s)=>s.json({partner:{name:q.partner.name,role:q.partner.role,partnerId:q.partner.partnerId,mobile:q.partner.mobile,state:q.partner.state,city:q.partner.city,district:q.partner.district,email:q.partner.email}}));
app.post('/api/partner/login',(q,s)=>{if(!process.env.AUTH_SECRET)return s.status(503).json({message:'AUTH_SECRET is not configured on Render.'});let {partnerId,password}=q.body||{};let p=arr(files.partners).find(x=>x.partnerId===String(partnerId||'').trim()&&x.status==='Approved');if(!p||!p.passwordSalt||hash(String(password||''),p.passwordSalt)!==p.passwordHash)return s.status(401).json({message:'Invalid Partner ID or password, or Admin approval pending.'});s.json({token:tokenFor(p.partnerId),partner:{name:p.name,role:p.role,partnerId:p.partnerId,mobile:p.mobile}})});
// Password reset without SMS OTP: partner submits a request; Admin verifies and approves it.
app.post('/api/partner/password-reset-request',(q,s)=>{
 const b=q.body||{},partnerId=String(b.partnerId||'').trim(),mobile=String(b.mobile||'').replace(/\D/g,''),newPassword=String(b.newPassword||'');
 if(!partnerId||! /^[6-9]\d{9}$/.test(mobile)||newPassword.length<8)return s.status(400).json({message:'Enter Partner ID, registered 10-digit mobile and a password of at least 8 characters.'});
 const partners=arr(files.partners),p=partners.find(x=>x.partnerId===partnerId&&x.mobile===mobile&&x.status==='Approved');
 if(!p)return s.status(404).json({message:'Approved Partner ID and registered mobile do not match.'});
 const requests=arr(files.passwordResets);
 if(requests.some(x=>x.partnerId===partnerId&&x.status==='Pending'))return s.status(409).json({message:'A password reset request is already pending Admin verification.'});
 const salt=crypto.randomBytes(16).toString('hex');
 const request={reference:'NDS-PWR-'+Date.now(),partnerId,mobile,passwordSalt:salt,passwordHash:hash(newPassword,salt),status:'Pending',createdAt:new Date().toISOString()};
 requests.push(request);write(files.passwordResets,requests);
 s.status(201).json({message:'Password reset request submitted. It will work only after Admin approval.',reference:request.reference});
});
app.get('/api/admin/password-reset-requests',admin,(q,s)=>s.json({requests:arr(files.passwordResets).filter(x=>x.status==='Pending').map(({passwordSalt,passwordHash,...x})=>x)}));
app.post('/api/admin/password-reset-requests/:reference/approve',admin,(q,s)=>{
 const requests=arr(files.passwordResets),r=requests.find(x=>x.reference===q.params.reference);
 if(!r)return s.status(404).json({message:'Password reset request not found.'});
 if(r.status!=='Pending')return s.status(409).json({message:'Request already processed.'});
 const partners=arr(files.partners),p=partners.find(x=>x.partnerId===r.partnerId&&x.mobile===r.mobile&&x.status==='Approved');
 if(!p)return s.status(404).json({message:'Approved partner account not found.'});
 p.passwordSalt=r.passwordSalt;p.passwordHash=r.passwordHash;p.passwordUpdatedAt=new Date().toISOString();
 r.status='Approved';r.approvedAt=new Date().toISOString();write(files.partners,partners);write(files.passwordResets,requests);
 s.json({message:'Password reset approved. The new password is now active.'});
});
app.post('/api/admin/password-reset-requests/:reference/reject',admin,(q,s)=>{
 const requests=arr(files.passwordResets),r=requests.find(x=>x.reference===q.params.reference);
 if(!r)return s.status(404).json({message:'Password reset request not found.'});
 if(r.status!=='Pending')return s.status(409).json({message:'Request already processed.'});
 r.status='Rejected';r.rejectedAt=new Date().toISOString();delete r.passwordSalt;delete r.passwordHash;write(files.passwordResets,requests);s.json({message:'Password reset request rejected.'});
});

app.post('/api/partner-registrations',(q,s)=>{let b=q.body||{},name=String(b.name||'').trim(),mobile=String(b.mobile||''),role=String(b.role||''),fee=role==='Retailer'?100:role==='Distributor'?200:0;let utr=String(b.utr||'').trim();if(name.length<2||! /^[6-9]\d{9}$/.test(mobile)||!fee||!b.state||!String(b.city||'').trim()||!String(b.district||'').trim()||!utr||!['Andhra Pradesh Grameena Bank QR','Airtel Payments Bank QR'].includes(b.bank))return s.status(400).json({message:'Please enter valid details, choose QR and submit UTR.'});let a=arr(files.partners);if(a.some(x=>x.mobile===mobile&&['Pending review','Approved'].includes(x.status)))return s.status(409).json({message:'An application already exists for this mobile.'});let reference='NDS-PART-'+Date.now();a.push({reference,name,mobile,role,fee,state:String(b.state),city:String(b.city||''),district:String(b.district||''),email:String(b.email||''),bank:b.bank,utr,status:'Pending review',createdAt:new Date().toISOString()});write(files.partners,a);s.status(201).json({message:'Registration submitted. Admin will verify payment and approve.',reference})});
app.get('/api/admin/partners',admin,(q,s)=>s.json({applications:arr(files.partners).filter(x=>x.status==='Pending review')}));
app.post('/api/admin/partners/:reference/approve',admin,(q,s)=>{let a=arr(files.partners),p=a.find(x=>x.reference===q.params.reference);if(!p)return s.status(404).json({message:'Application not found'});if(p.status!=='Pending review')return s.status(409).json({message:'Already processed'});p.status='Approved';p.partnerId=(p.role==='Retailer'?'NDSR':'NDSD')+p.mobile.slice(-6)+crypto.randomBytes(2).toString('hex').toUpperCase();let password=crypto.randomBytes(6).toString('base64url');p.passwordSalt=crypto.randomBytes(16).toString('hex');p.passwordHash=hash(password,p.passwordSalt);p.approvedAt=new Date().toISOString();write(files.partners,a);s.json({message:'Approved. Share these login credentials securely with partner.',partnerId:p.partnerId,temporaryPassword:password})});
app.post('/api/admin/partners/:reference/reject',admin,(q,s)=>{let a=arr(files.partners),p=a.find(x=>x.reference===q.params.reference);if(!p)return s.status(404).json({message:'Application not found'});if(p.status!=='Pending review')return s.status(409).json({message:'Already processed'});p.status='Rejected';p.rejectedAt=new Date().toISOString();write(files.partners,a);s.json({message:'Registration rejected'})});
app.get('/api/wallet/me',partnerAuth,(q,s)=>{let d=wallet(),m=q.partner.mobile;s.json({mobile:m,balance:d.wallets[m]||0,history:d.history.filter(x=>x.mobile===m).slice(-20).reverse()})});
app.post('/api/recharge/submit',partnerAuth,(q,s)=>{let b=q.body||{},amount=Number(b.amount);if(String(b.mobile||'')!==String(q.partner.mobile)||String(b.role||'')!==String(q.partner.role)||!Number.isInteger(amount)||amount<100||amount>3000||!String(b.utr||'').trim()||!['Paytm QR - Andhra Pradesh Bank','Airtel Payments Bank QR'].includes(b.bank))return s.status(400).json({message:'Use your approved partner account details, choose a QR, submit UTR and enter ₹100–₹3,000.'});let d=wallet(),id='NDSRCH'+Date.now();d.requests.push({id,name:q.partner.name,mobile:q.partner.mobile,role:q.partner.role,amount,bank:b.bank,utr:String(b.utr).trim(),status:'Pending',createdAt:new Date().toISOString()});write(files.wallet,d);s.status(201).json({message:'Recharge request submitted for Admin verification.',id})});
app.get('/api/admin/recharges',admin,(q,s)=>s.json({requests:wallet().requests.filter(x=>x.status==='Pending')}));
app.post('/api/admin/recharges/:id/:action',admin,(q,s)=>{let d=wallet(),x=d.requests.find(v=>v.id===q.params.id);if(!x)return s.status(404).json({message:'Request not found'});if(x.status!=='Pending')return s.status(409).json({message:'Already processed'});if(!['approve','reject'].includes(q.params.action))return s.status(404).end();x.status=q.params.action==='approve'?'Approved':'Rejected';if(x.status==='Approved'){d.wallets[x.mobile]=(d.wallets[x.mobile]||0)+x.amount;d.history.push({id:x.id,mobile:x.mobile,amount:x.amount,status:'Credited',createdAt:new Date().toISOString()})}write(files.wallet,d);s.json({message:x.status==='Approved'?'Approved and wallet credited':'Recharge rejected'})});
app.post('/api/service-requests',partnerAuth,(q,s)=>{let b=q.body||{},name=String(b.name||'').trim(),mobile=String(b.mobile||'');if(name.length<2||! /^\d{10}$/.test(mobile)||!b.serviceId)return s.status(400).json({message:'Enter customer name, valid mobile and service.'});let service=catalog.services.find(x=>String(x.id)===String(b.serviceId));if(!service)return s.status(404).json({message:'Service not found in catalogue.'});let charge=feeFor(service),d=wallet(),m=q.partner.mobile,balance=d.wallets[m]||0;if(balance<charge)return s.status(402).json({message:`Insufficient wallet balance. Required portal service charge ₹${charge}; current balance ₹${balance}. Please recharge.`});let idem=String(q.get('idempotency-key')||'').trim();let records=arr(files.services);if(idem){let prior=records.find(x=>x.partnerId===q.partner.partnerId&&x.idempotencyKey===idem);if(prior)return s.json({message:'This service request was already charged.',reference:prior.reference,officialUrl:prior.officialUrl,balance:d.wallets[m]})}d.wallets[m]=balance-charge;d.history.push({id:'SRV'+Date.now(),mobile:m,amount:-charge,status:'Service charge',serviceName:service.name,createdAt:new Date().toISOString()});write(files.wallet,d);let url=officialUrl(service.name);let reference='NDS-SRV-'+Date.now();records.push({reference,partnerId:q.partner.partnerId,customerName:name,customerMobile:mobile,customerState:String(b.customerState||''),customerCity:String(b.customerCity||''),customerDistrict:String(b.customerDistrict||''),customerEmail:String(b.customerEmail||''),serviceId:service.id,serviceName:service.name,portalServiceCharge:charge,governmentFee:Number(b.governmentFee)||0,officialUrl:url,status:'Charged; user must complete on official portal',idempotencyKey:idem,createdAt:new Date().toISOString()});write(files.services,records);s.status(201).json({message:`₹${charge} deducted from wallet. Continue on the official portal.`,reference,officialUrl:url,balance:d.wallets[m]})});
app.get('/api/admin/service-requests',admin,(q,s)=>s.json({requests:arr(files.services).slice(-100).reverse()}));
app.use('/api',(q,s)=>s.status(404).json({message:'API route not found'}));app.use((e,q,s,n)=>{console.error(e);s.status(500).json({message:'Internal server error'})});
const PORT=process.env.PORT||3000;app.listen(PORT,()=>console.log('Government & Digital Services API on '+PORT));
