
// 8 tình huống phòng thủ từ ảnh tham khảo; mục tiêu là tìm một nước giải nguy.
const DEFENSE_TASKS=[
 {pieces:{a1:'R',a2:'P',d1:'K',d2:'P',e5:'b',f5:'b'},tip:'Xe a1 đang bị Tượng e5 tấn công. Hãy di chuyển Xe ra khỏi đường chéo nguy hiểm.',solutions:['a1c1']},
 {pieces:{c6:'q',f6:'N'},tip:'Mã f6 bị Hậu c6 tấn công theo hàng ngang. Hãy đưa Mã đến ô an toàn.',solutions:['f6g4','f6h5','f6h7','f6g8']},
 {pieces:{a7:'N',d7:'q',g2:'R'},tip:'Mã a7 bị Hậu d7 tấn công. Hãy đưa Xe từ g2 đến a2 để bảo vệ Mã trên cột a.',solutions:['g2a2']},
 {pieces:{b6:'B',c6:'q',c4:'P'},tip:'Hậu đen c6 đang đe dọa cả Tượng b6 và Tốt c4. Hãy tìm một nước để hai quân trắng bảo vệ lẫn nhau.',solutions:['c4c5']},
 {pieces:{b8:'r',f6:'b',a1:'R',a2:'P',c1:'B',d2:'P',f3:'N'},tip:'Xe a1 bị Tượng f6 đe dọa. Hãy tìm nước chặn đòn mà không hy sinh Mã.',solutions:['d2d4']},
 {pieces:{b7:'b',a1:'r',d3:'P',f2:'N',g2:'R',g3:'P',h2:'P'},tip:'Xe đen a1 đe dọa quân trắng. Hãy tìm nước bảo vệ đội quân của mình.',solutions:[]},
 {pieces:{a8:'r',b8:'r',d7:'q',e6:'n',a1:'R',b2:'B',d2:'N',e5:'P',f2:'P',g2:'P',g1:'K',g5:'B',h4:'P',a3:'P'},tip:'Hãy quan sát các mối đe dọa và tìm một nước phòng thủ chủ động.',solutions:['g5f6']},
 {pieces:{d7:'q',b5:'N',f5:'R',c3:'P',d3:'B'},tip:'Hậu đen d7 đang đe dọa các quân trắng. Hãy tìm nước chống lại đòn tấn công.',solutions:['d3e4']}
];

