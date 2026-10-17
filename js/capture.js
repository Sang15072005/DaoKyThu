
// Mỗi thế cờ là một bài tập nhận biết cách ăn quân, không phải ván cờ đầy đủ.
const CAPTURE_TASKS=[
 {pieces:{c3:'R',c7:'p',f7:'p'},from:'c3',tip:'Dùng Xe trắng ăn hết cả 2 quân Tốt đen. Xe đi theo hàng hoặc cột.'},
 {pieces:{f4:'Q',c7:'r',f7:'p'},from:'f4',tip:'Dùng Hậu trắng ăn hết Xe và Tốt đen. Hãy quan sát nguy cơ bị ăn lại.'},
 {pieces:{d3:'B',b5:'r',f7:'r',f5:'p'},from:'d3',tip:'Dùng Tượng trắng ăn hết 3 quân đen. Chú ý các quân Xe có thể ăn lại quân Tượng.'},
 {pieces:{g3:'Q',d5:'n',f7:'b',f6:'p',g5:'p'},from:'g3',tip:'Dùng Hậu trắng ăn hết 4 quân đen. Quan sát các ô bị quân đen tấn công.'},
 {pieces:{f4:'N',d7:'b',c6:'p',f6:'q',d4:'p'},from:'f4',tip:'Dùng Mã trắng ăn hết 4 quân đen bằng những bước nhảy hình chữ L. Tránh bị ăn lại.'}
];
let captureIndex=0,captureSelected=null,captureSolved=false,captureBusy=false,capturePosition=null,captureReply=null,captureTimer=null,captureWhiteSquare=null;
const captureDone=new Set();
function captureOpen(i){
 if(captureTimer)clearTimeout(captureTimer);
 captureIndex=((i%CAPTURE_TASKS.length)+CAPTURE_TASKS.length)%CAPTURE_TASKS.length;
 if(typeof vqcCloseOtherViews==='function')vqcCloseOtherViews('capture');
 captureReset();document.getElementById('captureOverlay').classList.add('open');
 document.getElementById('vqcHomeHero')?.setAttribute('hidden','');
 if(typeof vqcBroadcastView==='function')vqcBroadcastView('capture',captureIndex);
}
function captureClose(){if(captureTimer)clearTimeout(captureTimer);captureTimer=null;captureBusy=false;document.getElementById('captureOverlay').classList.remove('open');if(typeof vqcBroadcastView==='function')vqcBroadcastView('board');}
function captureReset(){
 if(captureTimer)clearTimeout(captureTimer);captureTimer=null;
 captureSelected=null;captureSolved=false;captureBusy=false;captureReply=null;
 capturePosition={...CAPTURE_TASKS[captureIndex].pieces};
 captureWhiteSquare=CAPTURE_TASKS[captureIndex].from;
 document.getElementById('captureInstruction').textContent=CAPTURE_TASKS[captureIndex].tip;
 const fb=document.getElementById('captureFeedback');fb.hidden=true;fb.className='capture-feedback';
 captureRender();vqcPublishCapture();
}
function captureRender(){
 const task=CAPTURE_TASKS[captureIndex],board=document.getElementById('captureBoard');board.innerHTML='';
 for(let rank=8;rank>=1;rank--){for(const file of 'abcdefgh'){
  const sq=file+rank,cell=document.createElement('div');
  cell.className='capture-cell '+(((8-rank+'abcdefgh'.indexOf(file))%2)===0?'light':'dark')+(captureSelected===sq?' selected':'')+(captureReply?.from===sq?' capture-reply-from':'')+(captureReply?.to===sq?' capture-reply-to':'');
  cell.setAttribute('role','button');cell.tabIndex=0;cell.setAttribute('aria-label','Ô '+sq);
  if(capturePosition[sq])cell.innerHTML=pieceSvgMarkup(capturePosition[sq]);
  // Gợi ý các ô hợp lệ theo đúng luật đi của quân trắng và vật cản hiện tại.
  if(captureSelected===captureWhiteSquare && !captureBusy && !captureSolved){
   const moving=capturePosition[captureWhiteSquare],occupant=capturePosition[sq];
   if(moving && vqcExerciseLegalMove(moving,captureWhiteSquare,sq,capturePosition) && !(occupant && occupant===occupant.toUpperCase())){
    const hint=document.createElement('span');
    hint.className=occupant?'capture-take-ring':'capture-move-dot';
    hint.setAttribute('aria-hidden','true');cell.appendChild(hint);
   }
  }
  if(file==='a')cell.insertAdjacentHTML('beforeend','<span class="capture-coordinate capture-rank">'+rank+'</span>');
  if(rank===1)cell.insertAdjacentHTML('beforeend','<span class="capture-coordinate capture-file">'+file+'</span>');
  cell.onclick=()=>captureClick(sq);cell.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();captureClick(sq);}};
  board.appendChild(cell);
 }}
 const stars=document.getElementById('captureStars');stars.innerHTML='';CAPTURE_TASKS.forEach((_,i)=>{
  const b=document.createElement('button');b.textContent=(captureDone.has(i)?'⭐':'☆')+' '+(i+1);
  b.className=i===captureIndex?'active':'';b.onclick=()=>captureOpen(i);stars.appendChild(b);
 });
}
function captureCoordinates(sq){return ['abcdefgh'.indexOf(sq[0]),Number(sq[1])-1];}
function captureCanAttack(piece,from,to,position){
 const [fx,fy]=captureCoordinates(from),[tx,ty]=captureCoordinates(to);
 const dx=tx-fx,dy=ty-fy,ax=Math.abs(dx),ay=Math.abs(dy),kind=piece.toLowerCase();
 if(!dx&&!dy)return false;
 if(kind==='n')return ax===1&&ay===2||ax===2&&ay===1;
 if(kind==='k')return ax<=1&&ay<=1;
 if(kind==='p')return ay===1&&ax===1&&(piece===piece.toLowerCase()?dy===-1:dy===1);
 if(kind==='r'&&dx&&dy)return false;
 if(kind==='b'&&ax!==ay)return false;
 if(kind==='q'&&!(dx===0||dy===0||ax===ay))return false;
 if(!['r','b','q'].includes(kind))return false;
 const sx=Math.sign(dx),sy=Math.sign(dy);
 for(let x=fx+sx,y=fy+sy;x!==tx||y!==ty;x+=sx,y+=sy){
  if(position['abcdefgh'[x]+(y+1)])return false;
 }
 return true;
}

