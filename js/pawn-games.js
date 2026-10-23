
/* Hai trò chơi theo hình 71–72: cờ Tốt và Mã chống ba Tốt. */
let pawnGameIndex=0,pawnGamePosition={},pawnGameTurn='w',pawnGameSelected=null,pawnGameFinished='',pawnGameFlipped=false,pawnGameLastKey='',pawnGameTeacherColor='w',pawnGameStarted=false,pawnGamePendingPromotion=null,pawnGameEnPassantTarget=null,pawnGameSyncPending=false,pawnGameWriteSequence=0,pawnGameLastMove=null;
function pawnGameInitial(i){const p={};if(i===0){for(const f of 'abcdefgh'){p[f+'2']='P';p[f+'7']='p';}}else{p.e1='N';for(const f of 'def')p[f+'7']='p';}return p;}
function pawnGameOpen(i=0){if(roomRef&&role!=='teacher'&&!vqcNavApplying){vqcNotify('Giáo viên chọn trò chơi cho cả lớp.','warning');return;}pawnGameIndex=i===1?1:0;vqcCloseOtherViews('pawngame');document.getElementById('pawnGameOverlay').classList.add('open');if(!vqcNavApplying){if(role==='teacher'||!roomRef){pawnGameStarted=false;pawnGameReset();}else{pawnGameSelected=null;pawnGameRender();}}else{pawnGameSelected=null;pawnGameRender();}vqcBroadcastView('pawngame',pawnGameIndex);if(!vqcNavApplying&&role==='teacher')pawnGamePublish();}
function pawnGameClose(){pawnGamePendingPromotion=null;document.getElementById('pawnGameOverlay').classList.remove('open');if(!window.vqcPawnArcadeMode)vqcBroadcastView('board');else window.vqcPawnArcadeMode=false;}
function pawnGameReset(){if(roomRef&&role!=='teacher')return;if(pawnGameSyncPending)return;pawnGamePosition=pawnGameInitial(pawnGameIndex);pawnGameLastMove=null;pawnGameTurn='w';pawnGameSelected=null;pawnGameFinished='';pawnGamePendingPromotion=null;pawnGameEnPassantTarget=null;pawnGameStarted=true;pawnGameFlipped=false;pawnGameRender();pawnGamePublish();}
function pawnGameChoose(color){if(roomRef&&role!=='teacher')return;if(pawnGameSyncPending)return;pawnGameTeacherColor=color==='b'?'b':'w';pawnGameReset();}
function pawnGameMine(){return window.vqcPawnArcadeMode?pawnGameTurn:(role==='teacher'?pawnGameTeacherColor:(pawnGameTeacherColor==='w'?'b':'w'));}
function pawnGameFlip(){pawnGameFlipped=!pawnGameFlipped;pawnGameRender();} // Góc nhìn là tùy chọn riêng từng máy, không ghi đè góc nhìn của đối phương.
function pawnGameSide(p){return p===p.toUpperCase()?'w':'b';}
function pawnGameMoves(from){if(pawnGamePendingPromotion)return [];const p=pawnGamePosition[from];if(!p||pawnGameSide(p)!==pawnGameTurn||pawnGameFinished)return [];const x='abcdefgh'.indexOf(from[0]),y=Number(from[1]),out=[];function add(nx,ny,capture){if(nx<0||nx>7||ny<1||ny>8)return;const sq='abcdefgh'[nx]+ny,t=pawnGamePosition[sq];if(capture?(t&&pawnGameSide(t)!==pawnGameTurn):!t)out.push(sq);}
 if(p.toLowerCase()==='p'){const dir=p==='P'?1:-1;add(x,y+dir,false);const front='abcdefgh'[x]+(y+dir);if((y===(p==='P'?2:7))&&!pawnGamePosition[front])add(x,y+dir*2,false);for(const dx of [-1,1]){add(x+dx,y+dir,true);const nx=x+dx,target='abcdefgh'[nx]+(y+dir),victim='abcdefgh'[nx]+y;if(nx>=0&&nx<8&&target===pawnGameEnPassantTarget&&!pawnGamePosition[target]&&pawnGamePosition[victim]===(p==='P'?'p':'P'))out.push(target);}}
 if(p.toLowerCase()==='n')for(const [dx,dy] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<8&&ny>=1&&ny<=8){const sq='abcdefgh'[nx]+ny,t=pawnGamePosition[sq];if(!t||pawnGameSide(t)!==pawnGameTurn)out.push(sq);}}
 return out;}
