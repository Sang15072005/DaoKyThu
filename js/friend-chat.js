/* Free-text private friend chat with block and report controls. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const pair=(a,b)=>[a,b].sort().join('_');
const uid=()=>typeof auth!=='undefined'&&auth.currentUser?.uid||'';
let unlisten=null,friend='',sending=false,lastSent=0,blocked=false,peerBlocked=false,viewToken=0,displayName='',clearedAt=null,latestSnapshot=null;
function status(text){const e=$('vqcFriendChatNotice');if(e)e.textContent=text;}
function close(){
 viewToken++;if(unlisten){unlisten();unlisten=null;}friend='';blocked=false;peerBlocked=false;
 $('vqcFriendChat')?.setAttribute('hidden','');
}
function setComposer(){
 const input=$('vqcFriendChatInput'),send=$('vqcFriendChatSend'),block=$('vqcFriendChatBlock');
 if(!input)return;
 input.disabled=blocked||peerBlocked;
 send.disabled=blocked||peerBlocked||sending||!input.value.trim();
 block.textContent=blocked?'✓ Bỏ chặn':'🚫 Chặn';
 if(blocked)status('Bạn đã chặn người này. Bỏ chặn để tiếp tục trò chuyện.');
 else if(peerBlocked)status('Không thể gửi tin nhắn cho người này.');
 else status('Chỉ bạn bè đã xác nhận mới được nhắn tin. Không chia sẻ thông tin cá nhân.');
}
async function refreshBlock(other,token){
 const user=uid(),self=db.collection('chatBlocks').doc(user).collection('blocked').doc(other);
 const peer=db.collection('chatBlocks').doc(other).collection('blocked').doc(user);
 const [a,b]=await Promise.all([self.get(),peer.get()]);
 if(token!==viewToken)return;
 blocked=a.exists;peerBlocked=b.exists;setComposer();
}
function showMessages(snapshot,user){
 const root=$('vqcFriendChatMessages');if(!root||!snapshot)return;
 root.replaceChildren();let visible=0;
 [...snapshot.docs].reverse().forEach(doc=>{
  const d=doc.data();if(typeof d.text!=='string'||typeof d.from!=='string')return;
  const when=d.at?.toMillis?.()||0;
  if(clearedAt&&when<=clearedAt) return;
  root.appendChild(bubble(d,doc.id,user));visible++;
 });
 if(!visible)root.textContent='Chưa có tin nhắn. Hãy gửi một lời chào!';
 root.scrollTop=root.scrollHeight;
}
async function clearHistory(){
 const user=uid(),other=friend;
 if(!user||!other||!confirm('Xóa lịch sử trò chuyện khỏi tài khoản của bạn? Bạn bè vẫn xem được các tin nhắn cũ của họ.'))return;
 const token=viewToken;
 try{
  await db.collection('chatClears').doc(user).collection('pairs').doc(pair(user,other)).set({
   owner:user,pairId:pair(user,other),clearedAt:firebase.firestore.FieldValue.serverTimestamp()
  });
  const snap=await db.collection('chatClears').doc(user).collection('pairs').doc(pair(user,other)).get();
  if(token!==viewToken)return;
  clearedAt=snap.data()?.clearedAt?.toMillis?.()||Date.now();
  showMessages(latestSnapshot,user);
  status('Đã xóa lịch sử khỏi giao diện tài khoản của bạn. Tin nhắn vẫn còn với người kia.');
 }catch(e){status('Không xóa được lịch sử: '+(e.code==='permission-denied'?'Cần xuất bản quy tắc Firestore mới.':e.message));}
}
function bubble(data,id,user){
 const row=document.createElement('div');row.className='vqc-chat-entry'+(data.from===user?' is-mine':'');
 const msg=document.createElement('p');msg.className='vqc-chat-bubble';msg.textContent=(data.from===user?'Bạn: ':'Kỳ thủ: ')+data.text;
 row.appendChild(msg);
 if(data.from!==user){
  const report=document.createElement('button');report.type='button';report.className='vqc-chat-report';report.textContent='⚑ Báo cáo';report.title='Báo cáo tin nhắn không phù hợp';
  report.addEventListener('click',()=>reportMessage(id,data.text));
  row.appendChild(report);
 }
 return row;
}
async function open(other){
 const user=uid();if(!user||!other||user===other)return;
 close();friend=other;clearedAt=null;latestSnapshot=null;const token=++viewToken;
 const modal=$('vqcFriendChat');modal.hidden=false;
 displayName='Kỳ thủ '+other.slice(-4).toUpperCase();
 $('vqcFriendChatHeading').textContent='💬 Trò chuyện với '+displayName;
 $('vqcFriendChatMessages').textContent='Đang tải tin nhắn...';
 $('vqcFriendChatInput').value='';status('Đang kiểm tra kết nối...');setComposer();
 try{
  const id=pair(user,other),friendship=await db.collection('friendships').doc(id).get();
  if(token!==viewToken)return;
  if(friendship.data()?.status!=='accepted')throw Error('Chỉ có thể trò chuyện với bạn bè đã xác nhận.');
  db.collection('friendPublicProfiles').doc(other).get().then(s=>{
   if(token===viewToken&&s.exists&&s.data()?.sharedName){
    displayName=String(s.data().sharedName).slice(0,100);
    $('vqcFriendChatHeading').textContent='💬 Trò chuyện với '+displayName;
   }
  }).catch(()=>{});
  const clearDoc=await db.collection('chatClears').doc(user).collection('pairs').doc(id).get();
  if(token!==viewToken)return;
  clearedAt=clearDoc.data()?.clearedAt?.toMillis?.()||null;
  await refreshBlock(other,token);
  if(token!==viewToken)return;
  unlisten=db.collection('friendChats').doc(id).collection('messages').orderBy('at','desc').limit(60).onSnapshot(snapshot=>{
   if(token!==viewToken)return;
   latestSnapshot=snapshot;showMessages(snapshot,user);
  },e=>status('Không tải được tin nhắn: '+e.message));
 }catch(e){if(token===viewToken)status('⚠️ '+e.message);}
}
async function send(){
 const user=uid(),other=friend,input=$('vqcFriendChatInput'),text=input?.value.trim();
 if(sending||!user||!other||blocked||peerBlocked||!text)return;
 if(text.length>500){status('Tin nhắn tối đa 500 ký tự.');return;}
 if(Date.now()-lastSent<2000){status('Hãy chờ 2 giây giữa các tin nhắn.');return;}
 sending=true;setComposer();
 try{
  const id=pair(user,other),f=await db.collection('friendships').doc(id).get();
  if(f.data()?.status!=='accepted')throw Error('Không còn là bạn bè.');
  await db.collection('friendChats').doc(id).collection('messages').add({from:user,text,at:firebase.firestore.FieldValue.serverTimestamp()});
  lastSent=Date.now();if(friend===other)input.value='';
 }catch(e){status('⚠️ Không gửi được: '+(e.code==='permission-denied'?'Quy tắc Firestore chưa cập nhật, hoặc người nhận đã chặn bạn.':e.message));}
 finally{sending=false;setComposer();}
}
async function toggleBlock(){
 const user=uid(),other=friend;if(!user||!other)return;
 const next=!blocked;
 if(!confirm(next?'Chặn người này? Hai bạn sẽ không thể gửi tin nhắn cho nhau.':'Bỏ chặn người này?'))return;
 try{
  const ref=db.collection('chatBlocks').doc(user).collection('blocked').doc(other);
  if(next)await ref.set({owner:user,other,at:firebase.firestore.FieldValue.serverTimestamp()});
  else await ref.delete();
  await refreshBlock(other,viewToken);
 }catch(e){status('Không cập nhật được chặn: '+e.message);}
}
async function reportMessage(id,content){
 const user=uid(),other=friend;
 if(!user||!other||!confirm('Gửi báo cáo tin nhắn này cho người quản trị website?'))return;
 try{
  await db.collection('chatReports').add({reporter:user,reported:other,pairId:pair(user,other),messageId:id,reason:'inappropriate',text:String(content).slice(0,500),at:firebase.firestore.FieldValue.serverTimestamp()});
  status('Đã gửi báo cáo. Bạn cũng có thể chặn người này.');
 }catch(e){status('Không gửi được báo cáo: '+e.message);}
}
function init(){
 const modal=document.createElement('div');modal.id='vqcFriendChat';modal.className='vqc-chat-overlay';modal.hidden=true;
 modal.innerHTML='<section class="vqc-chat-dialog" role="dialog" aria-modal="true" aria-labelledby="vqcFriendChatHeading"><div class="vqc-duel-top"><h2 id="vqcFriendChatHeading">💬 Trò chuyện bạn bè</h2><button type="button" id="vqcFriendChatClose">✕ Đóng</button></div><p id="vqcFriendChatNotice" class="vqc-chat-safety" aria-live="polite">Chỉ nhắn tin với bạn bè đã xác nhận.</p><div id="vqcFriendChatMessages" class="vqc-chat-messages" aria-label="Nội dung trò chuyện" aria-live="polite"></div><label for="vqcFriendChatInput">Viết tin nhắn</label><textarea id="vqcFriendChatInput" maxlength="500" rows="2" placeholder="Nhập lời nhắn cho bạn..."></textarea><div class="vqc-chat-compose"><button type="button" id="vqcFriendChatClear">🗑 Xóa lịch sử</button><button type="button" id="vqcFriendChatBlock">🚫 Chặn</button><button type="button" id="vqcFriendChatSend">➤ Gửi</button></div><p class="vqc-chat-safety">Enter để gửi · Shift + Enter để xuống dòng. Có thể báo cáo tin nhắn không phù hợp.</p></section>';
 document.body.appendChild(modal);
 $('vqcFriendChatClose').addEventListener('click',close);
 $('vqcFriendChatSend').addEventListener('click',send);
 $('vqcFriendChatBlock').addEventListener('click',toggleBlock);
 $('vqcFriendChatClear').addEventListener('click',clearHistory);
 $('vqcFriendChatInput').addEventListener('input',setComposer);
 $('vqcFriendChatInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send();}});
 modal.addEventListener('click',e=>{if(e.target===modal)close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
 window.addEventListener('vqc:account-change',close);
}
window.vqcFriendChatOpen=open;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