// Bài học 3 — sáu thế cờ phòng thủ quân bị tấn công (Hình 51–56).
// Dấu chấm đen: Đen đi, dấu chấm trắng: Trắng đi.
const DEFENSE_ATTACK_TASKS=[
 {figure:51,side:'b',focus:['d4'],pieces:{d7:'k',g7:'b',b6:'p',f6:'p',h6:'p',b5:'p',d4:'n',c3:'B',a2:'P',d5:'P',e4:'B',f4:'P',d1:'K'},tip:'Hình 51 · Đen đi. Hãy bảo vệ quân đen đang bị tấn công bằng một biện pháp phòng thủ hợp lệ.'},
 {figure:52,side:'w',focus:['f3','d4'],pieces:{b8:'k',d8:'r',a7:'p',b7:'p',b6:'n',c6:'p',f6:'p',g5:'p',e4:'b',a2:'P',d4:'P',e3:'P',f3:'N',d2:'B',f2:'P',h2:'P',g4:'P',e1:'R',g1:'K'},tip:'Hình 52 · Trắng đi. Hãy bảo vệ Mã f3 hoặc Tốt d4 đang bị quân đen tấn công.'},
 {figure:53,side:'b',focus:['d6','c5'],pieces:{a7:'p',c7:'p',e7:'k',h7:'p',d6:'n',f6:'p',g6:'p',c5:'b',a6:'P',a5:'P',d5:'R',b3:'K',f3:'P',h3:'N',g2:'P'},tip:'Hình 53 · Đen đi. Có thể di chuyển, yểm trợ, chặn đòn hoặc phản công để phòng thủ.'},
 {figure:54,side:'b',focus:['a8'],pieces:{a8:'r',b8:'n',h8:'k',a7:'p',d7:'n',g7:'p',h6:'p',d4:'P',e4:'Q',a2:'P',g2:'P',h3:'P',h2:'K'},tip:'Hình 54 · Đen đi. Hậu trắng e4 đang tấn công Xe đen a8. Hãy tìm nước bảo vệ Xe mà không mất quân.'},
 {figure:55,side:'b',focus:['b8','c8','d8'],pieces:{b8:'r',c8:'b',d8:'n',c7:'p',g7:'k',h7:'p',g6:'p',c6:'N',b3:'P',f3:'B',h3:'P',a2:'P',f2:'K',f1:'R'},tip:'Hình 55 · Đen đi. Quan sát quân bị tấn công và tìm một nước phòng thủ phù hợp.'},
 {figure:56,side:'w',focus:['e6','h1'],pieces:{g8:'r',e7:'k',g7:'p',b6:'p',d6:'b',h6:'p',d4:'p',a2:'P',g2:'P',h2:'P',b1:'K',h1:'R',e6:'N',e4:'P'},tip:'Hình 56 · Trắng đi. Tìm một nước giúp quân trắng thoát nguy hiểm hoặc được bảo vệ.'}
];
const DEFENSE_ALL_TASKS=DEFENSE_TASKS.concat(DEFENSE_ATTACK_TASKS);
function defenseCurrentTask(){return DEFENSE_ALL_TASKS[defenseIndex];}
function defenseCurrentSide(){return defenseCurrentTask().side||'w';}
function defenseIsFriendly(piece){return !!piece&&(defenseCurrentSide()==='w'?piece===piece.toUpperCase():piece===piece.toLowerCase());}
function defenseIsEnemy(piece){return !!piece&&!defenseIsFriendly(piece);}
function defenseAttackersOf(sq,pos,enemy){return Object.keys(pos).filter(from=>pos[from]&&(enemy?!defenseIsFriendly(pos[from]):defenseIsFriendly(pos[from]))&&captureCanAttack(pos[from],from,sq,pos));}
function defenseGuardCount(sq,pos){return Object.keys(pos).filter(from=>from!==sq&&pos[from]&&defenseIsFriendly(pos[from])&&captureCanAttack(pos[from],from,sq,pos)).length;}
// Giá trị quân dùng để loại nước phòng thủ làm mất quân lớn vì quân nhỏ.
// Ví dụ Hình 52: Mã f3-e5 được Tốt d4 bảo vệ nhưng Tốt đen f6 vẫn ăn
// Mã (3 điểm) để đổi lấy Tốt (1 điểm), không được chấm là phòng thủ thành công.
function defensePieceValue(piece){
 return ({p:1,n:3,b:3,r:5,q:9,k:100})[piece.toLowerCase()]||0;
}
function defenseUnsafeTrade(sq,pos){
 const piece=pos[sq];
 if(!piece)return false;
 const attackers=defenseAttackersOf(sq,pos,true);
 if(!attackers.length)return false;
 const cheapest=Math.min(...attackers.map(from=>defensePieceValue(pos[from])));
 return cheapest<defensePieceValue(piece);
}
function defenseNewTaskAccepted(before,after,from,to){
 const task=defenseCurrentTask();
 // Không công nhận nước đưa quân vào chỗ có thể bị quân rẻ hơn ăn ngay.
 if(defenseUnsafeTrade(to,after))return false;
 // Hình 54: Mã d7-b6 yểm trợ Xe a8. Mã b8-c6 chỉ chắn đòn
 // nhưng Hậu e4 có thể ăn Mã c6, nên không được tính là đáp án đúng.
 if(task.figure===54)return from==='d7'&&to==='b6'&&defenseGuardCount('a8',after)>defenseGuardCount('a8',before);
 const threatened=(task.focus||[]).filter(sq=>before[sq]&&defenseIsFriendly(before[sq])&&defenseAttackersOf(sq,before,true).length);
 for(const sq of threatened){
  const dest=sq===from?to:sq;
  if(after[dest]!==before[sq])continue;
  const afterAttack=defenseAttackersOf(dest,after,true);
  if(!afterAttack.length)return true;
  // Có quân yểm trợ vẫn không đủ nếu đối phương dùng quân ít điểm hơn để ăn.
  if(defenseUnsafeTrade(dest,after))continue;
  if(defenseGuardCount(dest,after)>defenseGuardCount(sq,before))return true;
 }
 return false;
}
function defenseTaskRange(){return defenseIndex<DEFENSE_TASKS.length?[0,DEFENSE_TASKS.length]:[DEFENSE_TASKS.length,DEFENSE_ALL_TASKS.length];}
function defenseOpenNew(i=0){defenseOpen(DEFENSE_TASKS.length+i);}

