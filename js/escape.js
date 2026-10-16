
// Bảy thế cờ từ thoat-chieu.pdf (trang 1–4). Chữ hoa: trắng, chữ thường: đen.
const ESCAPE_TASKS=[
 {pieces:{e1:'K',e5:'q'},tip:'Vua trắng bị Hậu đen chiếu dọc cột e. Hãy đưa Vua tới ô an toàn.'},
 {pieces:{b4:'K',b2:'q',c7:'n',f6:'b'},tip:'Hậu đen đang chiếu Vua trắng. Hãy tìm một ô Vua không bị tấn công.'},
 {pieces:{h3:'K',a4:'R',g6:'r',h7:'r'},tip:'Vua không có đường chạy an toàn. Hãy dùng Xe trắng ngăn đòn chiếu.'},
 {pieces:{a2:'K',b1:'R',b2:'B',c2:'n',d5:'b',e3:'N'},tip:'Hãy dùng một quân trắng chặn hoặc loại bỏ đòn chiếu Vua.'},
 {pieces:{e1:'K',d1:'Q',f1:'B',g1:'N',d2:'P',e2:'P',f2:'P',e8:'q',f3:'n',g3:'b',h1:'r'},tip:'Quân đen đang tấn công Vua trắng. Hãy tìm một nước hóa giải.'},
 {pieces:{c3:'K',b3:'N',d3:'P',d2:'R',c5:'q',f4:'n',h3:'r',h6:'p'},tip:'Hãy chạy Vua hoặc chặn nước chiếu bằng một nước hợp lệ.'},
 {pieces:{c3:'K',d3:'N',d2:'P',f4:'P',a4:'q',g7:'b'},tip:'Vua trắng bị Hậu đen chiếu. Hãy tìm cách thoát chiếu.'},
 // Hình 63–68, trang sách người dùng cung cấp. Dấu chấm đen = Đen đi, trắng = Trắng đi.
 {turn:'b',figure:63,pieces:{a8:'r',h8:'k',b7:'p',d7:'q',h7:'p',a6:'p',b5:'n',e5:'Q',b3:'B',f3:'P',a2:'P',b2:'p',b1:'K',e1:'R'},tip:'Hình 63 – Đen đi. Hãy hóa giải đòn chiếu vào Vua đen.'},
 {turn:'w',figure:64,pieces:{e8:'k',b7:'p',f7:'p',g7:'p',h7:'p',a6:'p',e6:'r',f6:'n',b4:'b',a2:'P',b2:'P',e2:'N',f2:'P',g2:'P',h2:'P',d1:'N',e1:'K',f1:'R'},tip:'Hình 64 – Trắng đi. Hãy hóa giải đòn chiếu vào Vua trắng.'},
 {turn:'b',figure:65,pieces:{a8:'r',d8:'q',e8:'k',f8:'b',g8:'n',h8:'r',b7:'p',e7:'p',f7:'p',g7:'p',h7:'p',a6:'p',b5:'B',c5:'p',d5:'p',e5:'P',e3:'P',a2:'P',b2:'P',c2:'P',f2:'P',g2:'P',h2:'P',a1:'R',c1:'B',d1:'Q',e1:'K',h1:'R'},tip:'Hình 65 – Đen đi. Hãy bảo vệ Vua đen khỏi đòn chiếu của Tượng.'},
 {turn:'b',figure:66,pieces:{c8:'R',f8:'r',g8:'k',a7:'p',d6:'n',g6:'P',h6:'p',b5:'p',b4:'P',f4:'p',g4:'P',a3:'P',b3:'B',d3:'p',e3:'b',f3:'P',b2:'B',g2:'K',a1:'R',f1:'R'},tip:'Hình 66 – Đen đi. Hãy tìm nước hóa giải thế chiếu Vua đen.'},
 {turn:'w',figure:67,pieces:{a8:'r',f8:'r',g8:'k',a7:'p',c7:'q',f7:'p',g7:'p',h7:'p',b6:'p',c5:'b',h5:'P',c4:'P',b3:'P',f3:'P',a2:'P',b2:'B',f2:'K',d1:'R',g1:'Q',h1:'R'},tip:'Hình 67 – Trắng đi. Hãy cứu Vua trắng khỏi đòn chiếu của Tượng đen.'},
 {turn:'w',figure:68,pieces:{d8:'r',f8:'r',g8:'k',a7:'p',d7:'q',f7:'p',h7:'p',g6:'p',d5:'p',f5:'b',d4:'P',h4:'P',b3:'N',a2:'P',b2:'P',e2:'Q',g2:'P',b1:'K',c1:'R',f1:'R'},tip:'Hình 68 – Trắng đi. Hãy hóa giải đòn chiếu vào Vua trắng.'}
];
let escapeIndex=0,escapePosition={},escapeSelected=null,escapeSolved=false,escapeFailed=false;
let escapeDrag=null,escapeSuppressClickUntil=0;
const escapeDone=new Set();let vqcEscapeLastReceived='';
function escapeTurn(){return ESCAPE_TASKS[escapeIndex].turn==='b'?'b':'w';}
function escapeOwnPiece(piece){return !!piece&&(escapeTurn()==='w'?piece===piece.toUpperCase():piece===piece.toLowerCase());}
function escapeAttacked(pos,sq,byWhite){return Object.keys(pos).some(from=>{const p=pos[from];return p&&((p===p.toUpperCase())===byWhite)&&captureCanAttack(p,from,sq,pos);});}
function escapeInCheck(pos){const white=escapeTurn()==='w',king=Object.keys(pos).find(s=>pos[s]===(white?'K':'k'));return !king||escapeAttacked(pos,king,!white);}
// Riêng bài Thoát chiếu: cho phép thử cả ô Vua bị đối phương kiểm soát.
// Đây chỉ là nước thử để học sinh nhận phản hồi sai, KHÔNG công nhận là nước cờ hợp lệ.
function escapeLegal(piece,from,to,pos){
 if(!escapeOwnPiece(piece)||!from||!to||from===to)return false;
 if(piece.toLowerCase()!=='k')return vqcExerciseLegalMove(piece,from,to,pos);
 const target=pos[to];
 if(target&&(escapeOwnPiece(target)||target.toLowerCase()==='k'))return false;
 return captureCanAttack(piece,from,to,pos);
}
function escapeSafeMove(from,to){const piece=escapePosition[from];if(!escapeLegal(piece,from,to,escapePosition))return false;const next={...escapePosition};delete next[from];next[to]=piece;return !escapeInCheck(next);}
function escapeOpen(i){escapeIndex=(i+ESCAPE_TASKS.length)%ESCAPE_TASKS.length;vqcCloseOtherViews('escape');escapeReset();document.getElementById('escapeOverlay').classList.add('open');document.getElementById('vqcHomeHero')?.setAttribute('hidden','');vqcBroadcastView('escape',escapeIndex);vqcPublishEscape();}
function escapeClose(){document.getElementById('escapeOverlay').classList.remove('open');vqcBroadcastView('board');}
function escapeReset(){escapePosition={...ESCAPE_TASKS[escapeIndex].pieces};escapeSelected=null;escapeSolved=false;escapeFailed=false;document.getElementById('escapeInstruction').textContent=ESCAPE_TASKS[escapeIndex].tip;const fb=document.getElementById('escapeFeedback');fb.hidden=true;fb.textContent='';delete fb.dataset.message;escapeRender();vqcPublishEscape();}
function escapeRender(){const board=document.getElementById('escapeBoard');board.innerHTML='';const king=Object.keys(escapePosition).find(s=>escapePosition[s]===(escapeTurn()==='w'?'K':'k'));const ranks=escapeTurn()==='b'?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1],files=escapeTurn()==='b'?'hgfedcba':'abcdefgh';for(const r of ranks)for(const f of files){const sq=f+r,p=escapePosition[sq],cell=document.createElement('div');cell.dataset.square=sq;cell.className='escape-cell '+((8-r+'abcdefgh'.indexOf(f))%2?'dark':'light')+(escapeSelected===sq?' selected':'')+(sq===king&&escapeInCheck(escapePosition)?' escape-checked':'');if(p)cell.innerHTML=pieceSvgMarkup(p);if(escapeSelected&&escapeLegal(escapePosition[escapeSelected],escapeSelected,sq,escapePosition))cell.insertAdjacentHTML('beforeend',p?'<span class="escape-ring"></span>':'<span class="escape-dot"></span>');if(f===files[0])cell.insertAdjacentHTML('beforeend','<span class="escape-coord escape-rank">'+r+'</span>');if(r===ranks[7])cell.insertAdjacentHTML('beforeend','<span class="escape-coord escape-file">'+f+'</span>');cell.onclick=()=>{if(Date.now()>=escapeSuppressClickUntil)escapeClick(sq);};board.appendChild(cell);}escapeEnableDrag();const stars=document.getElementById('escapeStars');stars.innerHTML='';ESCAPE_TASKS.forEach((_,i)=>{const b=document.createElement('button');b.textContent=(escapeDone.has(i)?'⭐':'☆')+' '+(ESCAPE_TASKS[i].figure||i+1);b.className=i===escapeIndex?'active':'';b.onclick=()=>escapeOpen(i);stars.appendChild(b);});}
// Lichess-style: kéo thả quân, kể cả thử Vua vào ô bị chiếu.
// Nước đi thử sai chỉ dùng trong bài tập, không sửa luật của các chế độ khác.
function escapeEnableDrag(){
 const board=document.getElementById('escapeBoard');
 if(!board||board.dataset.dragReady)return;
 board.dataset.dragReady='1';
 board.addEventListener('pointerdown',e=>{
  if(e.button!==undefined&&e.button!==0||escapeSolved||escapeFailed)return;
  const cell=e.target.closest('.escape-cell'),from=cell?.dataset.square;
  if(!from||!escapeOwnPiece(escapePosition[from]))return;
  escapeDrag={id:e.pointerId,from,x:e.clientX,y:e.clientY,active:false,ghost:null,cell};
 });
 document.addEventListener('pointermove',e=>{
  const d=escapeDrag;
  if(!d||d.id!==e.pointerId)return;
  if(!d.active&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>9){
   d.active=true;
   d.ghost=document.createElement('div');
   d.ghost.className='escape-drag-ghost';
   d.ghost.innerHTML=pieceSvgMarkup(escapePosition[d.from]);
   document.body.appendChild(d.ghost);
   d.cell.classList.add('escape-drag-source');
  }
  if(d.active){
   d.ghost.style.left=e.clientX+'px';
   d.ghost.style.top=e.clientY+'px';
   e.preventDefault();
  }
 },{passive:false});
 document.addEventListener('pointerup',e=>{
  const d=escapeDrag;if(!d||d.id!==e.pointerId)return;
  escapeDrag=null;
  if(d.ghost)d.ghost.remove();
  d.cell.classList.remove('escape-drag-source');
  if(!d.active)return;
  escapeSuppressClickUntil=Date.now()+350;
  const to=document.elementFromPoint(e.clientX,e.clientY)?.closest('.escape-cell')?.dataset.square;
  if(!to||to===d.from)return;
  escapeSelected=d.from;
  escapeClick(to);
 });
 document.addEventListener('pointercancel',e=>{
  if(!escapeDrag||escapeDrag.id!==e.pointerId)return;
  escapeDrag.ghost?.remove();escapeDrag.cell.classList.remove('escape-drag-source');escapeDrag=null;
 });
}
function escapeShowFeedback(fb,message,wrong){
 fb.textContent=message;
 fb.dataset.message=message;
 if(wrong){
  const btn=document.createElement('button');
  btn.type='button';btn.className='escape-retry-btn';btn.textContent='↻ THỬ LẠI';
  btn.onclick=escapeReset;fb.appendChild(btn);
 }
}
function escapeClick(sq){
 if(escapeSolved||escapeFailed)return;
 const p=escapePosition[sq];
 if(!escapeSelected){
  if(escapeOwnPiece(p)){escapeSelected=sq;escapeRender();}
  return;
 }
 const from=escapeSelected,piece=escapePosition[from];
 if(sq===from){escapeSelected=null;escapeRender();return;}
 if(escapeOwnPiece(p)){escapeSelected=sq;escapeRender();return;}
 if(!escapeLegal(piece,from,sq,escapePosition)){
  escapeSelected=null;escapeRender();return;
 }
 escapeSelected=null;
 const fb=document.getElementById('escapeFeedback');fb.hidden=false;
 if(escapeInCheck(escapePosition)&&escapeSafeMove(from,sq)){
  delete escapePosition[from];escapePosition[sq]=piece;
  escapeSolved=true;escapeDone.add(escapeIndex);
  accountSaveProgress('escape_'+escapeIndex,true,1);
  fb.className='escape-feedback good';
  escapeShowFeedback(fb,'✅ Chính xác! Vua '+(escapeTurn()==='w'?'trắng':'đen')+' đã thoát chiếu.',false);
  document.getElementById('escapeInstruction').textContent='Hoàn thành! Hãy thử bài tiếp theo.';
 }else{
  // Giữ nước thử sai trên bàn cờ, báo lỗi và chờ Thử lại như bài tập Lichess.
  delete escapePosition[from];escapePosition[sq]=piece;
  escapeFailed=true;fb.className='escape-feedback wrong';
  escapeShowFeedback(fb,'GIẢI SAI — Vua vẫn bị chiếu. Hãy thử lại!',true);
 }
 escapeRender();vqcPublishEscape();
}
function vqcPublishEscape(){if(typeof vqcExerciseWrite!=='function'||!roomRef||vqcApplyingExercise||vqcNavApplying)return;const fb=document.getElementById('escapeFeedback');vqcExerciseWrite('escapeExercise',{index:escapeIndex,position:{...escapePosition},solved:escapeSolved,failed:escapeFailed,done:[...escapeDone],instruction:document.getElementById('escapeInstruction').textContent,feedback:fb.dataset.message||fb.textContent,feedbackClass:fb.className,feedbackHidden:fb.hidden});}
function vqcReceiveEscape(d){if(!d||d.clientId===vqcExerciseClientId||!d.position||!Number.isInteger(d.index)||d.index<0||d.index>=ESCAPE_TASKS.length)return;const key=JSON.stringify(d);if(key===vqcEscapeLastReceived)return;vqcEscapeLastReceived=key;vqcApplyingExercise=true;try{escapeIndex=d.index;escapePosition={...d.position};escapeSelected=null;escapeSolved=!!d.solved;escapeFailed=!!d.failed;escapeDone.clear();(d.done||[]).forEach(x=>{if(Number.isInteger(x)&&x>=0&&x<ESCAPE_TASKS.length)escapeDone.add(x)});document.getElementById('escapeInstruction').textContent=d.instruction||ESCAPE_TASKS[d.index].tip;const fb=document.getElementById('escapeFeedback');fb.className=d.feedbackClass||'escape-feedback';fb.hidden=!!d.feedbackHidden;escapeShowFeedback(fb,d.feedback||'',escapeFailed);if(document.getElementById('escapeOverlay').classList.contains('open'))escapeRender();}finally{vqcApplyingExercise=false;}}
