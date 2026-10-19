/* Friend challenge lobby in island exploration. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const pair=(a,b)=>[a,b].sort().join('_');
let unsub=null,uid='',records=[],nameCache=new Map(),generation=0,busy=false;
const stamp=()=>firebase.firestore.FieldValue.serverTimestamp();
const own=()=>typeof auth!=='undefined'?auth.currentUser?.uid:null;
const alias=id=>'Kỳ thủ '+String(id).slice(-4).toUpperCase();
function status(s){if($('vqcChallengeStatus'))$('vqcChallengeStatus').textContent=s;}
function close(){generation++;if(unsub){unsub();unsub=null;}uid='';records=[];$('vqcChallengeLobby')?.setAttribute('hidden','');}
function button(text,fn,cls=''){
 const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.addEventListener('click',fn);return b;
}
async function action(other,kind){
 if(busy)return;
 const id=pair(uid,other),ref=db.collection('friendships').doc(id);
 busy=true;status('⏳ Đang cập nhật...');
 try{
  const record=records.find(x=>x.id===id);
  if(!record||record.data.status!=='accepted')throw Error('Hai bạn chưa kết bạn.');
  if(kind==='send'){
   await ref.update({challenge:{status:'pending',from:uid,at:stamp()},updatedAt:stamp()});
   status('Đã gửi lời thách đấu. Hãy chờ bạn đồng ý.');
  }else{
   if(record.data.challenge?.status!=='pending'||record.data.challenge.from===uid)throw Error('Lời thách đấu không còn hiệu lực.');
   await ref.update({'challenge.status':kind==='accept'?'accepted':'declined','challenge.respondedAt':stamp(),updatedAt:stamp()});
   status(kind==='accept'?'Đã nhận lời. Mở bàn đấu!':'Đã từ chối lời thách đấu.');
   if(kind==='accept'&&typeof window.vqcFriendDuelOpen==='function')window.vqcFriendDuelOpen(other);
  }
 }catch(e){status('⚠️ '+(e.code==='permission-denied'?'Firestore chưa cấp quyền thách đấu. Hãy Publish Rules.':e.message));}
 finally{busy=false;}
}
function render(){
 const root=$('vqcChallengeList');if(!root)return;root.replaceChildren();
 if(!records.length){const p=document.createElement('p');p.textContent='Chưa có bạn bè đã xác nhận. Hãy kết bạn bằng mã Kỳ Thủ trước nhé!';root.appendChild(p);return;}
 for(const rec of records){
  const other=rec.data.members.find(id=>id!==uid);if(!other)continue;
  const card=document.createElement('article');card.className='vqc-challenge-card';
  const h=document.createElement('strong');h.textContent=nameCache.get(other)||alias(other);card.appendChild(h);
  const challenge=rec.data.challenge,info=document.createElement('p');info.className='vqc-challenge-detail';
  const actions=document.createElement('div');actions.className='vqc-challenge-buttons';
  if(challenge?.status==='pending'){
   if(challenge.from===uid)info.textContent='⏳ Đang chờ bạn nhận lời';
   else{
    info.textContent='⚔️ Bạn này đang thách đấu em!';
    actions.append(button('✓ Nhận lời',()=>action(other,'accept'),'accept'),button('Từ chối',()=>action(other,'decline'),'decline'));
   }
  }else if(challenge?.status==='accepted'){
   info.textContent='♟️ Hai bạn đã đồng ý thách đấu';
   actions.append(button('♟️ Vào bàn đấu',()=>window.vqcFriendDuelOpen?.(other),'accept'));
  }else{
   info.textContent='Sẵn sàng cùng nhau chơi cờ';
   actions.append(button('⚔️ Thách đấu',()=>action(other,'send'),'accept'));
  }
  actions.append(button('💬 Trò chuyện',()=>window.vqcFriendChatOpen?.(other)));
  card.append(h,info,actions);root.appendChild(card);
 }
}
async function loadNames(list,token){
 await Promise.all(list.map(async rec=>{
  const other=rec.data.members.find(id=>id!==uid);if(!other||nameCache.has(other))return;
  try{
   const doc=await db.collection('friendPublicProfiles').doc(other).get();
   if(doc.exists&&doc.data().sharedName)nameCache.set(other,String(doc.data().sharedName).slice(0,100));
  }catch(e){console.warn('Không tải được bí danh bạn bè',e);}
 }));
 if(generation===token)render();
}
function open(){
 const user=own();
 if(!user||!['student','teacher'].includes(window.accountProfile?.role)){
  if(typeof showAccountPanel==='function')showAccountPanel();return;
 }
 if(typeof roomRef!=='undefined'&&roomRef){if(typeof vqcNotify==='function')vqcNotify('Hãy rời lớp học trước khi thách đấu bạn bè.','warning');return;}
 close();uid=user;$('vqcChallengeLobby').hidden=false;status('Đang tải danh sách bạn bè...');
 const token=++generation;
 unsub=db.collection('friendships').where('members','array-contains',uid).limit(120).onSnapshot(snapshot=>{
  if(token!==generation)return;
  records=snapshot.docs.map(d=>({id:d.id,data:d.data()})).filter(x=>x.data.status==='accepted'&&Array.isArray(x.data.members)&&x.data.members.includes(uid));
  status(records.length?'Chọn bạn để thách đấu hoặc vào bàn đấu.':'Chưa có bạn bè đã xác nhận.');
  render();loadNames(records,token);
 },e=>status('⚠️ Không đọc được danh sách bạn bè: '+e.message));
}
function init(){
 const div=document.createElement('div');div.id='vqcChallengeLobby';div.className='vqc-challenge-overlay';div.hidden=true;
 div.innerHTML='<section class="vqc-challenge-dialog" role="dialog" aria-modal="true" aria-labelledby="vqcChallengeTitle"><div class="vqc-duel-top"><h2 id="vqcChallengeTitle">⚔️ Thách đấu bạn bè</h2><button type="button" id="vqcChallengeClose">✕ Đóng</button></div><p>Chọn một người bạn đã kết bạn để thi đấu cờ vua trực tuyến. Mỗi người sử dụng tài khoản riêng.</p><p id="vqcChallengeStatus" aria-live="polite"></p><div id="vqcChallengeList"></div><button type="button" id="vqcChallengeFriends">👥 Quản lý bạn bè / Kết bạn</button></section>';
 document.body.appendChild(div);
 $('vqcChallengeClose').addEventListener('click',close);
 $('vqcChallengeFriends').addEventListener('click',()=>{close();$('vqcFriendsOpen')?.click();});
 div.addEventListener('click',e=>{if(e.target===div)close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!div.hidden)close();});
 window.addEventListener('vqc:account-change',close);
}
window.vqcFriendChallengesOpen=open;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
