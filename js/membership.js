/* Dao Ky Thu: seven-day, no-payment membership trials.
   Firestore rules are the source of truth for eligibility and timestamps. */
(function(){
 'use strict';
 const PLANS={premium:{label:'Premium',price:'39.000đ/tháng',items:['Bài tập nâng cao trong tương lai','Trang trí hồ sơ Premium','Các tính năng Premium khi được phát hành']},teacher_pro:{label:'Giáo viên Pro',price:'149.000đ/tháng',items:['Quản lý lớp nâng cao trong tương lai','Báo cáo học tập nâng cao','Công cụ giáo viên Pro khi được phát hành']}};
 const DAY=86400000;
 let trial=null;
 let unsub=null;
 let entitlementUnsub=null;
 let entitlement=null;
 let loading=false;
 let serverOffset=0;
 let accountUid=null;
 const el=id=>document.getElementById(id);
 function render(){
  const root=el('vqcMembershipBody');if(!root)return;
  const user=window.accountProfile;
  const plan=user?.role==='teacher'?'teacher_pro':'premium';
  const cfg=PLANS[plan];
  const now=Date.now()+serverOffset;
  const end=trial?.endsAt?.toMillis?.()||0;
  const remaining=Math.max(0,end-now);
  const ongoing=!!trial&&remaining>0;
  const entEnd=entitlement?.expiresAt?.toMillis?.()||0;
  const granted=!!entitlement&&!entitlement.revoked&&(!entEnd||entEnd>now);
  const status=granted?'Được quản trị viên cấp '+(entitlement.plan==='teacher_pro'?'Giáo viên Pro':'Premium'):!trial?'Chưa sử dụng lần dùng thử':ongoing?(trial.cancelled?'Đã hủy · còn hiệu lực':'Đang dùng thử'):'Đã kết thúc dùng thử';
  const until=trial?.endsAt?.toDate?.().toLocaleString('vi-VN')||'';
  root.innerHTML='<p class="vqc-membership-sub">Cơ bản luôn miễn phí · Học Vùng 1–5, chơi cờ và tham gia lớp học vẫn hoạt động.</p>'+
  '<div class="vqc-membership-card"><strong>👑 '+cfg.label+'</strong><span>'+cfg.price+' (mức giá dự kiến, chưa thu phí)</span>'+
  '<ul>'+cfg.items.map(x=>'<li>'+x+'</li>').join('')+'</ul><p><strong>'+status+'</strong></p>'+
  (granted?'<p>Quyền do quản trị viên cấp · '+(entEnd?'Hết hạn '+entitlement.expiresAt.toDate().toLocaleString('vi-VN'):'Không thời hạn')+'</p>':ongoing?'<p>Thời gian còn lại: <strong>'+Math.ceil(remaining/DAY)+' ngày</strong> · Hết hạn '+until+'</p>'+
     '<p>Không yêu cầu thẻ. Không tự trừ tiền. '+(trial.cancelled?'Đã ghi nhận hủy dùng thử.':'Có thể hủy bất cứ lúc nào.')+'</p>'+
     (!trial.cancelled?'<button class="btn btn-soft" id="vqcMembershipCancel" type="button">Hủy dùng thử</button>':''):
    !trial?'<p>Trải nghiệm miễn phí 7 ngày, không cần thẻ và không tự động gia hạn.</p><button class="btn btn-blue" type="button" id="vqcMembershipStart">Bắt đầu dùng thử 7 ngày</button>':
    '<p>Đã hết 7 ngày dùng thử. Tất cả dữ liệu học tập được giữ nguyên.</p>')+
  '</div><p class="vqc-membership-small">Chưa có thanh toán thật. Những quyền lợi nâng cao chưa được xây dựng vẫn chưa thể sử dụng. Gói thử chỉ đánh dấu trạng thái tài khoản, không mở khóa giả các chức năng.</p>';
  el('vqcMembershipStart')?.addEventListener('click',start);
  el('vqcMembershipCancel')?.addEventListener('click',cancel);
 }
 async function start(){
  const u=window.accountProfile;
  if(!u?.uid||loading||trial)return;
  loading=true;const button=el('vqcMembershipStart');if(button)button.disabled=true;
  try{
   const ref=db.collection('membershipTrials').doc(u.uid);
   const snap=await ref.get();
   if(snap.exists)throw Error('Tài khoản đã dùng thử một lần.');
   const now=firebase.firestore.Timestamp.now();
   await ref.set({plan:u.role==='teacher'?'teacher_pro':'premium',startedAt:firebase.firestore.FieldValue.serverTimestamp(),
    endsAt:firebase.firestore.Timestamp.fromMillis(now.toMillis()+7*DAY),cancelled:false,cancelledAt:null});
   await sync(u.uid);
  }catch(e){console.warn('Membership trial:',e);alert('Chưa thể kích hoạt dùng thử. '+(e.code==='permission-denied'?'Vui lòng triển khai Firestore Rules trước.':e.message));}
  finally{loading=false;render();}
 }
 async function cancel(){
  const u=window.accountProfile;if(!u?.uid||!trial||trial.cancelled||loading)return;
  loading=true;try{await db.collection('membershipTrials').doc(u.uid).update({cancelled:true,cancelledAt:firebase.firestore.FieldValue.serverTimestamp()});await sync(u.uid);}
  catch(e){console.warn(e);alert('Không thể hủy dùng thử: '+e.message);}
  finally{loading=false;render();}
 }
 async function sync(uid){
  const s=await db.collection('membershipTrials').doc(uid).get({source:'server'});
  if(accountUid!==uid)return;
  trial=s.exists?s.data():null;render();
 }
 async function init(){
  const uid=window.accountProfile?.uid||null;
  if(uid===accountUid)return;
  if(unsub){unsub();unsub=null;}
  if(entitlementUnsub){entitlementUnsub();entitlementUnsub=null;}
  accountUid=uid;trial=null;entitlement=null;
  if(uid){
   entitlementUnsub=db.collection('membershipEntitlements').doc(uid).onSnapshot(s=>{if(accountUid!==uid)return;entitlement=s.exists?s.data():null;render();},e=>console.warn('Membership entitlement:',e));
   unsub=db.collection('membershipTrials').doc(uid).onSnapshot(s=>{
    if(accountUid!==uid)return;trial=s.exists?s.data():null;render();
   },e=>{console.warn('Membership status:',e);render();});
  }
  render();
 }
 window.vqcOpenMembership=function(){
  const dialog=el('vqcMembershipDialog');if(!dialog)return;
  if(!window.accountProfile){showAccountPanel();return;}
  dialog.hidden=false;render();adminPanel();
 };
 window.vqcCloseMembership=function(){const dialog=el('vqcMembershipDialog');if(dialog)dialog.hidden=true;};

 // Spark-only admin: Firestore rules are the actual authorization boundary.
 const ADMIN_UID='DIZfL0tmr5eT7I7gOGF3h75EGkH3';
 let adminTarget=null;
 const adminMsg=m=>{const n=el('vqcAdminMessage');if(n)n.textContent=m;};
 function adminPanel(){
  const root=el('vqcMembershipAdmin');if(!root)return;
  const allowed=window.accountProfile?.uid===ADMIN_UID;
  root.hidden=false;
  if(!allowed){
   root.replaceChildren();
   const p=document.createElement('p');
   p.textContent='Quản trị viên: tài khoản hiện tại chưa được nhận diện. UID đang đăng nhập: '+(window.accountProfile?.uid||'Chưa đăng nhập')+'. Hãy đối chiếu UID trong Firebase Authentication và tải lại trang.';
   root.append(p);return;
  }
  root.innerHTML='<h3>🛡️ Quản trị gói thành viên · Spark</h3><p>Tìm bằng UID hoặc mã tài khoản. Chỉ chủ sở hữu được ghi quyền.</p>'+
   '<div class="vqc-admin-row"><input id="vqcAdminLookup" placeholder="UID hoặc mã tài khoản" maxlength="128"><button class="btn btn-soft" id="vqcAdminSearch">Tìm</button></div>'+
   '<div id="vqcAdminFound"></div><p id="vqcAdminMessage" role="status"></p>';
  el('vqcAdminSearch').onclick=async()=>{
   const q=el('vqcAdminLookup').value.trim();if(!q)return;
   adminTarget=null;adminMsg('Đang tìm tài khoản...');
   try{
    let snap=await db.collection('users').doc(q).get();
    if(!snap.exists){
     // No public user-directory search: owner can search by exact code.
     const results=await db.collection('users').where('code','==',q).limit(2).get();
     if(results.size!==1)throw Error('Không tìm thấy một tài khoản duy nhất.');
     snap=results.docs[0];
    }
    const u=snap.data();
    if(u.active!==true||!['student','teacher'].includes(u.role))throw Error('Tài khoản không hoạt động.');
    adminTarget={uid:snap.id,...u};
    const box=el('vqcAdminFound');box.replaceChildren();
    const info=document.createElement('p');info.textContent=(u.name||u.code||snap.id)+' · '+(u.role==='teacher'?'Giáo viên':'Học sinh')+' · UID: '+snap.id;box.append(info);
    const dur=document.createElement('select');dur.id='vqcAdminDays';
    [['7','7 ngày'],['30','30 ngày'],['365','1 năm'],['unlimited','Không thời hạn']].forEach(([v,label])=>{const o=document.createElement('option');o.value=v;o.textContent=label;dur.append(o);});box.append(dur);
    const grant=document.createElement('button');grant.className='btn btn-blue';grant.textContent='Cấp / gia hạn';grant.onclick=async()=>{
     if(!confirm('Cấp '+(u.role==='teacher'?'Giáo viên Pro':'Premium')+' cho '+(u.name||snap.id)+'?'))return;
     const days=dur.value==='unlimited'?null:Number(dur.value);
     const now=firebase.firestore.Timestamp.now(),expiresAt=days===null?null:firebase.firestore.Timestamp.fromMillis(now.toMillis()+days*86400000);
     const ref=db.collection('membershipEntitlements').doc(snap.id);
     grant.disabled=true;
     try{
      const batch=db.batch();
      batch.set(ref,{plan:u.role==='teacher'?'teacher_pro':'premium',expiresAt,revoked:false,grantedAt:now,grantedBy:ADMIN_UID,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      batch.set(db.collection('membershipAudit').doc(),{uid:snap.id,action:'grant',plan:u.role==='teacher'?'teacher_pro':'premium',actor:ADMIN_UID,days,at:firebase.firestore.FieldValue.serverTimestamp()});
      await batch.commit();adminMsg('Đã cấp gói thành công.');
     }catch(e){adminMsg('Không thể cấp: '+e.message);}finally{grant.disabled=false;}
    };box.append(grant);
    const revoke=document.createElement('button');revoke.className='btn btn-soft';revoke.textContent='Thu hồi';revoke.onclick=async()=>{
     if(!confirm('Thu hồi quyền của '+(u.name||snap.id)+'?'))return;
     revoke.disabled=true;
     try{
      const ref=db.collection('membershipEntitlements').doc(snap.id),prev=await ref.get();
      if(!prev.exists)throw Error('Tài khoản chưa được cấp quyền.');
      const batch=db.batch();
      batch.update(ref,{revoked:true,revokedBy:ADMIN_UID,revokedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      batch.set(db.collection('membershipAudit').doc(),{uid:snap.id,action:'revoke',plan:prev.data().plan,actor:ADMIN_UID,days:null,at:firebase.firestore.FieldValue.serverTimestamp()});
      await batch.commit();adminMsg('Đã thu hồi quyền.');
     }catch(e){adminMsg('Không thể thu hồi: '+e.message);}finally{revoke.disabled=false;}
    };box.append(revoke);adminMsg('');
   }catch(e){adminMsg('Không tìm thấy hoặc không đủ quyền: '+e.message);}
  };
 }
 window.vqcMembershipAdminRefresh=adminPanel;
 window.addEventListener('vqc:account-change',()=>{init();adminPanel();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{init();adminPanel();});
 else {init();adminPanel();}
 setInterval(()=>{if(!el('vqcMembershipDialog')?.hidden)render();},60000);
})();