
// Tái hiện các thế cờ Hình 43–50. Chấm trắng: Trắng đi; chấm đen: Đen đi.
const FREE_CAPTURE_TASKS=[
 {number:43,turn:'w',pieces:{e8:'r',g8:'k',b7:'p',f7:'p',g7:'p',c6:'p',d6:'n',h4:'P',f3:'B',g3:'P',b2:'P',f2:'P',g2:'K',d1:'R'}},
 {number:44,turn:'w',pieces:{a8:'r',f7:'k',g7:'p',f6:'p',d5:'b',a4:'p',a3:'P',c3:'N',g3:'P',f2:'P',e1:'R',g1:'K'}},
 {number:45,turn:'b',pieces:{e8:'n',g8:'k',b7:'p',f7:'q',g7:'b',h7:'p',c6:'p',c5:'Q',h5:'N',h3:'P',b3:'P',a2:'P',g2:'P',h2:'K',f1:'B'}},
 {number:46,turn:'b',pieces:{d8:'r',f8:'b',g8:'k',f7:'N',g7:'p',h7:'p',b6:'p',c6:'p',b4:'P',c3:'P',f2:'P',g2:'P',h2:'P',e1:'R',g1:'K'}},
 {number:47,turn:'b',pieces:{a8:'r',d6:'k',a5:'p',d5:'p',d4:'P',e4:'n',c3:'P',g3:'P',d2:'B',g2:'K',c1:'R'}},
 {number:48,turn:'w',pieces:{h8:'k',e7:'q',g7:'p',c6:'p',h6:'r',a5:'r',b5:'p',h3:'P',c2:'P',d2:'Q',g2:'P',d1:'R',f1:'R',g1:'K'}},
 {number:49,turn:'b',pieces:{a8:'r',e8:'k',h8:'r',b7:'p',e7:'q',f7:'p',g7:'p',h7:'p',a6:'p',c6:'n',f6:'n',b5:'B',c5:'b',e5:'p',e4:'P',f3:'N',a2:'P',b2:'P',c2:'Q',f2:'P',g2:'P',h2:'P',a1:'R',c1:'B',e1:'K',h1:'R'}},
 {number:50,turn:'w',pieces:{a8:'r',d8:'r',g8:'k',c7:'q',e7:'b',f7:'p',h7:'p',c6:'p',d6:'N',g6:'p',a5:'p',b5:'p',e5:'P',e4:'b',f4:'P',h4:'n',a3:'P',c3:'B',b2:'P',c2:'P',e2:'B',f2:'Q',g2:'P',h2:'P',b1:'K',d1:'R',h1:'R'}}
];
let freeCaptureIndex=0,freeCapturePosition={},freeCaptureSelected=null,freeCaptureSolved=false,freeCaptureFailed=false,freeCaptureBusy=false,freeCaptureReply=null,freeCaptureTimer=null;
const freeCaptureDone=new Set();
function freeCaptureOpen(i){
 vqcCloseOtherViews('freecapture');freeCaptureIndex=(i+FREE_CAPTURE_TASKS.length)%FREE_CAPTURE_TASKS.length;
 document.getElementById('freeCaptureOverlay').classList.add('open');freeCaptureReset();vqcBroadcastView('freecapture',freeCaptureIndex);
}
function freeCaptureClose(){if(freeCaptureTimer){clearTimeout(freeCaptureTimer);freeCaptureTimer=null;}freeCaptureBusy=false;document.getElementById('freeCaptureOverlay').classList.remove('open');vqcBroadcastView('board');}
function freeCaptureReset(){if(freeCaptureTimer){clearTimeout(freeCaptureTimer);freeCaptureTimer=null;}freeCapturePosition={...FREE_CAPTURE_TASKS[freeCaptureIndex].pieces};freeCaptureSelected=null;freeCaptureSolved=false;freeCaptureFailed=false;freeCaptureBusy=false;freeCaptureReply=null;
 const task=FREE_CAPTURE_TASKS[freeCaptureIndex];document.getElementById('freeCaptureInstruction').textContent='Hình '+task.number+' · Lượt '+(task.turn==='w'?'Trắng':'Đen')+' đi. Hãy ăn một quân đối phương không được quân khác bảo vệ.';
 const fb=document.getElementById('freeCaptureFeedback');fb.hidden=true;fb.textContent='';fb.className='freecapture-feedback';freeCaptureRender();vqcPublishFreeCapture();}