function pawnGameRender(){const board=document.getElementById('pawnGameBoard');if(!board)return;window.vqcLastMove?.mark('pawnGameBoard',pawnGameLastMove?.from||null,pawnGameLastMove?.to||null);board.innerHTML='';const blackBelow=(roomRef?pawnGameMine()==='b':false)!==pawnGameFlipped,ranks=blackBelow?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1],files=blackBelow?'hgfedcba':'abcdefgh',hints=pawnGameSelected?pawnGameMoves(pawnGameSelected):[];
 for(let ri=0;ri<8;ri++)for(let fi=0;fi<8;fi++){const f=files[fi],r=ranks[ri],sq=f+r,cell=document.createElement('div');cell.dataset.square=sq;cell.className='pawn-game-cell '+((('abcdefgh'.indexOf(f)+r)%2)?'dark':'light')+(sq===pawnGameSelected?' selected':'')+(hints.includes(sq)?' hint':'');const p=pawnGamePosition[sq];if(p)cell.innerHTML=pieceSvgMarkup(p);if(fi===0)cell.insertAdjacentHTML('beforeend','<span class="pawn-game-coord rank">'+r+'</span>');if(ri===7)cell.insertAdjacentHTML('beforeend','<span class="pawn-game-coord file">'+f+'</span>');cell.onclick=()=>pawnGameClick(sq);board.appendChild(cell);}
 for(let i=0;i<2;i++)document.getElementById('pawnGameTab'+i).classList.toggle('active',i===pawnGameIndex);
 document.getElementById('pawnGameRules').textContent=pawnGameIndex===0?'Mỗi bên có 8 Tốt. Có luật bắt Tốt qua đường ngay nước kế tiếp khi đối phương vừa tiến hai ô. Ai đưa Tốt đến hàng cuối được chọn Hậu, Xe, Tượng hoặc Mã để phong cấp và giành chiến thắng.':'Trắng điều khiển Mã, Đen điều khiển 3 Tốt. Mã thắng khi ăn hết 3 Tốt; Đen thắng khi phong cấp một Tốt ở hàng 1.';
 const mine=pawnGameMine(),myTurn=mine===pawnGameTurn;document.getElementById('pawnGameAssign').style.display=window.vqcPawnArcadeMode?'none':(role==='teacher'||!roomRef?'block':'none');document.getElementById('pawnGameChooseW').classList.toggle('active',pawnGameTeacherColor==='w');document.getElementById('pawnGameChooseB').classList.toggle('active',pawnGameTeacherColor==='b');document.getElementById('pawnGameRoles').textContent=window.vqcPawnArcadeMode?'🎮 Giải trí · Hai bên lần lượt di chuyển trên cùng bàn cờ':(role==='teacher'?'Giáo viên':'Học sinh')+' chơi '+(mine==='w'?(pawnGameIndex===1?'Mã trắng':'Trắng'):(pawnGameIndex===1?'3 Tốt đen':'Đen'))+' · '+(myTurn?'Đến lượt bạn':'Chờ đối phương');pawnGameRenderPromotion();document.getElementById('pawnGameStatus').textContent=(pawnGameSyncPending?'⏳ Đang đồng bộ nước đi với phòng học…':pawnGameFinished)||(pawnGamePendingPromotion?'♟️ Tốt đã tới hàng cuối! Đang chờ người chơi chọn quân phong cấp.':('Đến lượt '+(pawnGameTurn==='w'?'Trắng':'Đen')+(roomRef?(myTurn?' — bạn được đi.':' — chờ đối phương đi.'):' — chọn quân để đi.')));}
