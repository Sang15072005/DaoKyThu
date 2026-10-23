
/* Đồng bộ trạng thái bài tập trong cùng phòng. Không thay đổi cách vẽ bàn cờ. */
const vqcExerciseClientId=Math.random().toString(36).slice(2)+Date.now();
let vqcApplyingExercise=false;
let vqcCaptureLastReceived='',vqcMate3LastReceived='';
let vqcCapturePublishTimer=null,vqcMate3PublishTimer=null;
function vqcExerciseWrite(field,value){
 if(!roomRef||vqcApplyingExercise||vqcNavApplying)return;
 roomRef.update({[field]:{...value,clientId:vqcExerciseClientId},updatedAt:firebase.firestore.FieldValue.serverTimestamp()})
 .catch(e=>{console.warn('Đồng bộ bài tập thất bại:',e);vqcNotify('Chưa đồng bộ được bài tập. Kiểm tra kết nối phòng.','warning');});
}
function vqcCaptureState(){return {index:captureIndex,position:{...capturePosition},whiteSquare:captureWhiteSquare,solved:captureSolved,busy:captureBusy,reply:captureReply,lastMove:captureLastMove,done:[...captureDone],instruction:document.getElementById('captureInstruction').textContent,feedback:document.getElementById('captureFeedback').innerHTML,feedbackClass:document.getElementById('captureFeedback').className,feedbackHidden:document.getElementById('captureFeedback').hidden};}
function vqcPublishCapture(){
 if(!roomRef||vqcApplyingExercise||vqcNavApplying||!capturePosition||!document.getElementById('captureOverlay').classList.contains('open'))return;
 clearTimeout(vqcCapturePublishTimer);
 vqcCapturePublishTimer=setTimeout(()=>{if(document.getElementById('captureOverlay').classList.contains('open'))vqcExerciseWrite('captureExercise',vqcCaptureState());},80);
}
function vqcReceiveCapture(d){
 if(!d||d.clientId===vqcExerciseClientId||!d.position||!Number.isInteger(d.index)||d.index<0||d.index>=CAPTURE_TASKS.length)return;
 const key=JSON.stringify(d);if(key===vqcCaptureLastReceived)return;
 vqcCaptureLastReceived=key;
 vqcApplyingExercise=true;
 try{
  if(captureTimer){clearTimeout(captureTimer);captureTimer=null;}
  captureIndex=d.index;capturePosition={...d.position};captureWhiteSquare=d.whiteSquare??null;
  captureSolved=!!d.solved;captureBusy=!!d.busy;captureReply=d.reply||null;captureLastMove=d.lastMove||null;captureSelected=null;
  captureDone.clear();(d.done||[]).forEach(x=>{if(Number.isInteger(x))captureDone.add(x);});
  document.getElementById('captureInstruction').textContent=d.instruction||CAPTURE_TASKS[d.index].tip;
  const fb=document.getElementById('captureFeedback');fb.className=d.feedbackClass||'capture-feedback';fb.innerHTML=(d.feedback||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');fb.hidden=!!d.feedbackHidden;
  if(document.getElementById('captureOverlay').classList.contains('open'))captureRender();
 }finally{vqcApplyingExercise=false;}
}
const vqcCaptureOpenOriginal=captureOpen;
captureOpen=function(i){vqcCloseOtherViews('capture');vqcCaptureOpenOriginal(i);vqcBroadcastView('capture',captureIndex);vqcPublishCapture();};
const vqcCaptureCloseOriginal=captureClose;
captureClose=function(){vqcCaptureCloseOriginal();if(!vqcApplyingExercise)vqcBroadcastView('board');};
const vqcCaptureResetOriginal=captureReset;
captureReset=function(){vqcCaptureResetOriginal();vqcPublishCapture();};
const vqcCaptureRenderOriginal=captureRender;
captureRender=function(){vqcCaptureRenderOriginal();vqcPublishCapture();};
// Đáp trả của quân đen chạy trên máy người chơi, trạng thái sau đó được gửi tới máy còn lại.
function vqcMate3State(){return {index:mate3Index,fen:mate3Chess.fen(),white:mate3White,done:mate3Done,history:[...mate3History],message:document.getElementById('mate3Message').textContent};}
function vqcPublishMate3(){
 if(!roomRef||vqcApplyingExercise||vqcNavApplying||!mate3Chess)return;
 clearTimeout(vqcMate3PublishTimer);
 vqcMate3PublishTimer=setTimeout(()=>{if(document.getElementById('mate3Overlay').classList.contains('open'))vqcExerciseWrite('mate3Exercise',vqcMate3State());},100);
}
function vqcReceiveMate3(d){
 if(!d||d.clientId===vqcExerciseClientId||typeof Chess==='undefined'||typeof d.fen!=='string'||!Number.isInteger(d.index)||d.index<0||d.index>=6)return;
 const key=JSON.stringify(d);if(key===vqcMate3LastReceived)return;
 vqcMate3LastReceived=key;
 vqcApplyingExercise=true;
 try{
  mate3Index=d.index;mate3Chess=new Chess(d.fen);mate3White=d.white||0;mate3Done=!!d.done;mate3History=[...(d.history||[])];mate3Selected=null;
  if(document.getElementById('mate3Overlay').classList.contains('open')){
   document.getElementById('mate3Title').textContent='♛ Chiếu hết trong 3 nước — Bài '+(mate3Index+1)+'/6 (Hình '+MATE3_DATA[mate3Index].num+')';
   renderMate3();mate3Message(d.message||'Bàn cờ đang đồng bộ.');
  }
 }catch(e){console.warn('Dữ liệu bài chiếu hết 3 nước không hợp lệ',e);}finally{vqcApplyingExercise=false;}
}
const vqcMate3RenderOriginal=renderMate3;
renderMate3=function(){vqcMate3RenderOriginal();vqcPublishMate3();};
const vqcMate3ResetOriginal=resetMate3;
resetMate3=function(){vqcMate3ResetOriginal();vqcPublishMate3();};
// Khi chuyển bài chiếu hết 2 nước, luôn đồng bộ thế cờ vừa khởi tạo.
const vqcMate2ResetOriginal=mateReset;
mateReset=function(){vqcMate2ResetOriginal();if(!vqcNavApplying)syncMateExercise();};
// Không cho bản snapshot cũ của cùng máy gây nhấp nháy và mất ô đang chọn.