function freeCaptureIsOwn(p){const white=FREE_CAPTURE_TASKS[freeCaptureIndex].turn==='w';return !!p&&(p===p.toUpperCase())===white;}
function freeCaptureSafeCapture(from,to){const moving=freeCapturePosition[from],target=freeCapturePosition[to];if(!moving||!target||freeCaptureIsOwn(target)||target.toLowerCase()==='k')return false;
 if(!vqcExerciseLegalMove(moving,from,to,freeCapturePosition))return false;
 const next={...freeCapturePosition};delete next[from];next[to]=moving;
 return !Object.keys(next).some(sq=>sq!==to&&next[sq]&&!freeCaptureIsOwn(next[sq])&&captureCanAttack(next[sq],sq,to,next));
}
function freeCaptureSolutions(){const sol=[];for(const from of Object.keys(freeCapturePosition)){if(!freeCaptureIsOwn(freeCapturePosition[from]))continue;for(const to of Object.keys(freeCapturePosition)){if(freeCaptureSafeCapture(from,to))sol.push([from,to]);}}return sol;}
function freeCaptureRender(){const board=document.getElementById('freeCaptureBoard');board.innerHTML='';const blackBottom=FREE_CAPTURE_TASKS[freeCaptureIndex].turn==='b';const ranks=blackBottom?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];const files=blackBottom?'hgfedcba':'abcdefgh';for(const rank of ranks){for(const file of files){
 const sq=file+rank,cell=document.createElement('div');cell.className='freecapture-cell '+(((8-rank+'abcdefgh'.indexOf(file))%2)===0?'light':'dark')+(freeCaptureSelected===sq?' selected':'');
 if(freeCapturePosition[sq])cell.innerHTML=pieceSvgMarkup(freeCapturePosition[sq]);
 if(freeCaptureSelected&&vqcExerciseLegalMove(freeCapturePosition[freeCaptureSelected],freeCaptureSelected,sq,freeCapturePosition)){
 const hint=document.createElement('span');hint.className=freeCapturePosition[sq]?'capture-take-ring':'capture-move-dot';cell.appendChild(hint);}
 if(file===(blackBottom?'h':'a'))cell.insertAdjacentHTML('beforeend','<span class="freecapture-coord freecapture-rank">'+rank+'</span>');
 if(rank===(blackBottom?8:1))cell.insertAdjacentHTML('beforeend','<span class="freecapture-coord freecapture-file">'+file+'</span>');
 cell.onclick=()=>freeCaptureClick(sq);board.appendChild(cell);
 }}const numbers=document.getElementById('freeCaptureNumbers');numbers.innerHTML='';FREE_CAPTURE_TASKS.forEach((t,i)=>{const b=document.createElement('button');b.className=i===freeCaptureIndex?'active':'';b.textContent=(freeCaptureDone.has(i)?'⭐ ':'')+t.number;b.onclick=()=>freeCaptureOpen(i);numbers.appendChild(b);});}
