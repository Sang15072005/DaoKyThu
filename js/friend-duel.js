/* Friend-only chess duel. Requires published friendMatches Firestore rules. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const pair=(a,b)=>[a,b].sort().join('_');
let unsubscribe=null,otherId='',otherDisplay='',matchId='',matchData=null,working=false,selected='',legal=[];
function profile(){return window.accountProfile;}
function myId(){return typeof auth!=='undefined'&&auth.currentUser?.uid;}
function say(s){const el=$('vqcDuelStatus');if(el)el.textContent=s;}
function connectionError(e){console.warn('Friend duel connection:',e);say(e?.code==='permission-denied'?'⚠️ Firebase từ chối kết nối. Hãy cập nhật Firestore Rules trong Firebase Console rồi nhấn Thử lại.':'⚠️ Kết nối bàn đấu thất bại: '+String(e?.message||e));$('vqcDuelRetry').hidden=false;}
function friendName(uid){return otherDisplay||'Kỳ thủ '+String(uid).slice(-4).toUpperCase();}
function close(){if(unsubscribe){unsubscribe();unsubscribe=null;}otherId='';otherDisplay='';matchId='';matchData=null;selected='';legal=[];$('vqcFriendDuel')?.setAttribute('hidden','');}
function render(){
 const board=$('vqcDuelBoard');if(!board||!matchData)return;
 const chess=new Chess(matchData.fen);
 const mine=myId(),white=matchData.white===mine,files=white?'abcdefgh':'hgfedcba',ranks=white?[8,7,6,5,4,3,2,1]:[1,2,3,4,5,6,7,8];
 board.replaceChildren();
 for(let r=0;r<8;r++)for(let f=0;f<8;f++){
  const square=files[f]+ranks[r],cell=document.createElement('button');
  cell.type='button';cell.className='vqc-duel-square '+((r+f)%2?'dark':'light');
  if(selected===square)cell.classList.add('selected');
  if(legal.includes(square))cell.classList.add('hint');
  const piece=chess.get(square);
  if(piece)cell.innerHTML=pieceSvgMarkup(piece.color==='w'?piece.type.toUpperCase():piece.type);
  cell.setAttribute('aria-label',square+(piece?' có quân cờ':''));
  cell.onclick=()=>clickSquare(square);
  board.appendChild(cell);
 }
 const turn=chess.turn()==='w'?matchData.white:matchData.black;
 const finished=matchData.status==='finished'||chess.game_over();
 $('vqcDuelHeading').textContent='⚔️ Đấu với '+friendName(otherId);
 if(finished)say(chess.in_checkmate()?'🏆 Chiếu hết! Ván đấu đã kết thúc.':chess.in_draw()?'🤝 Ván đấu hòa.':'🏁 Ván đấu kết thúc.');
 else say(turn===mine?'♟️ Đến lượt bạn!':'⏳ Đang chờ bạn bè đi cờ...');
 $('vqcDuelTurn').textContent='Bạn cầm quân '+(white?'Trắng':'Đen')+' · '+matchData.moves+' nước đã đi';
}
async function clickSquare(sq){
 if(!matchData||working)return;
 const mine=myId(),chess=new Chess(matchData.fen);
 const current=chess.turn()==='w'?matchData.white:matchData.black;
 if(current!==mine||matchData.status==='finished')return;
 const pc=chess.get(sq);
 if(selected&&legal.includes(sq)){
  const move=chess.move({from:selected,to:sq,promotion:'q'});
  if(!move){selected='';legal=[];render();return;}
  const previous=matchData;selected='';legal=[];working=true;say('⏳ Đang gửi nước đi...');
  try{
   await db.runTransaction(async tx=>{
    const ref=db.collection('friendMatches').doc(matchId),snapshot=await tx.get(ref);
    if(!snapshot.exists||snapshot.data().fen!==previous.fen||snapshot.data().turn!==mine)throw Error('Ván đấu đã thay đổi. Hãy thử lại.');
    tx.update(ref,{fen:chess.fen(),turn:chess.game_over()?'':(chess.turn()==='w'?previous.white:previous.black),moves:previous.moves+1,lastMove:move.from+move.to, status:chess.game_over()?'finished':'playing',updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
   });
  }catch(e){console.warn('Friend duel move:',e);say(e.code==='permission-denied'?'Firebase chưa cấp quyền đấu bạn bè. Cần xuất bản firestore.rules.':String(e.message||e));}
  finally{working=false;}
  return;
 }
 if(pc&&pc.color===chess.turn()){selected=sq;legal=chess.moves({square:sq,verbose:true}).map(m=>m.to);}
 else{selected='';legal=[];}
 render();
}
async function open(other){
 const uid=myId();if(!uid||!other||uid===other||!['student','teacher'].includes(profile()?.role))return;
 if(typeof roomRef!=='undefined'&&roomRef){if(typeof vqcNotify==='function')vqcNotify('Hãy rời lớp trước khi thách đấu bạn bè.','warning');return;}
 if(typeof Chess!=='function'){if(typeof vqcNotify==='function')vqcNotify('Chưa tải được luật cờ. Hãy tải lại trang.','warning');return;}
 close();otherId=other;matchId=pair(uid,other);
 $('vqcDuelRetry').hidden=true;$('vqcDuelBoard').replaceChildren();$('vqcDuelTurn').textContent='Đang đồng bộ ván đấu...';
 db.collection('friendPublicProfiles').doc(other).get().then(snap=>{if(otherId===other&&snap.exists&&snap.data().sharedName){otherDisplay=String(snap.data().sharedName).slice(0,100);if(matchData)render();}}).catch(()=>{});
 $('vqcFriendDuel').hidden=false;say('Đang kết nối bàn đấu...');
 try{
  const friendship=await db.collection('friendships').doc(matchId).get();
  const data=friendship.data(),challenge=data?.challenge;
  if(data?.status!=='accepted'||challenge?.status!=='accepted'||![uid,other].includes(challenge.from)||!challenge.at)throw Error('Hai bạn cần kết bạn và đồng ý lời thách đấu trước.');
  const white=challenge.from,black=white===uid?other:uid;
  const ref=db.collection('friendMatches').doc(matchId);
  await db.runTransaction(async tx=>{
   const snap=await tx.get(ref),previous=snap.data();
   if(previous&&previous.challengeAt?.isEqual?.(challenge.at))return;
   tx.set(ref,{members:[uid,other].sort(),friendshipId:matchId,challengeAt:challenge.at,white,black,fen:new Chess().fen(),turn:white,moves:0,status:'playing',lastMove:'',updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
  });
  if(otherId!==other)return;
  unsubscribe=ref.onSnapshot({includeMetadataChanges:true},snap=>{
   if(!snap.exists){say('Bàn đấu chưa sẵn sàng.');return;}
   if(!snap.metadata.fromCache)$('vqcDuelRetry').hidden=true;
   matchData=snap.data();selected='';legal=[];render();
  },connectionError);
 }catch(e){
  console.warn('Friend duel:',e);
  connectionError(e);
 }
}
function init(){
 const overlay=document.createElement('div');overlay.id='vqcFriendDuel';overlay.className='vqc-duel-overlay';overlay.hidden=true;
 overlay.innerHTML='<section class="vqc-duel-dialog" role="dialog" aria-modal="true" aria-labelledby="vqcDuelHeading"><div class="vqc-duel-top"><h2 id="vqcDuelHeading">⚔️ Thách đấu bạn bè</h2><button type="button" id="vqcDuelClose">✕ Đóng</button></div><p id="vqcDuelStatus" aria-live="polite">Đang kết nối...</p><p id="vqcDuelTurn"></p><button type="button" id="vqcDuelRetry" hidden>↻ Thử kết nối lại</button><div id="vqcDuelBoard" class="vqc-duel-board" aria-label="Bàn cờ thách đấu"></div><p class="vqc-duel-footnote">Chỉ bạn bè đã đồng ý mới có thể đấu. Mỗi bên đi đúng lượt; phong cấp mặc định thành Hậu. Trò chơi không ảnh hưởng tiến độ khám phá.</p></section>';
 document.body.appendChild(overlay);
 $('vqcDuelClose').addEventListener('click',close);
 $('vqcDuelRetry').addEventListener('click',()=>{const id=otherId;if(id)open(id);});
 overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close();});
 window.addEventListener('vqc:account-change',close);
}
window.vqcFriendDuelOpen=open;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
