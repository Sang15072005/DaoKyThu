/* Đảo Kỳ Thủ — Student friend codes, invitations, and achievement preview.
 * No public user search, chat, presence tracking, or personal names.
 * Requires the companion Firestore rules to be deployed separately.
 */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const AVATARS=['king','queen','knight','scholar','explorer'];
 const AVATAR_PATHS={king:'./assets/nhanvat%20(2).png',queen:'./assets/nhanvat%20(3).png',knight:'./assets/nhanvat%20(4).png',scholar:'./assets/nhanvat%20(5).png',explorer:'./assets/nhanvat%20(6).png'};
 const MAX_FRIENDS=50,MAX_PENDING=20;
 let currentUid=null,ownCode='',friendDocs=[],unsub=null,busy=false,modalFocus=null,statsTimer=null,profileSignature='';
 let foundFriend=null,lookupVersion=0,showName=false,friendView='cards';
 const backend=()=>typeof db!=='undefined'&&typeof auth!=='undefined'&&auth.currentUser;
 const currentProfile=()=>window.accountProfile;
 const activeStudent=()=>!!(backend()&&currentProfile()?.role==='student'&&currentProfile()?.uid===auth.currentUser.uid);
 const nick=uid=>'Kỳ thủ '+String(uid||'').slice(-4).toUpperCase();
 const timeStamp=()=>firebase.firestore.FieldValue.serverTimestamp();
 const ownPair=(a,b)=>[a,b].sort().join('_');
 const note=(message,error=false)=>{
  const node=$('vqcFriendsStatus');
  if(node){node.textContent=message;node.classList.toggle('is-error',error);}
 };
 const setBusy=value=>{
  busy=value;
  ['vqcFriendsSend','vqcFriendsCopyCode'].forEach(id=>{const element=$(id);if(element)element.disabled=value;});
 };
 const build=(tag,className,label)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(label!==undefined)el.textContent=label;
  return el;
 };
 const formatTime=stamp=>{
  try{
   if(!stamp||typeof stamp.toDate!=='function')return '';
   return stamp.toDate().toLocaleDateString('vi-VN');
  }catch(error){return '';}
 };
 function randomCode(){
  if(!window.crypto?.getRandomValues)throw Error('Trình duyệt không hỗ trợ tạo mã an toàn.');
  const values=new Uint32Array(10);
  window.crypto.getRandomValues(values);
  return 'KT'+Array.from(values,v=>ALPHABET[v%ALPHABET.length]).join('');
 }
 function errorText(error){
  console.warn('[Bạn bè Kỳ Thủ]',error);
  if(error?.code==='permission-denied')return 'Firebase từ chối quyền truy cập (permission-denied). Hãy nhấn Kiểm tra quyền Firebase để biết bước nào bị chặn.';
  if(error?.code==='unavailable')return 'Mất kết nối Firebase. Hãy thử lại khi có Internet.';
  if(error?.code==='failed-precondition')return 'Dữ liệu Firebase chưa sẵn sàng. Vui lòng thử lại.';
  return String(error?.message||'Có lỗi, vui lòng thử lại.');
 }
 async function ensureFriendCode(){
  if(!activeStudent())return;
  const user=currentUid;
  const settings=db.collection('friendSettings').doc(user);
  let existing;
  try{existing=await settings.get();}
  catch(error){console.warn('[Bạn bè Kỳ Thủ] friendSettings.get bị từ chối',error);throw error;}
  if(currentUid!==user)return;
  if(existing.exists){
   ownCode=String(existing.data().code||'');
   $('vqcFriendsMyCode').textContent=ownCode||'Chưa có mã';
   return;
  }
  for(let attempt=0;attempt<4;attempt++){
   try{
    const code=randomCode(),directory=db.collection('friendDirectory').doc(code);
    const result=await db.runTransaction(async tx=>{
     const own=await tx.get(settings);
     if(own.exists)return own.data().code;
     const duplicate=await tx.get(directory);
     if(duplicate.exists)throw Error('CODE_COLLISION');
     tx.set(settings,{code,createdAt:timeStamp()});
     tx.set(directory,{ownerId:user,createdAt:timeStamp()});
     return code;
    });
    if(currentUid!==user)return;
    ownCode=result;
    $('vqcFriendsMyCode').textContent=ownCode;
    return;
   }catch(error){
    if(error?.message==='CODE_COLLISION')continue;
    console.warn('[Bạn bè Kỳ Thủ] friendSettings.create + friendDirectory.create thất bại',error);
    throw error;
   }
  }
  throw Error('Chưa tạo được mã Kỳ Thủ. Hãy thử lại.');
 }
 function stopListening(){
  if(unsub){unsub();unsub=null;}
  currentUid=null;ownCode='';friendDocs=[];profileSignature='';foundFriend=null;lookupVersion++;
  if($('vqcFriendsFound'))$('vqcFriendsFound').hidden=true;
  clearTimeout(statsTimer);
  if($('vqcFriendsMyCode'))$('vqcFriendsMyCode').textContent='Đang tải...';
  if($('vqcFriendsUnread'))$('vqcFriendsUnread').hidden=true;
 }
 function ownProfile(){
  if(!window.vqcGetFriendStats)return null;
  const raw=window.vqcGetFriendStats();
  if(!raw)return null;
  return {
   sharedName:showName?String(currentProfile()?.name||'').trim().slice(0,100):'',
   avatar:AVATARS.includes(raw.avatar)?raw.avatar:'explorer',
   stars:Math.max(0,Math.min(186,Math.floor(Number(raw.stars)||0))),
   regions:Math.max(0,Math.min(5,Math.floor(Number(raw.regions)||0))),
   badges:Math.max(0,Math.min(5,Math.floor(Number(raw.badges)||0)))
  };
 }
 async function publishProfile(){
  if(!activeStudent())return;
  const stats=ownProfile();
  if(!stats)return;
  const signature=JSON.stringify(stats);
  if(signature===profileSignature)return;
  const who=currentUid;
  try{
   await db.collection('friendPublicProfiles').doc(who).set({...stats,updatedAt:timeStamp()});
   if(currentUid===who)profileSignature=signature;
  }catch(error){console.warn('Chưa cập nhật được thành tích cho bạn bè',error);}
 }
 window.vqcFriendsScheduleStatsSync=()=>{
  if(!activeStudent())return;
  clearTimeout(statsTimer);
  statsTimer=setTimeout(publishProfile,900);
 };
 function setTab(tab){
  document.querySelectorAll('[data-friends-tab]').forEach(button=>{
   const selected=button.dataset.friendsTab===tab;
   button.classList.toggle('is-active',selected);
   button.setAttribute('aria-selected',String(selected));
  });
  for(const id of ['friends','incoming','outgoing']){
   const panel=$('vqcFriendsPane'+id[0].toUpperCase()+id.slice(1));
   if(panel)panel.hidden=id!==tab;
  }
 }
 function linkButton(action,text,handler,danger=false){
  const button=build('button','vqc-friend-action'+(danger?' is-danger':''),text);
  button.type='button';button.dataset.action=action;
  button.addEventListener('click',handler);
  return button;
 }
 async function perform(action,done){
  if(busy)return;
  setBusy(true);
  try{await action();note(done||'Đã cập nhật.');}
  catch(error){note(errorText(error),true);}
  finally{setBusy(false);}
 }
 function avatarImg(id){
  const img=build('img','vqc-friend-avatar');
  img.src=AVATAR_PATHS[id]||AVATAR_PATHS.explorer;
  img.alt='Nhân vật đại diện';
  img.width=56;img.height=56;img.loading='lazy';
  return img;
 }
 async function loadFriendProfiles(){
  if(!activeStudent())return;
  const accepted=friendDocs.filter(x=>x.data.status==='accepted').slice(0,MAX_FRIENDS);
  const cache=new Map();
  await Promise.all(accepted.map(async record=>{
   const other=record.data.members.find(uid=>uid!==currentUid);
   try{
    const snap=await db.collection('friendPublicProfiles').doc(other).get();
    if(snap.exists)cache.set(other,snap.data());
   }catch(error){console.warn('Không đọc được thành tích bạn bè',error);}
  }));
  if(!activeStudent())return;
  for(const record of accepted){
   const slot=$('vqcFriendPublic_'+record.id);
   if(!slot)continue;
   const other=record.data.members.find(uid=>uid!==currentUid);
   const data=cache.get(other);
   const title=document.getElementById('vqcFriendName_'+record.id);
   if(title)title.textContent=data?.sharedName||nick(other);
   slot.replaceChildren();
   if(!data){slot.textContent='Bạn này chưa chia sẻ thành tích.';continue;}
   const avatar=AVATARS.includes(data.avatar)?data.avatar:'explorer';
   const img=avatarImg(avatar);
   slot.append(img,build('span','vqc-friend-stats',
    '⭐ '+Math.min(186,Math.max(0,Number(data.stars)||0))+' sao · 🏝️ '+
    Math.min(5,Math.max(0,Number(data.regions)||0))+' vùng · 🏅 '+
    Math.min(5,Math.max(0,Number(data.badges)||0))+' huy hiệu'));
  }
 }
 function render(){
  const user=currentUid;
  const friends=friendDocs.filter(record=>record.data.status==='accepted');
  const incoming=friendDocs.filter(record=>record.data.status==='pending'&&record.data.recipientId===user);
  const outgoing=friendDocs.filter(record=>record.data.status==='pending'&&record.data.requesterId===user);
  if($('vqcFriendsCount'))$('vqcFriendsCount').textContent=String(friends.length);
  if($('vqcFriendsIncomingCount'))$('vqcFriendsIncomingCount').textContent=String(incoming.length);
  if($('vqcFriendsOutgoingCount'))$('vqcFriendsOutgoingCount').textContent=String(outgoing.length);
  const indicator=$('vqcFriendsUnread');
  if(indicator){indicator.hidden=!incoming.length;indicator.textContent=incoming.length>9?'9+':String(incoming.length);}
  const buildEntries=(target,list,category)=>{
   const root=$(target);if(!root)return;
   root.replaceChildren();
   if(!list.length){
    root.append(build('p','vqc-friends-empty',category==='friends'?'Chưa có bạn bè. Hãy chia sẻ mã Kỳ Thủ để kết bạn!':
     category==='incoming'?'Chưa có lời mời nào.':'Chưa gửi lời mời nào.'));
    return;
   }
   list.forEach(record=>{
    const item=build('article','vqc-friend-item');
    const other=record.data.members.find(id=>id!==currentUid);
    const heading=build('div','vqc-friend-item__heading');
    heading.append(build('span','vqc-friend-item__symbol',category==='friends'?'👥':'✉️'),
     build('strong','vqc-friend-item__name',nick(other)));
    heading.querySelector('strong').id='vqcFriendName_'+record.id;
    const subtitle=build('p','vqc-friend-item__subtitle',
      category==='friends'?'Bạn bè đã xác nhận':category==='incoming'?'Muốn kết bạn với em':'Đang chờ bạn xác nhận');
    const actions=build('div','vqc-friend-item__actions');
    const ref=db.collection('friendships').doc(record.id);
    if(category==='incoming'){
     actions.append(
      linkButton('accept','✓ Đồng ý',()=>perform(()=>ref.update({status:'accepted',updatedAt:timeStamp()}),'Đã kết bạn!')),
      linkButton('decline','Từ chối',()=>perform(()=>ref.update({status:'declined',updatedAt:timeStamp()}),'Đã từ chối lời mời.')),
      linkButton('block','Chặn',()=>{
       if(!window.confirm('Chặn lời mời này? Người này sẽ không thể gửi lại lời mời cho em.'))return;
       perform(()=>ref.update({status:'blocked',updatedAt:timeStamp()}),'Đã chặn lời mời.');
      },true)
     );
    }else if(category==='outgoing'){
     actions.append(linkButton('cancel','Hủy lời mời',()=>perform(()=>ref.delete(),'Đã hủy lời mời.'),true));
    }else{
     actions.append(linkButton('remove','Hủy kết bạn',()=>{
      if(!window.confirm('Em muốn hủy kết bạn với '+nick(other)+'?'))return;
      perform(()=>ref.delete(),'Đã hủy kết bạn.');
     },true));
    }
    item.append(heading,subtitle);
    if(category==='friends'){
     const stats=build('div','vqc-friend-public');
     stats.id='vqcFriendPublic_'+record.id;
     stats.textContent='Đang tải thành tích...';
     item.append(stats);
    }
    item.append(actions);
    root.append(item);
   });
  };
  buildEntries('vqcFriendsList',friends,'friends');
  buildEntries('vqcFriendsIncomingList',incoming,'incoming');
  buildEntries('vqcFriendsOutgoingList',outgoing,'outgoing');
  if(!$('vqcFriendsModal')?.hidden)loadFriendProfiles();
 }
 async function connectProfile(){
  const profile=currentProfile(),user=profile?.uid;
  if(!user||profile.role!=='student'||!backend()){
   stopListening();
   return;
  }
  if(user===currentUid)return;
  stopListening();currentUid=user;
  showName=localStorage.getItem('vqcFriendNameShare_'+user)==='yes';
  friendView=localStorage.getItem('vqcFriendView_'+user)||'cards';
  if($('vqcFriendsShareName'))$('vqcFriendsShareName').checked=showName;
  if($('vqcFriendsView'))$('vqcFriendsView').value=friendView;
  document.getElementById('vqcFriendsModal')?.classList.toggle('vqc-friends-compact',friendView==='compact');
  note('Đang kết nối bạn bè...');
  let codeError=null;
  try{await ensureFriendCode();}
  catch(error){codeError=error;note('Không thể đọc/tạo mã Kỳ Thủ: '+errorText(error),true);}
  if(currentUid!==user)return;
  unsub=db.collection('friendships')
   .where('members','array-contains',user).limit(120)
   .onSnapshot(snapshot=>{
     if(currentUid!==user)return;
     friendDocs=snapshot.docs.map(doc=>({id:doc.id,data:doc.data()}))
      .filter(record=>Array.isArray(record.data.members)&&record.data.members.includes(user)&&
       ['pending','accepted'].includes(record.data.status));
     render();
     if(codeError)note('Danh sách đọc được, nhưng mã Kỳ Thủ bị từ chối: '+errorText(codeError),true);
     else note('Bạn bè đã được cập nhật.');
   },error=>note('Không đọc được danh sách friendships: '+errorText(error),true));
  window.vqcFriendsScheduleStatsSync();
 }
 async function findFriend(){
  const value=$('vqcFriendsCodeInput')?.value.trim().toUpperCase().replace(/[ -]/g,'');
  const result=$('vqcFriendsFound'),nameEl=$('vqcFriendsFoundName');
  const version=++lookupVersion;
  foundFriend=null;
  if(result)result.hidden=true;
  if(!activeStudent())return note('Cần đăng nhập bằng tài khoản học sinh.',true);
  if(!/^KT[A-HJ-NP-Z2-9]{10}$/.test(value))return note('Mã Kỳ Thủ chưa đúng định dạng.',true);
  if(value===ownCode)return note('Đây là mã của em.',true);
  try{
   const snap=await db.collection('friendDirectory').doc(value).get();
   if(version!==lookupVersion||$('vqcFriendsCodeInput')?.value.trim().toUpperCase().replace(/[ -]/g,'')!==value)return;
   if(!snap.exists||!snap.data().ownerId)return note('Không tìm thấy mã Kỳ Thủ.',true);
   foundFriend={code:value,uid:snap.data().ownerId};
   if(nameEl)nameEl.textContent=snap.data().sharedName||('Kỳ thủ '+value.slice(0,4)+'••••'+value.slice(-2));
   if(result)result.hidden=false;
   note('Đã tìm thấy tài khoản. Em có thể gửi lời mời kết bạn.');
  }catch(error){note(errorText(error),true);}
 }
 async function sendInvite(){
  if(!activeStudent())return note('Cần đăng nhập bằng tài khoản học sinh.',true);
  const value=$('vqcFriendsCodeInput').value.trim().toUpperCase().replace(/[ -]/g,'');
  if(!/^KT[A-HJ-NP-Z2-9]{10}$/.test(value))return note('Mã không hợp lệ. Hãy nhập đủ 12 ký tự của mã Kỳ Thủ.',true);
  if(value===ownCode)return note('Em không thể tự kết bạn với mình.',true);
  if(!foundFriend||foundFriend.code!==value)return note('Hãy nhấn Tìm bạn trước khi gửi lời mời.',true);
  const friends=friendDocs.filter(x=>x.data.status==='accepted').length;
  const pending=friendDocs.filter(x=>x.data.status==='pending'&&x.data.requesterId===currentUid).length;
  if(friends>=MAX_FRIENDS)return note('Danh sách đã đủ 50 bạn bè.',true);
  if(pending>=MAX_PENDING)return note('Em đã gửi 20 lời mời chưa được trả lời. Hãy chờ bạn xác nhận.',true);
  await perform(async()=>{
   const found=await db.collection('friendDirectory').doc(value).get();
   if(!found.exists)throw Error('Không tìm thấy mã Kỳ Thủ. Hãy kiểm tra lại.');
   const recipientId=found.data().ownerId;
   if(recipientId!==foundFriend?.uid)throw Error('Mã bạn bè đã thay đổi. Hãy tìm lại.');
   if(!recipientId||recipientId===currentUid)throw Error('Không thể gửi lời mời đến mã này.');
   const myId=currentUid;
   const ref=db.collection('friendships').doc(ownPair(myId,recipientId));
   // Firestore denies get() on a missing friendship under member-only read rules.
   // Write as a create instead; existing relationships cannot be overwritten because
   // security rules allow no requester-side update.
   try{
    await ref.set({
     members:[myId,recipientId].sort(),
     requesterId:myId,recipientId,status:'pending',
     createdAt:timeStamp(),updatedAt:timeStamp()
    });
   }catch(error){
    if(error?.code==='permission-denied'){
     throw Error('Không tạo được lời mời. Có thể lời mời đã tồn tại, đã bị từ chối/chặn, hoặc Firebase chưa cho phép tạo friendships.');
    }
    throw error;
   }
   $('vqcFriendsCodeInput').value='';foundFriend=null;
   if($('vqcFriendsFound'))$('vqcFriendsFound').hidden=true;
  },'Đã gửi lời mời. Bạn kia cần đồng ý trước khi kết bạn.');
 }