// Không gợi ý các ô Vua không thể đi đến vì đang bị quân đối phương kiểm soát.
function vqcKingDestinationSafe(piece,from,to,pos){
 if(!piece||piece.toLowerCase()!=='k')return true;
 const target=pos[to];
 if(target&&((target===target.toUpperCase())===(piece===piece.toUpperCase())))return false;
 const next={...pos};delete next[from];next[to]=piece;
 const enemyIsLower=piece===piece.toUpperCase();
 return !Object.keys(next).some(sq=>{
  if(sq===to)return false;
  const p=next[sq];if(!p||(p===p.toLowerCase())!==enemyIsLower)return false;
  return captureCanAttack(p,sq,to,next);
 });
}
// Kiểm tra nước DI CHUYỂN khác với ô bị TẤN CÔNG (đặc biệt với Tốt).
function vqcExerciseLegalMove(piece,from,to,pos){
 if(!piece||!from||!to||from===to)return false;
 const target=pos[to],white=piece===piece.toUpperCase();
 if(target&&target.toLowerCase()==='k')return false;
 if(target&&(target===target.toUpperCase())===white)return false;
 const [fx,fy]=captureCoordinates(from),[tx,ty]=captureCoordinates(to);
 if(fx<0||tx<0||fy<0||fy>7||ty<0||ty>7)return false;
 if(piece.toLowerCase()==='p'){
  const dx=tx-fx,dy=ty-fy,forward=white?1:-1,start=white?1:6;
  const straight=dx===0&&!target&&(dy===forward||(fy===start&&dy===2*forward&&!pos[from[0]+(fy+1+forward)]));
  const diagonal=Math.abs(dx)===1&&dy===forward&&!!target;
  if(!straight&&!diagonal)return false;
 }else if(!captureCanAttack(piece,from,to,pos))return false;
 if(piece.toLowerCase()==='k'&&!vqcKingDestinationSafe(piece,from,to,pos))return false;
 // Nếu thế cờ có Vua cùng màu, không được tự đặt Vua vào thế bị chiếu.
 const king=Object.keys(pos).find(sq=>pos[sq]===(white?'K':'k'));
 if(king){
  const next={...pos};delete next[from];next[to]=piece;
  const kingAfter=piece.toLowerCase()==='k'?to:king;
  if(Object.keys(next).some(sq=>{
   const enemy=next[sq];return sq!==kingAfter&&enemy&&(enemy===enemy.toUpperCase())!==white&&captureCanAttack(enemy,sq,kingAfter,next);
  }))return false;
 }
 return true;
}
function captureBlackCountermove(whiteSquare){
 const candidates=Object.keys(capturePosition).filter(sq=>{
  const piece=capturePosition[sq];return piece&&piece===piece.toLowerCase()&&captureCanAttack(piece,sq,whiteSquare,capturePosition);
 });
 // Chọn một quân đen thực sự có thể ăn quân trắng sau nước đi sai.
 return candidates.length?candidates[0]:null;
}
function captureClick(sq){
 if(captureSolved||captureBusy)return;
 const task=CAPTURE_TASKS[captureIndex];
 const whiteFrom=captureWhiteSquare;
 const moving=capturePosition[whiteFrom];
 if(!captureSelected){
  if(sq===whiteFrom){captureSelected=sq;captureRender();}
  else captureHint('Hãy chọn quân trắng trước.');
  return;
 }
 if(sq===whiteFrom){captureSelected=null;captureRender();return;}
 const target=capturePosition[sq];
 // Chỉ cho phép nước đi hợp lệ và không ăn quân cùng màu.
 if(!vqcExerciseLegalMove(moving,whiteFrom,sq,capturePosition)){
  captureSelected=null;
  captureHint('Nước đi chưa hợp lệ. Em hãy chọn nước khác để tiếp tục.');
  captureRender();return;
 }
 const capturedBlack=!!target&&target===target.toLowerCase();
 capturePosition[sq]=moving;delete capturePosition[whiteFrom];
 captureWhiteSquare=sq;captureSelected=null;captureReply=null;
 const remainingBlack=Object.values(capturePosition).filter(p=>p===p.toLowerCase()).length;
 if(remainingBlack===0){
  captureSolved=true;captureDone.add(captureIndex);accountSaveProgress('capture_'+captureIndex,true,1);
  const fb=document.getElementById('captureFeedback');fb.hidden=false;fb.className='capture-feedback good';fb.textContent='✅ Chính xác! Hoàn thành!';
  document.getElementById('captureInstruction').textContent='Xuất sắc! Em đã ăn hết tất cả quân đen. Chọn Bài tiếp để luyện thêm.';
  captureRender();vqcPublishCapture();return;
 }
 captureBusy=true;captureRender();vqcPublishCapture();
 const blackFrom=captureBlackCountermove(sq);
 if(!blackFrom){
  captureBusy=false;
  captureHint('Quân đen chưa thể ăn quân của em. Còn '+remainingBlack+' quân đen — hãy tiếp tục ăn hết!');
  return;
 }
 document.getElementById('captureInstruction').textContent='Hãy quan sát nước đáp trả của quân đen…';
 captureTimer=setTimeout(()=>{
  capturePosition[sq]=capturePosition[blackFrom];delete capturePosition[blackFrom];
  captureWhiteSquare=null;
  captureReply={from:blackFrom,to:sq};captureRender();
  captureWrong('Quân đen đã ăn lại quân trắng! Hãy quan sát ô bị tấn công.');
  document.getElementById('captureInstruction').textContent='Nhấn THỬ LẠI để xếp lại thế cờ.';
  captureBusy=false;captureTimer=null;vqcPublishCapture();
 },650);
}
function captureHint(message){
 const fb=document.getElementById('captureFeedback');
 fb.hidden=true;fb.className='capture-feedback';
 document.getElementById('captureInstruction').textContent=message;
}

function captureWrong(message){
 const fb=document.getElementById('captureFeedback');fb.hidden=false;fb.className='capture-feedback';
 fb.innerHTML='<div>Giải sai!</div><div style="font-size:14px;font-weight:600;margin:6px 10px">'+message+'</div><button type="button" onclick="captureReset()" style="background:white;color:#c93030;border:0;border-radius:9px;padding:9px 16px;margin-top:6px;font-size:20px;font-weight:900;cursor:pointer">THỬ LẠI</button>';
 setTimeout(vqcPublishCapture,0);
}
