/* Online Pawn and Knight games for confirmed friends, Firestore realtime. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const pair=(a,b)=>[a,b].sort().join('_');
const uid=()=>typeof auth!=='undefined'&&auth.currentUser?.uid||'';
const stamp=()=>firebase.firestore.FieldValue.serverTimestamp();
const bridge=()=>window.vqcArcadeOnlineBridge;
const label=i=>i===0?'♟️ Trò chơi Tốt':'♞ Mã chống Tốt';
let lobbyUnsub=null,inviteUnsubs=[],matchUnsub=null,matchRef=null,matchSnapshot=null,friendList=[],kind=0,other='',token=0,pending=false;
let inboxUnsub=null,inboxDocs=new Map(),incoming=new Map(),seen=new Set(),inboxUid='',inboxGeneration=0;
const friendNames=new Map();
const key=(u,v,k)=>pair(u,v)+'_'+k;
function status(msg){if($('vqcOnlineStatus'))$('vqcOnlineStatus').textContent=msg;}
function initial(k){
 const pos={};if(k===0){for(const f of 'abcdefgh'){pos[f+'2']='P';pos[f+'7']='p';}}
 else{pos.e1='N';for(const f of 'def')pos[f+'7']='p';}
 return {pos,turn:'w',enPassant:'',ended:'',last:'',moves:0};
}
function stopLobby(){
 if(lobbyUnsub){lobbyUnsub();lobbyUnsub=null;}
 inviteUnsubs.forEach(fn=>fn());inviteUnsubs=[];
}
function hideLobby(){stopLobby();$('vqcOnlineLobby').hidden=true;}
function leave(){
 token++;if(matchUnsub){matchUnsub();matchUnsub=null;}
 matchRef=null;matchSnapshot=null;other='';
}
function alertError(e){return e?.code==='permission-denied'?'Firebase chưa cấp quyền chơi trực tuyến. Hãy xuất bản firestore.rules mới.':String(e?.message||e);}
function makeButton(text,fn,css=''){
 const b=document.createElement('button');b.type='button';b.textContent=text;b.className=css;b.addEventListener('click',fn);return b;
}
async function sendInvite(otherId){
 if(pending)return;
 pending=true;status('⏳ Đang gửi lời mời...');
 try{
  const mine=uid(),id=key(mine,otherId,kind);
  const ref=db.collection('arcadeInvites').doc(id);
  const old=await ref.get();
  const payload={members:[mine,otherId].sort(),from:mine,game:kind,status:'pending',at:stamp()};
  if(old.exists&&old.data()?.status==='pending'&&old.data()?.from!==mine)throw Error('Bạn đã có lời mời từ người này. Hãy nhận lời hoặc từ chối trước.');
  if(old.exists)await ref.update(payload);else await ref.set(payload);
  status('Đã gửi lời mời '+label(kind)+'. Chờ bạn đồng ý.');
 }catch(e){status('⚠️ '+alertError(e));}finally{pending=false;}
}
async function respond(otherId,accept,gameKind=kind){
 if(pending)return;pending=true;
 const mine=uid(),id=key(mine,otherId,gameKind);
 try{
  const ref=db.collection('arcadeInvites').doc(id);
  await db.runTransaction(async tx=>{
   const snap=await tx.get(ref),data=snap.data();
   if(!data||data.status!=='pending'||data.from===mine)throw Error('Lời mời đã hết hiệu lực.');
   tx.update(ref,{status:accept?'accepted':'declined',respondedAt:stamp()});
  });
  status(accept?'Đã nhận lời. Đang vào bàn đấu…':'Đã từ chối lời mời.');
  if(accept)await enterMatch(otherId,gameKind);
 }catch(e){status('⚠️ '+alertError(e));throw e;}finally{pending=false;}
}
async function enterMatch(otherId,k){
 const mine=uid();if(!mine||!otherId)return;
 const id=key(mine,otherId,k),invRef=db.collection('arcadeInvites').doc(id),ref=db.collection('arcadeMatches').doc(id);
 const invite=await invRef.get(),inv=invite.data();
 if(!inv||inv.status!=='accepted'||inv.game!==k)throw Error('Hai bạn phải đồng ý lời mời trước.');
 const white=inv.from,black=inv.members.find(u=>u!==white);
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref),d=snap.data();
  if(d&&d.inviteAt?.isEqual?.(inv.at))return;
  tx.set(ref,{members:inv.members,game:k,inviteAt:inv.at,white,black,...initial(k),updatedAt:stamp()});
 });
 hideLobby();leave();other=otherId;matchRef=ref;
 const myToken=token;
 let firstSnapshot=true;
 matchUnsub=ref.onSnapshot(snap=>{
  if(myToken!==token)return;
  if(!snap.exists){bridge()?.showError('Đang chờ bàn đấu được tạo.');return;}
  const d=snap.data();matchSnapshot=d;
  const color=d.white===uid()?'w':'b';
  if(firstSnapshot||!bridge()?.isOnline()){firstSnapshot=false;bridge()?.openMatch(k,color,d);}
  else bridge()?.applyOnline(d);
 },e=>bridge()?.showError('⚠️ '+alertError(e)));
}
async function submit(before,after,from,to){
 if(!matchRef||!matchSnapshot)throw Error('Chưa kết nối bàn đấu.');
 const mine=uid(),ref=matchRef,snapshot=matchSnapshot;
 if((snapshot.turn==='w'?snapshot.white:snapshot.black)!==mine)throw Error('Chưa đến lượt của bạn.');
 if(JSON.stringify(before.pos)!==JSON.stringify(snapshot.pos)||before.moves!==snapshot.moves||before.turn!==snapshot.turn)throw Error('Bàn cờ đã thay đổi, vui lòng thử lại.');
 await db.runTransaction(async tx=>{
  const live=await tx.get(ref),d=live.data();
  if(!d||d.moves!==snapshot.moves||d.turn!==snapshot.turn||JSON.stringify(d.pos)!==JSON.stringify(snapshot.pos))throw Error('Đối thủ vừa đi cờ, đang đồng bộ lại.');
  tx.update(ref,{pos:after.pos,turn:after.turn,enPassant:after.enPassant,ended:after.ended,last:after.last,moves:after.moves,updatedAt:stamp()});
 });
}
function renderFriends(){
 const root=$('vqcOnlineFriends');if(!root)return;root.replaceChildren();
 if(!friendList.length){root.textContent='Chưa có bạn bè. Hãy kết bạn trước khi đấu trực tuyến.';return;}
 for(const entry of friendList){
  const peer=entry.members.find(x=>x!==uid());if(!peer)continue;
  const div=document.createElement('div');div.className='vqc-online-friend';
  const name=document.createElement('strong');name.textContent='Kỳ thủ '+peer.slice(-4).toUpperCase();
  db.collection('friendPublicProfiles').doc(peer).get().then(s=>{if(s.exists&&s.data()?.sharedName&&div.isConnected)name.textContent=String(s.data().sharedName).slice(0,100);}).catch(()=>{});
  const info=document.createElement('span');info.textContent='Đang kiểm tra lời mời…';
  const actions=document.createElement('div');actions.className='vqc-online-actions';
  div.append(name,info,actions);root.appendChild(div);
  const ref=db.collection('arcadeInvites').doc(key(uid(),peer,kind));
  const unsub=ref.onSnapshot(s=>{
   if(!div.isConnected)return;
   const inv=s.data();actions.replaceChildren();
   if(inv?.status==='pending'&&inv.from!==uid()){
    info.textContent='⚔️ Bạn đang được mời chơi '+label(kind);
    actions.append(makeButton('✓ Nhận lời',()=>respond(peer,true),'accept'),makeButton('Từ chối',()=>respond(peer,false)));
   }else if(inv?.status==='pending'){
    info.textContent='⏳ Đang chờ bạn nhận lời';
   }else if(inv?.status==='accepted'){
    info.textContent='♟️ Lời mời đã được chấp nhận';
    actions.append(makeButton('Vào bàn đấu',()=>enterMatch(peer,kind).catch(e=>status('⚠️ '+alertError(e))),'accept'),makeButton('Thách đấu lại',()=>sendInvite(peer)));
   }else{
    info.textContent='Sẵn sàng thi đấu';
    actions.append(makeButton('⚔️ Mời thi đấu',()=>sendInvite(peer),'accept'));
   }
  },e=>{info.textContent='⚠️ '+alertError(e);});
  inviteUnsubs.push(unsub);
 }
}
function lobby(k){
 const mine=uid();
 if(!mine||!['student','teacher'].includes(window.accountProfile?.role)){status('Vui lòng đăng nhập tài khoản trước khi đấu trực tuyến.');$('vqcOnlineLobby').hidden=false;return;}
 if(typeof roomRef!=='undefined'&&roomRef){if(typeof vqcNotify==='function')vqcNotify('Hãy rời lớp học trước khi đấu trực tuyến.','warning');return;}
 stopLobby();kind=k===1?1:0;
 $('vqcOnlineLobby').hidden=false;$('vqcOnlineTitle').textContent='🌐 '+label(kind)+' trực tuyến';
 status('Đang tải bạn bè…');
 lobbyUnsub=db.collection('friendships').where('members','array-contains',mine).limit(120).onSnapshot(snapshot=>{
  if($('vqcOnlineLobby').hidden)return;
  stopInviteListeners();
  friendList=snapshot.docs.map(s=>s.data()).filter(d=>d.status==='accepted'&&d.members?.includes(mine));
  status('Chọn bạn bè để gửi lời mời hoặc nhận lời.');
  renderFriends();
 },e=>status('⚠️ '+alertError(e)));
}
function stopInviteListeners(){inviteUnsubs.forEach(fn=>fn());inviteUnsubs=[];}

// Keep the invitation inbox available on every page, not just inside a game.
function updateInbox(){
 const bell=$('vqcInviteBell'),badge=$('vqcInviteCount'),list=$('vqcInviteList');
 if(!bell||!badge||!list)return;
 const items=[...incoming.values()].sort((a,b)=>(b.data.at?.toMillis?.()||0)-(a.data.at?.toMillis?.()||0));
 bell.hidden=!inboxUid;badge.textContent=String(items.length);badge.hidden=!items.length;
 bell.setAttribute('aria-label','Lời mời thi đấu: '+items.length+' lời mời');
 list.replaceChildren();
 if(!items.length){const p=document.createElement('p');p.textContent='Chưa có lời mời mới.';list.appendChild(p);}
 for(const item of items){
  const card=document.createElement('div');card.className='vqc-invite-item';
  const text=document.createElement('p');
  text.textContent=(friendNames.get(item.peer)||'Kỳ thủ '+item.peer.slice(-4).toUpperCase())+' mời bạn chơi '+label(item.game)+'.';
  const buttons=document.createElement('div');buttons.className='vqc-invite-actions';
  buttons.append(makeButton('✓ Nhận lời',()=>acceptFromInbox(item,true),'accept'),makeButton('Từ chối',()=>acceptFromInbox(item,false)));
  card.append(text,buttons);list.appendChild(card);
 }
}
async function acceptFromInbox(item,accept){
 if(!inboxUid||!incoming.has(item.id))return;
 if(accept&&typeof roomRef!=='undefined'&&roomRef){
  status('Hãy rời lớp học trước khi vào bàn đấu.');
  if(typeof vqcNotify==='function')vqcNotify('Hãy rời lớp học trước khi nhận lời thách đấu.','warning');
  return;
 }
 if(accept&&bridge()?.isOnline()&&!confirm('Bạn đang ở một bàn đấu khác. Chuyển sang ván được mời?'))return;
 const notice=$('vqcInviteToast');
 if(notice)notice.hidden=true;
 const feedback=$('vqcInviteFeedback');feedback.textContent='Đang '+(accept?'nhận':'từ chối')+' lời mời…';
 try{
  await respond(item.peer,accept,item.game);
  feedback.textContent=accept?'Đã nhận lời. Đang mở bàn đấu.':'Đã từ chối lời mời.';
  if(accept)$('vqcInvitePanel').hidden=true;
 }catch(e){feedback.textContent='⚠️ '+alertError(e);$('vqcInvitePanel').hidden=false;}
}
function onIncoming(id,peer,game,snap){
 if(!inboxUid)return;
 const d=snap.data();
 if(d?.status==='pending'&&d.from===peer&&d.game===game&&Array.isArray(d.members)&&d.members.includes(inboxUid)){
  incoming.set(id,{id,peer,game,data:d});
  const fingerprint=id+':'+(d.at?.toMillis?.()||d.at?.seconds||'pending');
  if(!seen.has(fingerprint)){
   seen.add(fingerprint);
   const toast=$('vqcInviteToast');if(toast){
    $('vqcInviteToastText').textContent=(friendNames.get(peer)||'Một người bạn')+' mời bạn chơi '+label(game)+'.';
    toast.hidden=false;
    $('vqcInviteToastAccept').dataset.inviteId=id;
    $('vqcInviteToastAccept').onclick=()=>acceptFromInbox({id,peer,game},true);
    $('vqcInviteToastDecline').onclick=()=>acceptFromInbox({id,peer,game},false);
   }
  }
 }else{
  incoming.delete(id);
  const toast=$('vqcInviteToast');
  if(toast&&!toast.hidden&&$('vqcInviteToastAccept')?.dataset.inviteId===id)toast.hidden=true;
 }
 updateInbox();
}
function stopInbox(){
 inboxGeneration++;
 if(inboxUnsub){inboxUnsub();inboxUnsub=null;}
 for(const unsub of inboxDocs.values())unsub();
 inboxDocs.clear();incoming.clear();friendNames.clear();seen.clear();inboxUid='';
 if($('vqcInvitePanel'))$('vqcInvitePanel').hidden=true;
 if($('vqcInviteToast'))$('vqcInviteToast').hidden=true;
 updateInbox();
}
function startInbox(user){
 if(!user||inboxUid===user)return;
 stopInbox();inboxUid=user;updateInbox();
 const generation=++inboxGeneration;
 inboxUnsub=db.collection('friendships').where('members','array-contains',user).limit(120).onSnapshot(snapshot=>{
  if(generation!==inboxGeneration)return;
  const desired=new Map();
  snapshot.docs.forEach(doc=>{
   const d=doc.data();if(d.status!=='accepted'||!Array.isArray(d.members))return;
   const peer=d.members.find(id=>id!==user);if(!peer)return;
   for(const game of [0,1])desired.set(key(user,peer,game),{peer,game});
   if(!friendNames.has(peer)){
    friendNames.set(peer,'Kỳ thủ '+peer.slice(-4).toUpperCase());
    db.collection('friendPublicProfiles').doc(peer).get().then(p=>{
     if(generation!==inboxGeneration)return;
     if(p.exists&&p.data()?.sharedName){friendNames.set(peer,String(p.data().sharedName).slice(0,100));updateInbox();}
    }).catch(()=>{});
   }
  });
  for(const [id,unsubscribe] of inboxDocs){
   if(desired.has(id))continue;
   unsubscribe();inboxDocs.delete(id);incoming.delete(id);
  }
  for(const [id,{peer,game}] of desired){
   if(inboxDocs.has(id))continue;
   const unsubscribe=db.collection('arcadeInvites').doc(id).onSnapshot(s=>{
    if(generation===inboxGeneration)onIncoming(id,peer,game,s);
   },e=>{
    if(generation===inboxGeneration)console.warn('Không thể nhận thông báo lời mời:',e);
   });
   inboxDocs.set(id,unsubscribe);
  }
  updateInbox();
 },e=>console.warn('Không thể theo dõi bạn bè để nhận lời mời:',e));
}
function initInbox(){
 const wrap=document.createElement('div');wrap.id='vqcInviteRoot';
 wrap.innerHTML='<button type="button" id="vqcInviteBell" class="vqc-invite-bell" hidden aria-label="Lời mời thi đấu">🔔 <span id="vqcInviteCount" hidden>0</span></button><section id="vqcInvitePanel" class="vqc-invite-panel" hidden aria-label="Thông báo lời mời"><div class="vqc-invite-header"><strong>🔔 Lời mời thi đấu</strong><button type="button" id="vqcInviteClose">✕</button></div><div id="vqcInviteList"></div><p id="vqcInviteFeedback" aria-live="polite"></p></section><section id="vqcInviteToast" class="vqc-invite-toast" role="status" hidden><p id="vqcInviteToastText"></p><div class="vqc-invite-actions"><button type="button" id="vqcInviteToastAccept" class="accept">✓ Nhận lời</button><button type="button" id="vqcInviteToastDecline">Từ chối</button><button type="button" id="vqcInviteToastLater">Để sau</button></div></section>';
 document.body.appendChild(wrap);
 $('vqcInviteBell').addEventListener('click',()=>{$('vqcInvitePanel').hidden=!$('vqcInvitePanel').hidden;$('vqcInviteToast').hidden=true;});
 $('vqcInviteClose').addEventListener('click',()=>{$('vqcInvitePanel').hidden=true;});
 $('vqcInviteToastLater').addEventListener('click',()=>{$('vqcInviteToast').hidden=true;});
 if(typeof auth!=='undefined'&&auth.onAuthStateChanged)auth.onAuthStateChanged(user=>user?startInbox(user.uid):stopInbox());
 window.addEventListener('vqc:account-change',()=>{const user=uid();if(user)startInbox(user);else stopInbox();});
}

function init(){
 const el=document.createElement('div');el.id='vqcOnlineLobby';el.className='vqc-online-overlay';el.hidden=true;
 el.innerHTML='<section class="vqc-online-dialog" role="dialog" aria-modal="true" aria-labelledby="vqcOnlineTitle"><div class="vqc-arcade-head"><h2 id="vqcOnlineTitle">🌐 Đấu trực tuyến</h2><button type="button" id="vqcOnlineClose">✕ Đóng</button></div><p>Hai bạn cần kết bạn và đăng nhập trên thiết bị riêng. Người gửi lời mời cầm Trắng; người nhận cầm Đen.</p><p id="vqcOnlineStatus" aria-live="polite"></p><div id="vqcOnlineFriends"></div><small>Bạn có thể đóng cửa sổ rồi quay lại để tiếp tục ván đấu.</small></section>';
 document.body.appendChild(el);
 $('vqcOnlineClose').addEventListener('click',hideLobby);
 el.addEventListener('click',e=>{if(e.target===el)hideLobby();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.hidden)hideLobby();});
 window.addEventListener('vqc:account-change',()=>{hideLobby();leave();});
 initInbox();
}
window.vqcArcadeOnline={lobby,submit,leave};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