// Step-by-step permission check against live Firebase; no passwords or UIDs are displayed.
async function diagnoseFirebasePermissions(){
 const trigger=$('vqcFriendsDiagnose'),list=$('vqcFriendsDiagnostics');
 if(!trigger||!list)return;
 trigger.disabled=true;
 list.hidden=false;
 list.replaceChildren();
 const add=(label,ok,detail='')=>{
  const item=document.createElement('li');
  item.className=ok?'is-ok':'is-failed';
  item.textContent=(ok?'✓ ':'✗ ')+label+(detail?' — '+detail:'');
  list.appendChild(item);
 };
 try{
  if(!backend()||!currentProfile()){
   add('Đăng nhập',false,'Cần đăng nhập bằng tài khoản học sinh.');
   return;
  }
  const uid=auth.currentUser.uid;
  if(currentProfile().uid!==uid||currentProfile().role!=='student'){
   add('Tài khoản học sinh',false,'Hồ sơ đăng nhập không khớp với tài khoản học sinh.');
   return;
  }
  add('Đăng nhập Firebase Authentication',true);
  try{
   const user=await db.collection('users').doc(uid).get();
   if(!user.exists||user.data()?.active!==true||user.data()?.role!=='student'){
    add('Quyền tài khoản học sinh',false,
     'Firestore users cần có active=true và role=student. Hãy nhờ giáo viên kiểm tra hồ sơ tài khoản.');
    return;
   }
   add('Tài khoản có active=true, role=student',true);
  }catch(error){
   add('Quyền đọc hồ sơ users',false,errorText(error));
   return;
  }
  try{
   await db.collection('friendSettings').doc(uid).get();
   add('Quyền đọc mã trong friendSettings',true);
  }catch(error){
   add('Quyền đọc friendSettings',false,errorText(error));
   return;
  }
  try{
   await ensureFriendCode();
   add('Quyền tạo/đọc mã Kỳ Thủ',true);
  }catch(error){
   add('Quyền tạo mã trong friendSettings + friendDirectory',false,errorText(error));
   return;
  }
  try{
   await db.collection('friendships').where('members','array-contains',uid).limit(120).get();
   add('Quyền truy vấn danh sách friendships',true);
  }catch(error){
   add('Quyền truy vấn friendships',false,errorText(error));
   return;
  }
  try{
   await db.collection('friendPublicProfiles').doc(uid).get();
   add('Quyền đọc thành tích của chính mình',true);
  }catch(error){
   add('Quyền đọc friendPublicProfiles',false,errorText(error));
   return;
  }
  add('Hoàn tất',true,'Các quyền đọc chính đã hoạt động. Bạn có thể gửi lời mời và thử lại.');
  stopListening();
  await connectProfile();
 }finally{trigger.disabled=false;}
}

 function closeModal(){
  const modal=$('vqcFriendsModal');
  if(!modal||modal.hidden)return;
  modal.hidden=true;
  document.body.classList.remove('vqc-friends-open');
  if(modalFocus?.isConnected)modalFocus.focus();
  modalFocus=null;
 }
 async function openModal(){
  if(!currentProfile()){showAccountPanel();return;}
  if(currentProfile().role!=='student'){
   if(typeof vqcNotify==='function')vqcNotify('Tính năng kết bạn dành cho tài khoản học sinh.','warning');
   return;
  }
  modalFocus=document.activeElement;
  const modal=$('vqcFriendsModal');if(!modal)return;
  modal.hidden=false;document.body.classList.add('vqc-friends-open');
  setTab('friends');
  $('vqcFriendsClose')?.focus();
  if(!currentUid)connectProfile();
  else{render();loadFriendProfiles();}
 }
 function initialize(){
  $('vqcFriendsOpen')?.addEventListener('click',openModal);
  $('vqcFriendsClose')?.addEventListener('click',closeModal);
  $('vqcFriendsDone')?.addEventListener('click',closeModal);
  $('vqcFriendsCopyCode')?.addEventListener('click',()=>{
   if(!ownCode)return note('Chưa có mã để sao chép.',true);
   const text=ownCode;
   if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(text).then(()=>note('Đã sao chép mã. Hãy chia sẻ trực tiếp với bạn em.'))
     .catch(()=>note('Mã của em: '+text));
   }else note('Mã của em: '+text);
  });
  $('vqcFriendsSend')?.addEventListener('click',sendInvite);
  $('vqcFriendsFind')?.addEventListener('click',findFriend);
  $('vqcFriendsCodeInput')?.addEventListener('input',()=>{foundFriend=null;lookupVersion++;if($('vqcFriendsFound'))$('vqcFriendsFound').hidden=true;});
  $('vqcFriendsDiagnose')?.addEventListener('click',diagnoseFirebasePermissions);
  $('vqcFriendsSettingsToggle')?.addEventListener('click',()=>{
   const panel=$('vqcFriendsSettings');
   if(panel)panel.hidden=!panel.hidden;
  });
  $('vqcFriendsShareName')?.addEventListener('change',async event=>{
   if(!activeStudent())return;
   showName=event.target.checked;
   localStorage.setItem('vqcFriendNameShare_'+currentUid,showName?'yes':'no');
   profileSignature='';
   await publishProfile();
   note(showName?'Đã bật chia sẻ họ tên với bạn bè.':'Đã tắt chia sẻ họ tên với bạn bè.');
  });
  $('vqcFriendsView')?.addEventListener('change',event=>{
   friendView=event.target.value;
   localStorage.setItem('vqcFriendView_'+currentUid,friendView);
   $('vqcFriendsModal')?.classList.toggle('vqc-friends-compact',friendView==='compact');
  });
  $('vqcFriendsCodeInput')?.addEventListener('keydown',event=>{
   if(event.key==='Enter'){event.preventDefault();sendInvite();}
  });
  document.querySelectorAll('[data-friends-tab]').forEach(btn=>
   btn.addEventListener('click',()=>setTab(btn.dataset.friendsTab))
  );
  const modal=$('vqcFriendsModal');
  modal?.addEventListener('click',event=>{if(event.target===modal)closeModal();});
  modal?.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();closeModal();return;}
   if(event.key!=='Tab')return;
   const buttons=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled])')]
    .filter(item=>item.getClientRects().length>0);
   if(!buttons.length)return;
   const first=buttons[0],last=buttons[buttons.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  window.addEventListener('vqc:account-change',()=>connectProfile());
  if(activeStudent())connectProfile();
 }
 window.vqcFriendsRefresh=connectProfile;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
 else initialize();
})();