function pawnGameClick(sq){if(pawnGameSyncPending||!pawnGameStarted||pawnGamePendingPromotion||pawnGameFinished||(roomRef&&pawnGameTurn!==pawnGameMine()))return;const p=pawnGamePosition[sq];if(pawnGameSelected&&pawnGameMoves(pawnGameSelected).includes(sq)){const from=pawnGameSelected,mover=pawnGamePosition[from];
 // Bắt Tốt qua đường: chỉ được ăn ngay nước đáp trả sau khi đối phương tiến hai ô.
 const isEnPassant=mover.toLowerCase()==='p'&&sq===pawnGameEnPassantTarget&&from[0]!==sq[0]&&!pawnGamePosition[sq];
 if(isEnPassant){const captured=sq[0]+from[1];if(pawnGamePosition[captured]!==((mover==='P')?'p':'P'))return;delete pawnGamePosition[captured];}
 pawnGameEnPassantTarget=null;
 if(mover.toLowerCase()==='p'&&from[0]===sq[0]&&Math.abs(Number(sq[1])-Number(from[1]))===2)pawnGameEnPassantTarget=from[0]+((Number(from[1])+Number(sq[1]))/2);
 delete pawnGamePosition[from];pawnGamePosition[sq]=mover;pawnGameLastMove={from,to:sq};pawnGameSelected=null;
 if((mover==='P'&&sq[1]==='8')||(mover==='p'&&sq[1]==='1')){pawnGamePendingPromotion={square:sq,color:mover==='P'?'w':'b'};pawnGameRender();pawnGamePublish();return;}
 if(pawnGameIndex===1&&!Object.values(pawnGamePosition).includes('p'))pawnGameFinished='🏆 Trắng thắng! Mã đã ăn hết ba Tốt.';
 if(!pawnGameFinished){pawnGameTurn=pawnGameTurn==='w'?'b':'w';if(!Object.keys(pawnGamePosition).some(k=>pawnGameSide(pawnGamePosition[k])===pawnGameTurn&&pawnGameMoves(k).length)){pawnGameFinished='Ván kết thúc: bên '+(pawnGameTurn==='w'?'Trắng':'Đen')+' không còn nước đi hợp lệ.';}}
 pawnGameRender();pawnGamePublish();return;}
 pawnGameSelected=p&&pawnGameSide(p)===pawnGameTurn?sq:null;pawnGameRender();}

