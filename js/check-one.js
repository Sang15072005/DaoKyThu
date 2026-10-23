
// Thế cờ sao chép từ 7 hình trong tài liệu Chiếu trong 1 nước.docx.
const CHECK_ONE_TASKS=[
 {pieces:{e8:'k',c6:'b',a1:'R'}},
 {pieces:{e6:'k',d5:'n',b3:'Q'}},
 {pieces:{d8:'q',e8:'k',b7:'p',c7:'p',d6:'p',e5:'p',d3:'B',g2:'r'}},
 {pieces:{c8:'r',f8:'q',c7:'n',e5:'k',c3:'N',e3:'P',d2:'P',g2:'B'}},
 {pieces:{c7:'b',e7:'q',h7:'n',b6:'p',c6:'p',d6:'k',c5:'N'}},
 {pieces:{g8:'R',b7:'k',f7:'r',e5:'Q',c3:'n'}},
 {pieces:{h8:'r',e7:'k',d5:'n',e4:'N',c2:'R',e1:'Q'}}
];
let checkOneIndex=0,checkOnePosition={},checkOneSelected=null,checkOneSolved=false,checkOneFailed=false,checkOneLastMove=null;
const checkOneDone=new Set();let vqcCheckOneLastReceived='';
function checkOneOpen(i){checkOneIndex=(i+CHECK_ONE_TASKS.length)%CHECK_ONE_TASKS.length;vqcCloseOtherViews('check1');checkOneReset();document.getElementById('checkOneOverlay').classList.add('open');document.getElementById('vqcHomeHero')?.setAttribute('hidden','');vqcBroadcastView('check1',checkOneIndex);vqcPublishCheckOne();}
function checkOneClose(){document.getElementById('checkOneOverlay').classList.remove('open');vqcBroadcastView('board');}
function checkOneReset(){checkOneLastMove=null;checkOnePosition={...CHECK_ONE_TASKS[checkOneIndex].pieces};checkOneSelected=null;checkOneSolved=false;checkOneFailed=false;document.getElementById('checkOneInstruction').textContent='Đe dọa Vua đen bằng một nước đi hợp lệ!';document.getElementById('checkOneFeedback').hidden=true;checkOneRender();vqcPublishCheckOne();}
function checkOneLegal(piece,from,to,pos){return !!piece&&piece===piece.toUpperCase()&&vqcExerciseLegalMove(piece,from,to,pos);}
function checkOneIsCheck(pos){const king=Object.keys(pos).find(k=>pos[k]==='k');if(!king)return false;return Object.keys(pos).some(k=>{const p=pos[k];return p&&p===p.toUpperCase()&&captureCanAttack(p,k,king,pos);});}
function checkOneRender(){const board=document.getElementById('checkOneBoard');window.vqcLastMove?.mark('checkOneBoard',checkOneLastMove?.from||null,checkOneLastMove?.to||null);board.innerHTML='';for(let r=8;r>=1;r--)for(const f of 'abcdefgh'){const sq=f+r,p=checkOnePosition[sq],cell=document.createElement('div');cell.dataset.square=sq;cell.className='checkone-cell '+((8-r+'abcdefgh'.indexOf(f))%2?'dark':'light')+(checkOneSelected===sq?' selected':'');if(p)cell.innerHTML=pieceSvgMarkup(p);if(checkOneSelected&&checkOneLegal(checkOnePosition[checkOneSelected],checkOneSelected,sq,checkOnePosition))cell.insertAdjacentHTML('beforeend',p?'<span class="checkone-ring"></span>':'<span class="checkone-dot"></span>');if(f==='a')cell.insertAdjacentHTML('beforeend','<span class="checkone-coord checkone-rank">'+r+'</span>');if(r===1)cell.insertAdjacentHTML('beforeend','<span class="checkone-coord checkone-file">'+f+'</span>');cell.onclick=()=>checkOneClick(sq);board.appendChild(cell);}const stars=document.getElementById('checkOneStars');stars.innerHTML='';CHECK_ONE_TASKS.forEach((_,i)=>{const b=document.createElement('button');b.textContent=(checkOneDone.has(i)?'⭐':'☆')+' '+(i+1);b.className=i===checkOneIndex?'active':'';b.onclick=()=>checkOneOpen(i);stars.appendChild(b);});}
function checkOneBlackCapture(pos,square){
  // Chỉ chấp nhận đòn chiếu nếu quân vừa đi không thể bị quân đen ăn ngay.
  // Kiểm tra đường đi, vật cản và cả quân Tốt đen theo hướng xuống.
  for(const from of Object.keys(pos)){
    const piece=pos[from];
    if(!piece||piece!==piece.toLowerCase())continue;
    if(piece==='p'){
      const [fx,fy]=captureCoordinates(from),[tx,ty]=captureCoordinates(square);
      if(Math.abs(tx-fx)!==1||ty!==fy-1)continue;
    }else if(!captureCanAttack(piece,from,square,pos))continue;
    // Mọi nước đáp trả của Đen đều phải giải quyết được tình trạng Vua đang bị chiếu.
    // Đặc biệt Mã/Xe/Tượng/Hậu không được ăn quân chiếu nếu Vua vẫn bị quân khác chiếu.
    const after={...pos};delete after[from];after[square]=piece;
    if(checkOneIsCheck(after))continue;
    return from;
  }
  return null;
}
function checkOneClick(sq){
  if(checkOneSolved||checkOneFailed)return;
  const p=checkOnePosition[sq];
  if(!checkOneSelected){if(p&&p===p.toUpperCase()){checkOneSelected=sq;checkOneRender();}return;}
  const from=checkOneSelected,moving=checkOnePosition[from];
  if(sq===from){checkOneSelected=null;checkOneRender();return;}
  if(p&&p===p.toUpperCase()){checkOneSelected=sq;checkOneRender();return;}
  if(!checkOneLegal(moving,from,sq,checkOnePosition)){checkOneSelected=null;checkOneRender();return;}
  const next={...checkOnePosition};delete next[from];next[sq]=moving;
  checkOneLastMove={from,to:sq};checkOneSelected=null;
  const fb=document.getElementById('checkOneFeedback');fb.hidden=false;
  if(!checkOneIsCheck(next)){
    // Một bài chỉ có một lượt: chưa chiếu được Vua là sai và phải làm lại.
    checkOnePosition=next;checkOneFailed=true;
    fb.className='checkone-feedback';
    fb.textContent='❌ Sai! Nước đi chưa chiếu được Vua đen. Nhấn “↻ Thử lại” để làm lại bài.';
    document.getElementById('checkOneInstruction').textContent='Nước đi chưa tạo được thế chiếu. Hãy thử lại từ vị trí ban đầu!';
  }else{
    const attacker=checkOneBlackCapture(next,sq);
    if(attacker){
      // Phản hồi ngay bằng nước ăn quân thực tế của đen, đồng bộ cả hai máy.
      next[sq]=next[attacker];delete next[attacker];checkOneLastMove={from:attacker,to:sq};
      checkOnePosition=next;checkOneFailed=true;
      fb.className='checkone-feedback';
      fb.textContent='❌ Sai! Quân đen '+attacker+' đã ăn quân vừa chiếu tại '+sq+'. Nhấn “Thử lại” để làm lại bài.';
      document.getElementById('checkOneInstruction').textContent='Quân chiếu bị đối phương ăn lại. Hãy tìm nước chiếu an toàn hơn!';
    }else{
      checkOnePosition=next;checkOneSolved=true;checkOneDone.add(checkOneIndex);accountSaveProgress('checkone_'+checkOneIndex,true,1);
      fb.className='checkone-feedback good';
      fb.textContent='✅ Chính xác! Em đã chiếu Vua đen trong 1 nước mà không bị ăn lại!';
      document.getElementById('checkOneInstruction').textContent='Hoàn thành! Hãy thử bài tiếp theo.';
    }
  }
  checkOneRender();vqcPublishCheckOne();
}
function vqcPublishCheckOne(){if(typeof vqcExerciseWrite!=='function'||!roomRef||vqcApplyingExercise||vqcNavApplying)return;vqcExerciseWrite('checkOneExercise',{index:checkOneIndex,position:{...checkOnePosition},solved:checkOneSolved,failed:checkOneFailed,lastMove:checkOneLastMove,done:[...checkOneDone],instruction:document.getElementById('checkOneInstruction').textContent,feedback:document.getElementById('checkOneFeedback').textContent,feedbackClass:document.getElementById('checkOneFeedback').className,feedbackHidden:document.getElementById('checkOneFeedback').hidden});}
function vqcReceiveCheckOne(d){if(!d||d.clientId===vqcExerciseClientId||!d.position||!Number.isInteger(d.index)||d.index<0||d.index>=CHECK_ONE_TASKS.length)return;const key=JSON.stringify(d);if(key===vqcCheckOneLastReceived)return;vqcCheckOneLastReceived=key;vqcApplyingExercise=true;try{checkOneIndex=d.index;checkOnePosition={...d.position};checkOneLastMove=d.lastMove||null;checkOneSelected=null;checkOneSolved=!!d.solved;checkOneFailed=!!d.failed;checkOneDone.clear();(d.done||[]).forEach(x=>{if(Number.isInteger(x)&&x>=0&&x<CHECK_ONE_TASKS.length)checkOneDone.add(x)});document.getElementById('checkOneInstruction').textContent=d.instruction||'Đe dọa Vua đen bằng một nước đi!';const fb=document.getElementById('checkOneFeedback');fb.textContent=d.feedback||'';fb.className=d.feedbackClass||'checkone-feedback';fb.hidden=!!d.feedbackHidden;if(document.getElementById('checkOneOverlay').classList.contains('open'))checkOneRender();}finally{vqcApplyingExercise=false;}}
