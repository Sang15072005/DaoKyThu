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

 let adminVerified=false,adminTarget=null;
 const call=(name,payload)=>firebase.app().functions('asia-southeast1').httpsCallable(name)(payload);
 function adminMsg(message){const n=el('vqcAdminMessage');if(n)n.textContent=message;}
 function adminPanel(){
  const root=el('vqcMembershipAdmin');if(!root)return;
  root.hidden=!adminVerified;
  if(!adminVerified)return;
  root.innerHTML='<h3>🛡️ Quản trị gói thành viên</h3>'+
   '<label for="vqcAdminLookup">UID hoặc mã tài khoản</label><div class="vqc-admin-row"><input id="vqcAdminLookup" maxlength="128" placeholder="UID / mã tài khoản"><button type="button" class="btn btn-soft" id="vqcAdminSearch">Tìm</button></div>'+
   '<div id="vqcAdminFound"></div><p id="vqcAdminMessage" role="status"></p>';
  el('vqcAdminSearch').addEventListener('click',async()=>{
   const q=el('vqcAdminLookup').value.trim();if(!q)return;
   adminTarget=null;adminMsg('Đang tìm...');
   try{
    const response=await call('membershipAdminLookup',{query:q});
    const u=response.data;adminTarget=u;
    const name=document.createElement('strong');name.textContent=(u.name||u.code||u.uid)+' · '+(u.role==='teacher'?'Giáo viên':'Học sinh');
    const box=el('vqcAdminFound');box.replaceChildren(name);
    const details=document.createElement('p');details.textContent='UID: '+u.uid+' | Gói hiện tại: '+(u.entitlement?.plan||'Chưa cấp')+(u.entitlement?.revoked?' (đã thu hồi)':'');box.append(details);
    const select=document.createElement('select');select.id='vqcAdminPlan';
    for(const [value,label] of [['premium','Premium'],['teacher_pro','Giáo viên Pro']]){const opt=document.createElement('option');opt.value=value;opt.textContent=label;select.append(opt);}
    select.value=u.role==='teacher'?'teacher_pro':'premium';box.append(select);
    const duration=document.createElement('select');duration.id='vqcAdminDays';
    for(const [value,label] of [['7','7 ngày'],['30','30 ngày'],['365','1 năm'],['unlimited','Không thời hạn']]){const opt=document.createElement('option');opt.value=value;opt.textContent=label;duration.append(opt);}
    box.append(duration);
    const grant=document.createElement('button');grant.type='button';grant.className='btn btn-blue';grant.textContent='Cấp / gia hạn';box.append(grant);
    grant.addEventListener('click',async()=>{
     if(!adminTarget||!confirm('Xác nhận cấp quyền cho '+(adminTarget.name||adminTarget.uid)+'?'))return;
     grant.disabled=true;try{await call('membershipAdminGrant',{uid:adminTarget.uid,plan:select.value,days:duration.value==='unlimited'?null:Number(duration.value)});adminMsg('Đã cấp quyền.');}
     catch(e){adminMsg('Lỗi cấp quyền: '+e.message);}finally{grant.disabled=false;}
    });
    const revoke=document.createElement('button');revoke.type='button';revoke.className='btn btn-soft';revoke.textContent='Thu hồi quyền';box.append(revoke);
    revoke.addEventListener('click',async()=>{
     if(!adminTarget||!confirm('Thu hồi gói của '+(adminTarget.name||adminTarget.uid)+'?'))return;
     revoke.disabled=true;try{await call('membershipAdminRevoke',{uid:adminTarget.uid});adminMsg('Đã thu hồi quyền.');}
     catch(e){adminMsg('Lỗi thu hồi: '+e.message);}finally{revoke.disabled=false;}
    });
    adminMsg('');
   }catch(e){adminMsg('Không tìm thấy tài khoản hoặc không đủ quyền: '+e.message);}
  });
 }
 async function adminCheck(){
  adminVerified=false;adminPanel();
  if(!window.accountProfile?.uid)return;
  try{const r=await call('membershipAdminCheck',{});adminVerified=r.data?.admin===true;}
  catch(e){adminVerified=false;}
  adminPanel();
 }
 window.vqcMembershipAdminRefresh=adminCheck;
 window.addEventListener('vqc:account-change',()=>{init();adminCheck();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{init();adminCheck();});
 else {init();adminCheck();}
 setInterval(()=>{if(!el('vqcMembershipDialog')?.hidden)render();},60000);
})();