function freeCaptureClick(sq){if(freeCaptureSolved||freeCaptureFailed||freeCaptureBusy)return;const p=freeCapturePosition[sq];if(freeCaptureIsOwn(p)){freeCaptureSelected=sq;freeCaptureRender();return;}if(!freeCaptureSelected)return;
 const from=freeCaptureSelected,moving=freeCapturePosition[from],target=freeCapturePosition[sq];freeCaptureSelected=null;
 if(!vqcExerciseLegalMove(moving,from,sq,freeCapturePosition)){freeCaptureFeedback('Nước đi không hợp lệ theo luật cờ vua. Em hãy chọn lại.','bad');freeCaptureRender();return;}
 if(!target){freeCaptureFeedback('Bài này yêu cầu ăn quân đối phương. Hãy tìm quân có thể ăn.','bad');freeCaptureRender();return;}
 const safe=freeCaptureSafeCapture(from,sq);freeCapturePosition[sq]=moving;delete freeCapturePosition[from];
 if(safe){
  freeCaptureSolved=true;freeCaptureDone.add(freeCaptureIndex);
  accountSaveProgress('freecapture_'+freeCaptureIndex,true,1);
  freeCaptureFeedback('✅ Chính xác! '+from+' → '+sq+': Em đã ăn quân không được bảo vệ.','good');
  freeCaptureRender();vqcPublishFreeCapture();return;
 }
 // Giống bài Ăn quân: cho đối phương đáp trả thật trên bàn cờ, rồi báo Giải sai.
 const attacker=Object.keys(freeCapturePosition).find(other=>other!==sq&&freeCapturePosition[other]&&!freeCaptureIsOwn(freeCapturePosition[other])&&captureCanAttack(freeCapturePosition[other],other,sq,freeCapturePosition));
 if(!attacker){
  freeCaptureFailed=true;freeCaptureFeedback('Giải sai! Nước ăn này chưa đáp ứng yêu cầu. Nhấn Thử lại để làm lại.','bad');
  freeCaptureRender();vqcPublishFreeCapture();return;
 }
 freeCaptureBusy=true;
 freeCaptureFeedback('Hãy quan sát nước đáp trả của quân đối phương…','bad');
 freeCaptureRender();vqcPublishFreeCapture();
 freeCaptureTimer=setTimeout(()=>{
  freeCaptureTimer=null;
  if(!freeCaptureBusy)return;
  freeCapturePosition[sq]=freeCapturePosition[attacker];delete freeCapturePosition[attacker];
  freeCaptureReply={from:attacker,to:sq};
  freeCaptureFailed=true;freeCaptureBusy=false;
  freeCaptureFeedback('❌ Giải sai! Quân đối phương đã ăn lại quân của em ('+attacker+' → '+sq+'). Nhấn Thử lại để làm lại.','bad');
  freeCaptureRender();vqcPublishFreeCapture();
 },650);
}
function freeCaptureFeedback(msg,type){const fb=document.getElementById('freeCaptureFeedback');fb.hidden=false;fb.className='freecapture-feedback '+type;fb.textContent=msg;}
function freeCaptureShowHint(){const solutions=freeCaptureSolutions();const fb=document.getElementById('freeCaptureFeedback');fb.hidden=false;fb.className='freecapture-feedback';fb.textContent=solutions.length?'Gợi ý: Hãy quan sát quân ở '+solutions[0][0]+' và đường ăn quân của nó.':'Chưa tìm thấy nước ăn quân không được bảo vệ trong thế cờ này. Hãy kiểm tra lại hình gốc.';}
function vqcPublishFreeCapture(){if(typeof vqcExerciseWrite!=='function'||!roomRef||vqcApplyingExercise||vqcNavApplying||!document.getElementById('freeCaptureOverlay').classList.contains('open'))return;vqcExerciseWrite('freeCaptureExercise',{index:freeCaptureIndex,position:{...freeCapturePosition},solved:freeCaptureSolved,failed:freeCaptureFailed,busy:freeCaptureBusy,reply:freeCaptureReply,done:[...freeCaptureDone],feedback:document.getElementById('freeCaptureFeedback').textContent,feedbackClass:document.getElementById('freeCaptureFeedback').className,feedbackHidden:document.getElementById('freeCaptureFeedback').hidden});}
function vqcReceiveFreeCapture(d){if(!d||d.clientId===vqcExerciseClientId||!Number.isInteger(d.index)||d.index<0||d.index>=FREE_CAPTURE_TASKS.length||!d.position)return;vqcApplyingExercise=true;try{if(freeCaptureTimer){clearTimeout(freeCaptureTimer);freeCaptureTimer=null;}freeCaptureIndex=d.index;freeCapturePosition={...d.position};freeCaptureSolved=!!d.solved;freeCaptureFailed=!!d.failed;freeCaptureBusy=!!d.busy;freeCaptureReply=d.reply||null;freeCaptureSelected=null;freeCaptureDone.clear();(d.done||[]).forEach(i=>freeCaptureDone.add(i));const fb=document.getElementById('freeCaptureFeedback');fb.textContent=d.feedback||'';fb.className=d.feedbackClass||'freecapture-feedback';fb.hidden=!!d.feedbackHidden;if(document.getElementById('freeCaptureOverlay').classList.contains('open'))freeCaptureRender();}finally{vqcApplyingExercise=false;}}
