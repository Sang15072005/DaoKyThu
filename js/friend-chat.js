/* Private, realtime, preset-only chat for confirmed chess friends. */
(function(){
'use strict';
const PHRASES=['👋 Chào bạn!','♟️ Bạn chơi cờ với mình nhé?','👏 Bạn chơi hay quá!','🎉 Chúc mừng bạn!','😊 Cảm ơn bạn!'];
const $=id=>document.getElementById(id);
let unlisten=null,friend='',sending=false;
const uid=()=>typeof auth!=='undefined'?auth.currentUser?.uid:null;
const pair=(a,b)=>[a,b].sort().join('_');
function close(){if(unlisten){unlisten();unlisten=null;}friend='';$('vqcFriendChat')?.setAttribute('hidden','');}
function open(other){
 const user=uid();if(!user||!other||user===other)return;
 close();friend=other;
 const modal=$('vqcFriendChat');modal.hidden=false;
 $('vqcFriendChatHeading').textContent='💬 Trò chuyện với Kỳ thủ '+other.slice(-4).toUpperCase();
 $('vqcFriendChatMessages').textContent='Đang tải tin nhắn...';
 const id=pair(user,other);
 db.collection('friendships').doc(id).get().then(doc=>{
  if(friend!==other)return;
  if(!doc.exists||doc.data()?.status!=='accepted')throw Error('Chỉ có thể trò chuyện với bạn bè đã xác nhận.');
  unlisten=db.collection('friendChats').doc(id).collection('messages').orderBy('at','desc').limit(40)
   .onSnapshot(snapshot=>{
    if(friend!==other)return;
    const root=$('vqcFriendChatMessages');root.replaceChildren();
    if(snapshot.empty){root.textContent='Chưa có tin nhắn. Hãy gửi một lời chào!';return;}
    [...snapshot.docs].reverse().forEach(doc=>{
     const data=doc.data();
     if(!PHRASES.includes(data.text))return;
     const line=document.createElement('p');line.className='vqc-chat-bubble'+(data.from===user?' is-mine':'');
     line.textContent=(data.from===user?'Em: ':'Bạn: ')+data.text;root.appendChild(line);
    });
    root.scrollTop=root.scrollHeight;
   },e=>{$('vqcFriendChatMessages').textContent='Không tải được trò chuyện: '+e.message;});
 }).catch(e=>{$('vqcFriendChatMessages').textContent=e.message;});
}
async function send(){
 const user=uid(),other=friend,choice=$('vqcFriendChatSelect'),text=choice?.value;
 if(sending||!user||!other||!PHRASES.includes(text))return;
 sending=true;$('vqcFriendChatSend').disabled=true;
 try{
  const id=pair(user,other),friendship=await db.collection('friendships').doc(id).get();
  if(friendship.data()?.status!=='accepted')throw Error('Hai bạn không còn là bạn bè.');
  await db.collection('friendChats').doc(id).collection('messages').add({from:user,text,at:firebase.firestore.FieldValue.serverTimestamp()});
 }catch(e){$('vqcFriendChatMessages').textContent='Không gửi được tin nhắn: '+(e.code==='permission-denied'?'Cần xuất bản quy tắc Firestore mới.':e.message);}
 finally{sending=false;$('vqcFriendChatSend').disabled=false;}
}
function init(){
 const modal=document.createElement('div');modal.id='vqcFriendChat';modal.className='vqc-chat-overlay';modal.hidden=true;
 modal.innerHTML='<section class="vqc-chat-dialog" role="dialog" aria-modal="true" aria-labelledby="vqcFriendChatHeading"><div class="vqc-duel-top"><h2 id="vqcFriendChatHeading">💬 Trò chuyện bạn bè</h2><button type="button" id="vqcFriendChatClose">✕ Đóng</button></div><p class="vqc-chat-safety">Chỉ gửi câu có sẵn, không chia sẻ thông tin riêng tư.</p><div id="vqcFriendChatMessages" class="vqc-chat-messages" aria-live="polite"></div><label for="vqcFriendChatSelect">Chọn lời nhắn</label><select id="vqcFriendChatSelect"></select><button type="button" id="vqcFriendChatSend">Gửi tin nhắn</button></section>';
 document.body.appendChild(modal);
 const select=$('vqcFriendChatSelect');
 PHRASES.forEach(t=>{const opt=document.createElement('option');opt.value=t;opt.textContent=t;select.appendChild(opt);});
 $('vqcFriendChatClose').addEventListener('click',close);
 $('vqcFriendChatSend').addEventListener('click',send);
 modal.addEventListener('click',e=>{if(e.target===modal)close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
 window.addEventListener('vqc:account-change',close);
}
window.vqcFriendChatOpen=open;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
