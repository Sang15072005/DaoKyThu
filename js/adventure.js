/* Đảo Kỳ Thủ: hành trình cá nhân, độc lập với phòng học trực tuyến. */
(function(){
'use strict';
const REGIONS=[
 ['⚓','Bến Cảng Khởi Hành','Làm quen với bàn cờ và các quân cờ','coast'],
 ['🌳','Rừng Sao Bí Ẩn','Di chuyển và nhặt sao','forest'],
 ['⛰️','Hẻm Núi Chiến Thuật','Tìm quân có thể ăn','canyon'],
 ['💎','Hang Động Pha Lê','Bảo vệ quân bị tấn công','crystal'],
 ['🌋','Núi Lửa Vua Đen','Chiếu và thoát chiếu','volcano'],
 ['🏰','Lâu Đài Trên Mây','Chiếu hết trong nhiều nước','cloud'],
 ['👑','Thành Trì Đại Kỳ Thủ','Thử thách tổng hợp','castle']
];
const FOREST_PIECES=[
 ['R','♜','Quân Xe'],['B','♝','Quân Tượng'],['Q','♛','Quân Hậu'],
 ['K','♚','Quân Vua'],['N','♞','Quân Mã'],['P','♟','Quân Tốt']
];
let forestActive=false,forestPiece=null,forestBoardParent=null,forestBoardNext=null,forestBoardNode=null;
const QUESTIONS=[
 {title:'Bàn cờ bí ẩn',question:'Bàn cờ vua có bao nhiêu ô?',options:['32 ô','64 ô','81 ô'],answer:1,explain:'Bàn cờ có 8 hàng và 8 cột, tổng cộng 64 ô.',board:'grid'},
 {title:'Hai đội quân',question:'Một ván cờ vua bắt đầu với tổng cộng bao nhiêu quân?',options:['16 quân','24 quân','32 quân'],answer:2,explain:'Mỗi bên có 16 quân, tổng cộng 32 quân.',board:'start'},
 {title:'Đội quân của em',question:'Mỗi bên có bao nhiêu quân Tốt khi bắt đầu ván cờ?',options:['6 quân','8 quân','10 quân'],answer:1,explain:'Mỗi bên có 8 quân Tốt.',board:'pawns'},
 {title:'Quân Vua dũng cảm',question:'Quân Vua được đi tối đa bao nhiêu ô trong một nước đi bình thường?',options:['1 ô','2 ô','3 ô'],answer:0,explain:'Vua đi một ô theo chiều ngang, dọc hoặc chéo, miễn là ô đến an toàn.',board:'king'},
 {title:'Con đường của Xe',question:'Quân Xe có thể di chuyển theo hướng nào?',options:['Chỉ đi chéo','Ngang hoặc dọc','Nhảy hình chữ L'],answer:1,explain:'Xe đi ngang hoặc dọc, không nhảy qua quân khác.',board:'rook'},
 {title:'Bước chân Tượng',question:'Quân Tượng di chuyển như thế nào?',options:['Theo đường chéo','Ngang hoặc dọc','Một ô bất kỳ'],answer:0,explain:'Tượng đi theo đường chéo và không nhảy qua quân khác.',board:'bishop'},
 {title:'Mã phiêu lưu',question:'Quân Mã có cách đi đặc biệt nào?',options:['Đi hình chữ L','Đi chéo bất kỳ','Chỉ tiến một ô'],answer:0,explain:'Mã đi hình chữ L và có thể nhảy qua các quân khác.',board:'knight'},
 {title:'Hậu quyền năng',question:'Quân Hậu kết hợp cách đi của hai quân nào?',options:['Vua và Mã','Xe và Tượng','Tốt và Mã'],answer:1,explain:'Hậu đi ngang, dọc hoặc chéo như Xe và Tượng.',board:'queen'},
 {title:'Tốt tiến lên',question:'Ở nước đi đầu tiên, quân Tốt có thể tiến thẳng tối đa bao nhiêu ô nếu đường trống?',options:['1 ô','2 ô','3 ô'],answer:1,explain:'Tốt có thể tiến một hoặc hai ô ở nước đầu tiên nếu đường đi trống.',board:'pawnmove'},
 {title:'Thử thách cuối bến cảng',question:'Khi Vua đang bị chiếu, em cần làm gì?',options:['Bỏ qua và đi quân bất kỳ','Thực hiện nước đi hợp lệ để hết bị chiếu','Đưa Vua vào ô đang bị tấn công'],answer:1,explain:'Khi bị chiếu, em phải chọn một nước đi hợp lệ giúp Vua thoát chiếu.',board:'check'}
];
const PIECES={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
let progress={done:[],forestDone:[],stars:0},current=0,answerLocked=false,saveTimer=null,cloudOk=false;
const $=id=>document.getElementById(id);
function identity(){return window.accountProfile?.uid||null;}
function storageKey(){return 'vqc-adventure-v1-'+(identity()||'guest');}
function sanitize(data){
 const done=Array.isArray(data?.done)?[...new Set(data.done.filter(n=>Number.isInteger(n)&&n>=0&&n<QUESTIONS.length))].sort((a,b)=>a-b):[];
 const forestDone=Array.isArray(data?.forestDone)?[...new Set(data.forestDone.filter(p=>FOREST_PIECES.some(x=>x[0]===p)))]:[];
 return {done,forestDone,stars:done.length*3+forestDone.length*6};
}
function localLoad(){try{return sanitize(JSON.parse(localStorage.getItem(storageKey())||'{}'));}catch(e){return sanitize({});}}
function localSave(){try{localStorage.setItem(storageKey(),JSON.stringify(progress));}catch(e){console.warn('Không lưu được tiến độ trên thiết bị',e);}}
function cloudRef(){return identity()&&typeof db!=='undefined'?db.collection('adventureProgress').doc(identity()):null;}
async function loadProgress(){
 progress=localLoad();render();
 const ref=cloudRef();if(!ref){setSaveStatus('Đăng nhập để đồng bộ tiến độ giữa các thiết bị.');return;}
 try{
  const snap=await ref.get();
  if(!snap.exists){cloudOk=true;setSaveStatus('Tiến độ lưu trên thiết bị.');return;}
  const remote=sanitize(snap.data());
  progress=sanitize({done:[...progress.done,...remote.done],forestDone:[...progress.forestDone,...remote.forestDone]});
  localSave();cloudOk=true;render();setSaveStatus('Đã tải tiến độ tài khoản.');
 }catch(e){cloudOk=false;setSaveStatus('Tiến độ đang lưu trên thiết bị này; chưa đồng bộ đám mây.');}
}
function saveProgress(){
 localSave();render();
 clearTimeout(saveTimer);
 const ref=cloudRef();if(!ref){setSaveStatus('Đã lưu trên thiết bị. Đăng nhập để lưu trực tuyến.');return;}
 saveTimer=setTimeout(async()=>{
  try{await ref.set({studentId:identity(),done:[...progress.done],forestDone:[...progress.forestDone],stars:progress.stars,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});cloudOk=true;setSaveStatus('✓ Đã lưu tiến độ vào tài khoản.');}
  catch(e){cloudOk=false;console.warn('Không thể lưu hành trình lên Firestore',e);setSaveStatus('✓ Đã lưu trên thiết bị; đồng bộ tài khoản chưa khả dụng.');}
 },180);
}
function setSaveStatus(msg){if($('vqcAdventureSave'))$('vqcAdventureSave').textContent=msg;}
function unlocked(n){return n===0||progress.done.includes(n-1);}
function render(){
 const nodes=$('vqcAdventureRegions');if(!nodes)return;
 nodes.replaceChildren();
 REGIONS.forEach((r,i)=>{
  const card=document.createElement('button');card.type='button';card.className='vqc-island vqc-island-'+r[3]+(i>1?' is-locked':' is-available');
  card.innerHTML='<span class="vqc-island-emoji" aria-hidden="true">'+r[0]+'</span><span class="vqc-island-number">VÙNG '+(i+1)+'</span><strong>'+r[1]+'</strong><small>'+r[2]+'</small><span class="vqc-island-state">'+(i===0?(progress.done.length===QUESTIONS.length?'🏆 Đã chinh phục':'▶ '+progress.done.length+'/'+QUESTIONS.length+' thử thách'):i===1?(progress.forestDone.length===FOREST_PIECES.length?'🏆 Đã chinh phục':'▶ '+progress.forestDone.length+'/'+FOREST_PIECES.length+' bài nhặt sao'):'🔒 Sắp ra mắt')+'</span>';
  card.disabled=i>1;card.onclick=()=>i===1?openForest():openRegion();nodes.appendChild(card);
 });
 $('vqcAdventureStars').textContent=String(progress.stars);
 if($('vqcForestProgress'))$('vqcForestProgress').textContent=progress.forestDone.length+'/'+FOREST_PIECES.length+' bài hoàn thành';
 renderForestCards();
 $('vqcAdventureCount').textContent=progress.done.length+'/'+QUESTIONS.length;
 $('vqcAdventureProgress').style.width=(progress.done.length/QUESTIONS.length*100)+'%';
 if($('vqcAdventureStages')&&!$('vqcAdventurePlay').hidden)renderStages();
}
function renderStages(){
 const wrap=$('vqcAdventureStages');wrap.replaceChildren();
 QUESTIONS.forEach((q,i)=>{
  const button=document.createElement('button');button.type='button';button.className='vqc-stage'+(progress.done.includes(i)?' is-done':'')+(current===i?' is-current':'');
  button.textContent=progress.done.includes(i)?'★':String(i+1);
  button.title='Màn '+(i+1)+': '+q.title+(unlocked(i)?'':' (chưa mở khóa)');
  button.setAttribute('aria-label',button.title);button.disabled=!unlocked(i);
  button.onclick=()=>showStage(i);wrap.appendChild(button);
 });
}
// Reuse the same chess-piece assets as the classroom board.
// Unicode chess characters inherit system fonts and render inconsistently.
function boardPieces(type){
 const pieces={};
 if(type==='start'){
  for(let x=0;x<8;x++){pieces['1'+x]='p';pieces['6'+x]='P';}
  ['r','n','b','q','k','b','n','r'].forEach((p,i)=>pieces['0'+i]=p);
  ['R','N','B','Q','K','B','N','R'].forEach((p,i)=>pieces['7'+i]=p);
 }
 if(type==='pawns')for(let x=0;x<8;x++){pieces['1'+x]='p';pieces['6'+x]='P';}
 const solo={king:'K',rook:'R',bishop:'B',knight:'N',queen:'Q',pawnmove:'P',check:'K'};
 if(solo[type])pieces[type==='pawnmove'?'60':'44']=solo[type];
 if(type==='check')pieces['04']='r';
 return pieces;
}
function renderBoard(type){
 const board=$('vqcAdventureBoard');
 if(!board)return;
 board.replaceChildren();
 const pieces=boardPieces(type);
 for(let r=0;r<8;r++)for(let col=0;col<8;col++){
  const cell=document.createElement('div');
  cell.className='vqc-adventure-square '+((r+col)%2?'dark':'light');
  const piece=pieces[''+r+col];
  if(piece){
   const pieceEl=document.createElement('span');
   pieceEl.className='vqc-adventure-piece';
   pieceEl.setAttribute('aria-label',(piece===piece.toUpperCase()?'Quân trắng ':'Quân đen ')+({P:'Tốt',R:'Xe',N:'Mã',B:'Tượng',Q:'Hậu',K:'Vua'}[piece.toUpperCase()]||''));
   if(typeof pieceSvgMarkup==='function')pieceEl.innerHTML=pieceSvgMarkup(piece);
   else pieceEl.textContent=({K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}[piece]||'');
   cell.appendChild(pieceEl);
  }
  board.appendChild(cell);
 }
}
function renderForestCards(){
 const wrap=$('vqcForestCards');if(!wrap)return;
 wrap.replaceChildren();
 FOREST_PIECES.forEach(([piece,icon,name])=>{
  const done=progress.forestDone.includes(piece);
  const btn=document.createElement('button');
  btn.type='button';btn.className='vqc-forest-card'+(done?' is-done':'');
  const pict=document.createElement('span');pict.className='vqc-forest-icon';pict.textContent=icon;
  const title=document.createElement('strong');title.textContent=name;
  const caption=document.createElement('small');caption.textContent=done?'✓ Đã thu thập đủ 6 sao':'⭐ Thu thập 6 ngôi sao';
  btn.append(pict,title,caption);
  btn.onclick=()=>openForestPiece(piece);wrap.appendChild(btn);
 });
}
function openForest(){
 if(typeof roomRef!=='undefined'&&roomRef){
  if(typeof vqcNotify==='function')vqcNotify('Hãy rời lớp trước khi chơi Vùng 2.','warning');
  return;
 }
 $('vqcAdventureMap').hidden=true;
 $('vqcAdventurePlay').hidden=true;
 $('vqcForestScreen').hidden=false;
 $('vqcForestGame').hidden=true;
 forestActive=true;
 renderForestCards();
}
function attachClassroomBoard(){
 const node=document.querySelector('section.center');
 const target=$('vqcForestBoardMount');
 if(!node||!target||typeof startPieceGame!=='function')throw Error('Chưa tải được bàn cờ nhặt sao.');
 if(!forestBoardNode){
  forestBoardNode=node;forestBoardParent=node.parentNode;forestBoardNext=node.nextSibling;
 }
 target.appendChild(node);
 node.classList.add('vqc-forest-board-active');
}
function restoreClassroomBoard(){
 if(!forestBoardNode)return;
 forestBoardNode.classList.remove('vqc-forest-board-active');
 if(forestBoardNext&&forestBoardNext.parentNode===forestBoardParent)forestBoardParent.insertBefore(forestBoardNode,forestBoardNext);
 else forestBoardParent.appendChild(forestBoardNode);
}
function openForestPiece(piece){
 if(!FOREST_PIECES.some(x=>x[0]===piece))return;
 if(typeof roomRef!=='undefined'&&roomRef)return;
 try{
  attachClassroomBoard();
  forestPiece=piece;
  $('vqcForestGame').hidden=false;
  $('vqcForestSelect').hidden=true;
  $('vqcForestGameTitle').textContent='🌳 Rừng Sao · '+FOREST_PIECES.find(x=>x[0]===piece)[2];
  startPieceGame(piece);
  $('vqcForestBoardMount').scrollIntoView({block:'nearest',behavior:'smooth'});
 }catch(e){
  console.error('Không mở được bài nhặt sao cũ',e);
  $('vqcForestGame').hidden=true;
  $('vqcForestSelect').hidden=false;
  if(typeof vqcNotify==='function')vqcNotify('Không mở được bài nhặt sao: '+e.message,'warning');
 }
}
function closeForestPiece(){
 if(typeof hideStarRewardLocal==='function')hideStarRewardLocal();
 if(typeof exitPieceGame==='function'&&forestPiece)exitPieceGame();
 forestPiece=null;
 restoreClassroomBoard();
 $('vqcForestGame').hidden=true;
 $('vqcForestSelect').hidden=false;
 renderForestCards();
}
function closeForest(){
 if(forestPiece)closeForestPiece();
 forestActive=false;
 $('vqcForestScreen').hidden=true;
 $('vqcAdventureMap').hidden=false;
 render();
}
window.vqcAdventureForestBack=closeForest;
window.vqcAdventureForestExit=closeForestPiece;
window.vqcAdventurePieceCompleted=function(piece){
 if(!forestActive||forestPiece!==piece||progress.forestDone.includes(piece))return;
 progress.forestDone.push(piece);
 progress=sanitize(progress);
 saveProgress();
 // Preserve the original 6-star reward dialog and its existing continue button.
};
window.vqcAdventureLeaveWorld=function(){
 if(forestActive)closeForest();
};

function openRegion(){
 if(forestActive)closeForest();
 $('vqcAdventureMap').hidden=true;$('vqcAdventurePlay').hidden=false;
 const next=QUESTIONS.findIndex((q,i)=>!progress.done.includes(i)&&unlocked(i));
 showStage(next<0?QUESTIONS.length-1:next);
}
function showStage(index){
 if(!unlocked(index))return;
 current=index;answerLocked=false;
 const q=QUESTIONS[index];$('vqcAdventureStageTitle').textContent='Màn '+(index+1)+' · '+q.title;
 $('vqcAdventureQuestion').textContent=q.question;
 const choices=$('vqcAdventureAnswers');choices.replaceChildren();
 q.options.forEach((opt,i)=>{
  const btn=document.createElement('button');btn.type='button';btn.className='vqc-adventure-answer';btn.textContent=String.fromCharCode(65+i)+'. '+opt;btn.onclick=()=>choose(i);choices.appendChild(btn);
 });
 $('vqcAdventureFeedback').hidden=true;$('vqcAdventureFeedback').textContent='';
 $('vqcAdventureNext').hidden=true;renderBoard(q.board);renderStages();
}
function choose(choice){
 if(answerLocked)return;
 const q=QUESTIONS[current],correct=choice===q.answer;
 const buttons=[...$('vqcAdventureAnswers').children];
 buttons[choice].classList.add(correct?'correct':'incorrect');
 const fb=$('vqcAdventureFeedback');fb.hidden=false;
 if(!correct){fb.textContent='Chưa đúng rồi! Em hãy thử chọn đáp án khác nhé.';return;}
 answerLocked=true;buttons.forEach(b=>b.disabled=true);
 fb.textContent='🌟 Chính xác! '+q.explain;
 if(!progress.done.includes(current)){progress.done.push(current);progress=sanitize(progress);saveProgress();}
 $('vqcAdventureNext').hidden=false;
 $('vqcAdventureNext').textContent=current===QUESTIONS.length-1?'🏆 Xem thành tích':'Tiếp tục khám phá →';
}
function next(){
 if(current===QUESTIONS.length-1){closeRegion();return;}
 showStage(current+1);
}
function closeRegion(){$('vqcAdventurePlay').hidden=true;$('vqcAdventureMap').hidden=false;render();}
window.vqcAdventureStart=function(){
 if(typeof roomRef!=='undefined'&&roomRef){if(typeof vqcNotify==='function')vqcNotify('Hãy rời phòng học trước khi khám phá hòn đảo.','warning');return;}
 $('vqcAdventurePlay').hidden=true;$('vqcAdventureMap').hidden=false;
 if($('vqcForestScreen'))$('vqcForestScreen').hidden=true;
 forestActive=false;
 loadProgress();
};
window.vqcAdventureBack=closeRegion;
window.vqcAdventureNext=next;
window.vqcAdventureReset=function(){
 if(!confirm('Em có muốn chơi lại từ màn đầu? Tiến độ cũ sẽ được đặt lại.'))return;
 progress=sanitize({});saveProgress();closeRegion();
};
window.addEventListener('DOMContentLoaded',()=>{if($('vqcAdventureRegions')){render();$('vqcAdventurePlay').hidden=true;}});
})();