let defenseIndex=0,defensePosition={},defenseSelected=null,defenseSolved=false,defenseThreats=false;
const defenseDone=new Set();let vqcDefenseLastReceived='';
function defenseOpen(i){defenseIndex=((i%DEFENSE_ALL_TASKS.length)+DEFENSE_ALL_TASKS.length)%DEFENSE_ALL_TASKS.length;vqcCloseOtherViews('defense');defenseReset();document.getElementById('defenseOverlay').classList.add('open');document.getElementById('vqcHomeHero')?.setAttribute('hidden','');vqcBroadcastView('defense',defenseIndex);vqcPublishDefense();}
function defenseClose(){document.getElementById('defenseOverlay').classList.remove('open');vqcBroadcastView('board');}
function defenseReset(){defensePosition={...defenseCurrentTask().pieces};defenseSelected=null;defenseSolved=false;defenseThreats=false;document.getElementById('defenseInstruction').textContent=defenseCurrentTask().tip;document.getElementById('defenseFeedback').hidden=true;defenseRender();vqcPublishDefense();}
function defenseShowThreats(){defenseThreats=!defenseThreats;defenseRender();}
function defenseRender(){
 const board=document.getElementById('defenseBoard');board.innerHTML='';
 const black=defenseCurrentSide()==='b';
 const ranks=black?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
 const files=black?'hgfedcba':'abcdefgh';
 for(const r of ranks)for(const f of files){
  const sq=f+r,p=defensePosition[sq],cell=document.createElement('div');
  cell.className='defense-cell '+(('abcdefgh'.indexOf(f)+r)%2?'dark':'light')+(defenseSelected===sq?' selected':'');
  if(p)cell.innerHTML=pieceSvgMarkup(p);
  if(defenseSelected&&defensePosition[defenseSelected]&&vqcExerciseLegalMove(defensePosition[defenseSelected],defenseSelected,sq,defensePosition)&&(!p||defenseIsEnemy(p)))cell.insertAdjacentHTML('beforeend',p?'<span class="capture-take-ring"></span>':'<span class="capture-move-dot"></span>');
  if(defenseThreats&&p&&defenseIsFriendly(p)&&defenseAttackersOf(sq,defensePosition,true).length)cell.style.boxShadow='inset 0 0 0 5px #e14d55';
  if(f===files[0])cell.insertAdjacentHTML('beforeend','<span class="capture-coordinate capture-rank">'+r+'</span>');
  if(r===ranks[7])cell.insertAdjacentHTML('beforeend','<span class="capture-coordinate capture-file">'+f+'</span>');
  cell.onclick=()=>defenseClick(sq);board.appendChild(cell);
 }
 const stars=document.getElementById('defenseStars');stars.innerHTML='';
 const [first,last]=defenseTaskRange();
 for(let i=first;i<last;i++){
  const b=document.createElement('button');b.textContent=(defenseDone.has(i)?'⭐':'☆')+' '+(i-first+1);
  b.className=i===defenseIndex?'active':'';b.onclick=()=>defenseOpen(i);stars.appendChild(b);
 }
 const title=document.getElementById('defenseTitle');if(title)title.textContent=defenseIndex<DEFENSE_TASKS.length?'🛡️ Phòng thủ — 8 bài tập':'🛡️ Phòng thủ quân bị tấn công — Hình 51–56';
}

