/* Dao Ky Thu: seven-day, no-payment membership trials.
   Firestore rules are the source of truth for eligibility and timestamps. */
(function(){
 'use strict';
 const PLANS={premium:{label:'Premium',price:'39.000đ/tháng',items:['Bài tập nâng cao trong tương lai','Trang trí hồ sơ Premium','Các tính năng Premium khi được phát hành']},teacher_pro:{label:'Giáo viên Pro',price:'149.000đ/tháng',items:['Quản lý lớp nâng cao trong tương lai','Báo cáo học tập nâng cao','Công cụ giáo viên Pro khi được phát hành']}};
 const DAY=86400000;
 let trial=null;
 let unsub=null;
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
  const status=!trial?'Chưa sử dụng lần dùng thử':ongoing?(trial.cancelled?'Đã hủy · còn hiệu lực':'Đang dùng thử'):'Đã kết thúc dùng thử';
  const until=trial?.endsAt?.toDate?.().toLocaleString('vi-VN')||'';
  root.innerHTML='<p class="vqc-membership-sub">Cơ bản luôn miễn phí · Học Vùng 1–5, chơi cờ và tham gia lớp học vẫn hoạt động.</p>'+
  '<div class="vqc-membership-card"><strong>👑 '+cfg.label+'</strong><span>'+cfg.price+' (mức giá dự kiến, chưa thu phí)</span>'+
  '<ul>'+cfg.items.map(x=>'<li>'+x+'</li>').join('')+'</ul><p><strong>'+status+'</strong></p>'+
  (ongoing?'<p>Thời gian còn lại: <strong>'+Math.ceil(remaining/DAY)+' ngày</strong> · Hết hạn '+until+'</p>'+
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
  accountUid=uid;trial=null;
  if(uid){
   unsub=db.collection('membershipTrials').doc(uid).onSnapshot(s=>{
    if(accountUid!==uid)return;trial=s.exists?s.data():null;render();
   },e=>{console.warn('Membership status:',e);render();});
  }
  render();
 }
 window.vqcOpenMembership=function(){
  const dialog=el('vqcMembershipDialog');if(!dialog)return;
  if(!window.accountProfile){showAccountPanel();return;}
  dialog.hidden=false;render();
 };
 window.vqcCloseMembership=function(){const dialog=el('vqcMembershipDialog');if(dialog)dialog.hidden=true;};
 window.addEventListener('vqc:account-change',init);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
 setInterval(()=>{if(!el('vqcMembershipDialog')?.hidden)render();},60000);
})();