function pawnGameRenderPromotion(){
 const overlay=document.getElementById('pawnGamePromotion'),choices=document.getElementById('pawnGamePromotionChoices');
 if(!overlay||!choices)return;
 const pending=pawnGamePendingPromotion;
 // Only the player who made the move can choose; the other screen waits for synchronization.
 const canChoose=!!pending&&(!roomRef||pawnGameMine()===pending.color);
 overlay.hidden=!canChoose;
 if(!canChoose){choices.replaceChildren();return;}
 choices.replaceChildren();
 for(const [letter,name] of [['q','Hậu'],['r','Xe'],['b','Tượng'],['n','Mã']]){
  const btn=document.createElement('button');btn.type='button';btn.className='pawn-promotion-option';
  btn.innerHTML=pieceSvgMarkup(pending.color==='w'?letter.toUpperCase():letter)+'<span>'+name+'</span>';
  btn.onclick=()=>pawnGamePromote(letter);choices.appendChild(btn);
 }
}
function pawnGamePromote(letter){
 const pending=pawnGamePendingPromotion;
 if(!pending||pawnGameSyncPending||!['q','r','b','n'].includes(letter)||(roomRef&&pawnGameMine()!==pending.color))return;
 const old=pawnGamePosition[pending.square];
 if(old!==(pending.color==='w'?'P':'p'))return;
 pawnGamePosition[pending.square]=pending.color==='w'?letter.toUpperCase():letter;
 pawnGamePendingPromotion=null;
 const winner=pending.color==='w'?'Trắng':'Đen';
 const name={q:'Hậu',r:'Xe',b:'Tượng',n:'Mã'}[letter];
 pawnGameFinished='🏆 '+winner+' chiến thắng! Tốt đã phong cấp thành '+name+'.';
 pawnGameSelected=null;pawnGameRender();pawnGamePublish();
}
function pawnGamePublish(){
 if(!document.getElementById('pawnGameOverlay')?.classList.contains('open')||!roomRef||vqcApplyingExercise||vqcNavApplying)return;
 // Khoá thao tác cho tới khi Firebase xác nhận đã ghi, tránh hai nước đi nối tiếp bị ghi đè.
 const sequence=++pawnGameWriteSequence;
 pawnGameSyncPending=true;
 pawnGameRender();
 const payload={index:pawnGameIndex,position:{...pawnGamePosition},turn:pawnGameTurn,finished:pawnGameFinished,teacherColor:pawnGameTeacherColor,started:pawnGameStarted,pendingPromotion:pawnGamePendingPromotion,enPassantTarget:pawnGameEnPassantTarget,lastMove:pawnGameLastMove,clientId:vqcExerciseClientId,sequence};
 roomRef.update({pawnGameExercise:payload,updatedAt:firebase.firestore.FieldValue.serverTimestamp()})
  .then(()=>{if(sequence===pawnGameWriteSequence){pawnGameSyncPending=false;pawnGameRender();}})
  .catch(e=>{console.error('Không đồng bộ được trò chơi:',e);if(sequence===pawnGameWriteSequence){pawnGameSyncPending=false;pawnGameRender();}vqcNotify('Chưa đồng bộ được nước đi. Hãy kiểm tra kết nối trước khi chơi tiếp.','warning');});
}
function pawnGameReceive(d){
 if(!d||d.clientId===vqcExerciseClientId||d.index!==pawnGameIndex||!d.position)return;
 const key=JSON.stringify(d);if(key===pawnGameLastKey)return;
 // Không thay đổi ván đang có nước đi chưa được xác nhận trên máy này.
 if(pawnGameSyncPending)return;
 pawnGameLastKey=key;vqcApplyingExercise=true;
 try{
  pawnGamePosition={...d.position};pawnGameLastMove=d.lastMove&&/^[a-h][1-8]$/.test(d.lastMove.from)&&/^[a-h][1-8]$/.test(d.lastMove.to)?{from:d.lastMove.from,to:d.lastMove.to}:null;pawnGameTurn=d.turn==='b'?'b':'w';pawnGameFinished=d.finished||'';
  pawnGameTeacherColor=d.teacherColor==='b'?'b':'w';pawnGameStarted=!!d.started;
  pawnGameEnPassantTarget=typeof d.enPassantTarget==='string'&&/^[a-h][36]$/.test(d.enPassantTarget)?d.enPassantTarget:null;
  pawnGamePendingPromotion=d.pendingPromotion&&/^[a-h][18]$/.test(d.pendingPromotion.square)?{square:d.pendingPromotion.square,color:d.pendingPromotion.color==='b'?'b':'w'}:null;
  pawnGameSelected=null;pawnGameRender();
 }finally{vqcApplyingExercise=false;}
}


/* Chế độ giải trí trong Khám phá: chơi trên thiết bị, không ghi tiến độ và không gửi phòng học. */
window.vqcPawnArcadeMode=false;
window.vqcOpenPawnArcade=function(index=0){
 if(typeof roomRef!=='undefined'&&roomRef){if(typeof vqcNotify==='function')vqcNotify('Hãy rời lớp học trước khi chơi giải trí.','warning');return;}
 window.vqcPawnArcadeMode=true;
 pawnGameOpen(index);
};