function defenseBlackAttackers(sq,pos){return Object.keys(pos).filter(from=>{const p=pos[from];return p&&p===p.toLowerCase()&&captureCanAttack(p,from,sq,pos);});}
// Đánh giá theo hiệu quả phòng thủ, không giới hạn trong một danh sách nước mẫu.
function defenseWhiteDefenders(sq,pos){
 return Object.keys(pos).filter(from=>from!==sq&&pos[from]&&pos[from]===pos[from].toUpperCase()&&captureCanAttack(pos[from],from,sq,pos));
}
function defenseFocusSquares(pos){
 // Quân cần bảo vệ của từng tình huống; các quân phụ vẫn có thể dùng để yểm trợ.
 const focus=[['a1'],['f6'],['a7'],['b6','c4'],['a1'],['g2','f2','h2','d3'],['d2','g5','b2'],['b5','f5','d3']][defenseIndex]||[];
 return focus.filter(sq=>pos[sq]&&pos[sq]===pos[sq].toUpperCase());
}
function defenseIsSuccessful(before,after,from,to){
 // Bài 5: Không hy sinh Mã 3 điểm để chắn đường Tượng đang tấn công Xe.
 // Chỉ chấp nhận đưa Xe từ a1 tới c1, nơi Xe thoát đòn và không mất Mã.
 if(defenseIndex===4){
  return from==='d2'&&to==='d4'&&after.c1==='B'&&after.a1==='R'&&after.d4==='P'&&after.f3==='N'&&
    defenseBlackAttackers('a1',after).length===0&&defenseWhiteDefenders('d4',after).includes('f3');
 }
 // Bài 4: Tốt c5 bảo vệ Tượng b6 và Tượng b6 bảo vệ Tốt c5.
 // Không chấp nhận chỉ di chuyển Tượng để thoát đòn mà bỏ Tốt không được bảo vệ.
 if(defenseIndex===3){
  return from==='c4'&&to==='c5'&&after.b6==='B'&&after.c5==='P'&&
    defenseWhiteDefenders('b6',after).includes('c5')&&
    defenseWhiteDefenders('c5',after).includes('b6');
 }
 const focus=defenseFocusSquares(before);
 for(const oldSq of focus){
  const piece=before[oldSq];
  const newSq=oldSq===from?to:oldSq;
  if(after[newSq]!==piece)continue;
  const oldAttackers=defenseBlackAttackers(oldSq,before);
  if(!oldAttackers.length)continue;
  const newAttackers=defenseBlackAttackers(newSq,after);
  if(!newAttackers.length)return true; // thoát đòn, chắn hoặc ăn quân đe dọa
  const oldGuards=defenseWhiteDefenders(oldSq,before);
  const newGuards=defenseWhiteDefenders(newSq,after);
  // Chấp nhận yểm trợ thực sự, kể cả khi quân bảo vệ được di chuyển
  // từ một ô khác, nhưng không chấp nhận nước không tăng khả năng bảo vệ.
  if(newGuards.length>oldGuards.length)return true;
  if(!oldGuards.length&&newGuards.length)return true;
 }
 return false;
}
function defenseClick(sq){
 if(defenseSolved)return;
 const p=defensePosition[sq];
 if(!defenseSelected){if(defenseIsFriendly(p)){defenseSelected=sq;defenseRender();}return;}
 const from=defenseSelected,moving=defensePosition[from];
 if(sq===from){defenseSelected=null;defenseRender();return;}
 if(defenseIsFriendly(p)){defenseSelected=sq;defenseRender();return;}
 if(!vqcExerciseLegalMove(moving,from,sq,defensePosition)){defenseSelected=null;defenseRender();return;}
 const before={...defensePosition};
 const next={...before};delete next[from];next[sq]=moving;
 // Chặn riêng ở bước chấm: không bao giờ công nhận một quân vừa đi
 // nếu quân ít điểm hơn của đối phương có thể ăn ngay, kể cả khi có yểm trợ.
 const unsafeMove=defenseIndex>=DEFENSE_TASKS.length&&defenseUnsafeTrade(sq,next);
 const accepted=!unsafeMove&&(defenseIndex<DEFENSE_TASKS.length?defenseIsSuccessful(before,next,from,sq):defenseNewTaskAccepted(before,next,from,sq));
 defensePosition=next;defenseSelected=null;
 const fb=document.getElementById('defenseFeedback');fb.hidden=false;
 if(accepted){
  defenseSolved=true;defenseDone.add(defenseIndex);accountSaveProgress('defense_'+defenseIndex,true,1);
  fb.className='defense-feedback good';
  fb.textContent=defenseIndex===4?'✅ Chính xác! Tốt d2-d4 chắn đòn Tượng và Mã f3 bảo vệ Tốt.':defenseIndex===3?'✅ Chính xác! Tốt c5 bảo vệ Tượng b6 và Tượng b6 bảo vệ Tốt c5. Hai quân cùng được yểm trợ.':'✅ Phòng thủ thành công! Em đã bảo vệ hoặc giải nguy cho quân bị tấn công.';
  document.getElementById('defenseInstruction').textContent='Hoàn thành! Chọn bài tiếp theo để luyện tập.';
 }else{
  fb.className='defense-feedback';
  fb.innerHTML=unsafeMove
   ?(defenseIndex===10&&from==='d6'&&sq==='b7'
      ?'❌ Giải sai! Mã đen ở b7 sẽ bị Tốt trắng a6 ăn. Không được đổi Mã (3 điểm) lấy Tốt (1 điểm). <button onclick="defenseReset()">↻ Thử lại</button>'
      :'❌ Giải sai! Quân vừa đi có thể bị quân ít điểm hơn ăn ngay, khiến em thiệt quân. <button onclick="defenseReset()">↻ Thử lại</button>')
   :defenseIndex===4?'❌ Chưa đúng! Đưa Mã lên chắn sẽ bị Tượng ăn và mất Mã 3 điểm. Hãy tìm cách đưa Xe thoát đòn mà không thiệt quân. <button onclick="defenseReset()">↻ Thử lại</button>':defenseIndex===3?'❌ Chưa đúng! Cần bảo vệ đồng thời cả Tượng và Tốt. <button onclick="defenseReset()">↻ Thử lại</button>':'❌ Sai! Nước đi chưa bảo vệ được quân đang bị đe dọa. <button onclick="defenseReset()">↻ Thử lại</button>';
 }
 defenseRender();vqcPublishDefense();
}
function vqcPublishDefense(){if(typeof vqcExerciseWrite!=='function'||!roomRef||vqcApplyingExercise||vqcNavApplying)return;vqcExerciseWrite('defenseExercise',{index:defenseIndex,position:{...defensePosition},solved:defenseSolved,done:[...defenseDone],instruction:document.getElementById('defenseInstruction').textContent,feedback:document.getElementById('defenseFeedback').innerHTML,feedbackClass:document.getElementById('defenseFeedback').className,feedbackHidden:document.getElementById('defenseFeedback').hidden});}
function vqcReceiveDefense(d){if(!d||d.clientId===vqcExerciseClientId||!d.position||!Number.isInteger(d.index)||d.index<0||d.index>=DEFENSE_ALL_TASKS.length)return;const key=JSON.stringify(d);if(key===vqcDefenseLastReceived)return;vqcDefenseLastReceived=key;vqcApplyingExercise=true;try{defenseIndex=d.index;defensePosition={...d.position};defenseSelected=null;defenseSolved=!!d.solved;defenseDone.clear();(d.done||[]).forEach(x=>{if(Number.isInteger(x))defenseDone.add(x)});document.getElementById('defenseInstruction').textContent=d.instruction||DEFENSE_ALL_TASKS[d.index].tip;const fb=document.getElementById('defenseFeedback');fb.innerHTML=d.feedback||'';fb.className=d.feedbackClass||'defense-feedback';fb.hidden=!!d.feedbackHidden;if(document.getElementById('defenseOverlay').classList.contains('open'))defenseRender();}finally{vqcApplyingExercise=false;}}
