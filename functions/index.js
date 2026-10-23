'use strict';
const functions=require('firebase-functions/v1');
const admin=require('firebase-admin');
admin.initializeApp();
const db=admin.firestore();
const region=functions.region('asia-southeast1');
const ALLOWED_PLANS=['premium','teacher_pro'];
function requireAdmin(context){
 if(!context.auth)throw new functions.https.HttpsError('unauthenticated','Cần đăng nhập.');
 const uid=context.auth.uid;
 const admins=(process.env.MEMBERSHIP_ADMIN_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!admins.includes(uid))throw new functions.https.HttpsError('permission-denied','Chỉ quản trị viên được cấp gói.');
 return uid;
}
const err=(message)=>new functions.https.HttpsError('invalid-argument',message);
exports.membershipAdminLookup=region.https.onCall(async(data,context)=>{
 requireAdmin(context);
 const key=String(data?.query||'').trim();
 if(!key||key.length>128)throw err('Nhập UID hoặc mã tài khoản hợp lệ.');
 let doc=await db.collection('users').doc(key).get();
 if(!doc.exists){
  const q=await db.collection('users').where('code','==',key).limit(2).get();
  if(q.size!==1)throw new functions.https.HttpsError('not-found','Không tìm thấy một tài khoản duy nhất.');
  doc=q.docs[0];
 }
 const u=doc.data()||{};
 const ent=await db.collection('membershipEntitlements').doc(doc.id).get();
 return {uid:doc.id,name:String(u.name||''),code:String(u.code||''),role:String(u.role||''),active:u.active===true,
 entitlement:ent.exists?{plan:ent.data().plan,expiresAt:ent.data().expiresAt?.toMillis?.()||null,revoked:ent.data().revoked===true}:null};
});
exports.membershipAdminGrant=region.https.onCall(async(data,context)=>{
 const actor=requireAdmin(context);
 const uid=String(data?.uid||'').trim(),plan=String(data?.plan||'');
 const days=data?.days;
 if(!uid||uid.length>128||!ALLOWED_PLANS.includes(plan))throw err('UID hoặc gói không hợp lệ.');
 if(!(days===null||Number.isInteger(days)&&[7,30,365].includes(days)))throw err('Thời hạn không hợp lệ.');
 const user=await db.collection('users').doc(uid).get();
 if(!user.exists||user.data().active!==true)throw new functions.https.HttpsError('failed-precondition','Tài khoản không hoạt động.');
 if((plan==='premium'&&user.data().role!=='student')||(plan==='teacher_pro'&&user.data().role!=='teacher'))throw err('Gói không phù hợp với vai trò tài khoản.');
 const now=admin.firestore.Timestamp.now(),ref=db.collection('membershipEntitlements').doc(uid);
 const expiresAt=days===null?null:admin.firestore.Timestamp.fromMillis(now.toMillis()+days*86400000);
 await db.runTransaction(async tx=>{
  const prev=await tx.get(ref);
  tx.set(ref,{plan,expiresAt,revoked:false,grantedAt:now,grantedBy:actor,updatedAt:now});
  tx.create(db.collection('membershipAudit').doc(),{uid,action:'grant',plan,days,actor,at:now,previous:prev.exists?{plan:prev.data().plan,revoked:prev.data().revoked}:null});
 });
 return {ok:true};
});
exports.membershipAdminRevoke=region.https.onCall(async(data,context)=>{
 const actor=requireAdmin(context),uid=String(data?.uid||'').trim();
 if(!uid||uid.length>128)throw err('UID không hợp lệ.');
 const ref=db.collection('membershipEntitlements').doc(uid),now=admin.firestore.Timestamp.now();
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists)throw new functions.https.HttpsError('not-found','Chưa có gói được cấp.');
  tx.update(ref,{revoked:true,updatedAt:now,revokedAt:now,revokedBy:actor});
  tx.create(db.collection('membershipAudit').doc(),{uid,action:'revoke',plan:snap.data().plan,actor,at:now});
 });
 return {ok:true};
});
exports.membershipAdminCheck=region.https.onCall(async(data,context)=>{
 const actor=requireAdmin(context);
 return {admin:true,uid:actor};
});
