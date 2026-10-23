/* Đảo Kỳ Thủ — luyện chiếu hết Vua đơn độc. Uses chess.js legal move generator.
   All six lessons have only a black king against the indicated WHITE material plus king.
   Chess.js handles check, checkmate, stalemate, insufficient material, repetition and 50 moves. */
(function(){
 'use strict';
 const LEVELS=[
  {name:'2 Xe',pieces:'Vua + 2 Xe',fen:'8/8/8/4k3/8/8/8/R3K2R w - - 0 1',
   advice:'Bước đầu, dùng một Xe cắt hàng hoặc cột; Xe còn lại phối hợp thu hẹp vùng di chuyển của Vua đen từng bước. Đừng để Vua đen bắt Xe.'},
  {name:'Hậu và Xe',pieces:'Vua + Hậu + Xe',fen:'8/8/8/4k3/8/8/8/R2QK3 w - - 0 1',
   advice:'Dùng Xe chia bàn cờ rồi phối hợp Hậu để thu hẹp vùng an toàn của Vua đen. Trước nước cuối, kiểm tra Pat và bảo vệ các quân.'},
  {name:'1 Xe',pieces:'Vua + Xe',fen:'8/8/8/3k4/8/8/8/R3K3 w - - 0 1',
   advice:'Dùng Xe cắt ngang hoặc dọc để hạn chế Vua đen từ trung tâm. Tiến Vua trắng đến gần, ép Vua đen ra mép bàn rồi chiếu hết.'},
  {name:'1 Hậu',pieces:'Vua + Hậu',fen:'8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
   advice:'Hậu từng bước thu nhỏ hình chữ nhật an toàn của Vua đen. Đưa Vua trắng đến hỗ trợ; đặc biệt tránh Pat khi Vua đen bị dồn gần góc.'},
  {name:'2 Tượng',pieces:'Vua + 2 Tượng khác màu',fen:'8/8/8/3k4/8/8/8/2B1KB2 w - - 0 1',
   advice:'Hai Tượng khác màu phối hợp khống chế đường chéo. Đưa Vua trắng tiến lên, thu hẹp khoảng trống và dồn Vua đen vào góc.'},
  {name:'Tượng và Mã',pieces:'Vua + Tượng + Mã',fen:'8/8/8/4k3/8/8/8/2B1K1N1 w - - 0 1',
   advice:'Dạng khó nhất: dùng Vua, Tượng và Mã phối hợp khống chế ô, từ từ đuổi Vua đen ra biên rồi chuyển tới góc cùng màu với Tượng.'}
 ];
 const GLYPHS={w:{k:'♔',q:'♕',r:'♖',b:'♗',n:'♘'},b:{k:'♚'}};
 const SQUARES='abcdefgh';
 const $=id=>document.getElementById(id);
 let mode=0,game=null,selected=null,hint=null,isOpen=false,feedback='',syncedSignature='',validationError=null;
 const initial=()=>new Chess(LEVELS[mode].fen);
 function status(){
  if(!game)return {done:true,message:''};
  if(game.in_checkmate())return {done:true,won:game.turn()==='b',message:game.turn()==='b'?'🏆 Chiếu hết! Em đã thắng bằng nước đi hợp lệ.':'Hết ván: bên Đen chiếu hết.'};
  if(game.in_stalemate())return {done:true,won:false,message:'🤝 HÒA PAT! Vua đen không bị chiếu nhưng không còn nước hợp lệ. Hãy thử lại, chừa một ô thoát trước nước chiếu hết.'};
  if(game.insufficient_material())return {done:true,won:false,message:'🤝 Hòa do không đủ lực lượng để chiếu hết (ví dụ chỉ còn một Tượng).'};
  if(game.in_threefold_repetition())return {done:true,won:false,message:'🤝 Hòa vì lặp lại cùng thế cờ ba lần.'};
  if(game.in_draw())return {done:true,won:false,message:'🤝 Hòa theo luật 50 nước không có nước bắt quân hoặc đi Tốt.'};
  return {done:false,won:false,message:game.turn()==='w'?'Trắng đi. Chạm quân, sau đó chạm ô muốn đến.':'Đen đang chọn nước phòng thủ...'};
 }
 function inClass(){return !!(typeof roomRef!=='undefined'&&roomRef);}
 function roleName(){return typeof role!=='undefined'?role:window.accountProfile?.role;}
 function coordDistance(a,b){return Math.max(Math.abs(a.charCodeAt(0)-b.charCodeAt(0)),Math.abs(+a[1]- +b[1]));}
 function edgeDistance(s){const f=s.charCodeAt(0)-97,r=+s[1]-1;return Math.min(f,7-f,r,7-r);}
 function blackKingSquare(){
  if(!game)return null;
  for(let rank=1;rank<=8;rank++)for(const file of SQUARES){
   const sq=file+rank,p=game.get(sq);
   if(p?.color==='b'&&p.type==='k')return sq;
  }
  return null;
 }
 function lessonStage(){
  const sq=blackKingSquare();
  if(!sq)return '';
  const distance=edgeDistance(sq);
  if(distance>=3)return 'Bước 1/4 · Vua đen ở trung tâm: bắt đầu khống chế các đường đi.';
  if(distance===2)return 'Bước 2/4 · Vua đen rời trung tâm: tiếp tục thu hẹp vùng di chuyển.';
  if(distance===1)return 'Bước 3/4 · Vua đen gần mép: phối hợp quân trắng để ép sát biên.';
  return 'Bước 4/4 · Vua đen ở mép: tìm cách chiếu hết, chú ý tránh hòa Pat.';
 }
 function display(){
  if(!game)return;
  const title=$('vqcLoneMateTitle'),sub=$('vqcLoneMateSubtitle'),board=$('vqcLoneMateBoard'),msg=$('vqcLoneMateMessage');
  if(!board)return;
  title.textContent='♚ Chiếu hết Vua đơn độc — '+LEVELS[mode].name;
  sub.textContent='Dạng '+(mode+1)+'/6 · '+LEVELS[mode].pieces+' đối đầu Vua đen · Trắng đi trước';
  $('vqcLoneMateAdvice').textContent=LEVELS[mode].advice;
  const stage=$('vqcLoneMateStage');if(stage)stage.textContent=lessonStage();
  const state=status();
  msg.textContent=feedback||state.message;
  msg.classList.toggle('vqc-lonemate-success',!!state.won);
  msg.classList.toggle('vqc-lonemate-draw',!!(state.done&&!state.won));
  const history=game.history({verbose:true});
  $('vqcLoneMateMoves').textContent='Số nước trắng: '+Math.ceil(history.length/2)+' · Nước gần nhất: '+(history.length?history[history.length-1].san:'—');
  $('vqcLoneMateBack').disabled=history.length===0;
  const next=$('vqcLoneMateNext'),prev=$('vqcLoneMatePrev');
  if(next)next.disabled=inClass()&&roleName()==='student';
  if(prev)prev.disabled=inClass()&&roleName()==='student';
  board.replaceChildren();
  const targets=selected?game.moves({square:selected,verbose:true}).map(m=>m.to):[];
  for(let rank=8;rank>=1;rank--){
   for(let f=0;f<8;f++){
    const square=SQUARES[f]+rank, p=game.get(square),button=document.createElement('button');
    button.type='button';
    const light=((8-rank+f)%2)===0;
    button.className='vqc-lonemate-square '+(light?'light':'dark');
    button.dataset.square=square;
    button.setAttribute('aria-label',square+(p?' '+(p.color==='w'?'quân trắng ':'Vua đen ')+p.type:''));
    if(selected===square)button.classList.add('selected');
    if(targets.includes(square))button.classList.add('legal');
    if(hint?.from===square)button.classList.add('hint-from');
    if(hint?.to===square)button.classList.add('hint-to');
    if(p){
     const piece=document.createElement('span');
     piece.className='vqc-lonemate-piece '+(p.color==='w'?'white':'black');
     if(typeof pieceSvgMarkup==='function'){
      piece.innerHTML=pieceSvgMarkup(p.color==='w'?p.type.toUpperCase():p.type);
     }else{piece.textContent=(GLYPHS[p.color]||{})[p.type]||'?';}
     button.append(piece);
    }
    if(f===0){const label=document.createElement('span');label.className='vqc-lonemate-rank';label.textContent=rank;button.append(label);}
    if(rank===1){const label=document.createElement('span');label.className='vqc-lonemate-file';label.textContent=SQUARES[f];button.append(label);}
    button.addEventListener('click',()=>clickSquare(square));
    board.append(button);
   }
  }
 }
 function evaluateBlackMove(move){
  game.move(move);
  const whiteKingSquare=(()=>{
   for(let i=0;i<8;i++)for(let j=0;j<8;j++){
    const sq=SQUARES[j]+(8-i),p=game.get(sq);if(p&&p.color==='w'&&p.type==='k')return sq;
   }return 'e4';
  })();
  const legalWhite=game.moves({verbose:true});
  let mating=0,checks=0;
  for(const response of legalWhite){
   game.move(response);
   if(game.in_checkmate())mating++;
   else if(game.in_check())checks++;
   game.undo();
   if(mating>1)break;
  }
  const score=(edgeDistance(move.to)*13)
   +Math.min(6,coordDistance(move.to,whiteKingSquare))*4
   +(Math.max(0,6-checks))*0.25
   -(mating?3000+mating*400:0)
   +(move.captured?650:0);
  game.undo();
  return score;
 }
 function defend(){
  if(!game||game.turn()!=='b'||status().done)return;
  const moves=game.moves({verbose:true});
  if(!moves.length)return;
  const ordered=moves.map(m=>({m,score:evaluateBlackMove(m)}))
   .sort((a,b)=>b.score-a.score||a.m.to.localeCompare(b.m.to));
  const chosen=ordered[0]?.m;
  if(chosen)game.move({from:chosen.from,to:chosen.to});
 }
 function clickSquare(square){
  if(!isOpen||!game||status().done)return;
  if(game.turn()!=='w')return;
  const clicked=game.get(square);
  if(clicked?.color==='w'){
   selected=selected===square?null:square;
   hint=null;feedback='';display();return;
  }
  if(!selected)return;
  const options=game.moves({square:selected,verbose:true});
  const move=options.find(m=>m.to===square);
  if(!move){selected=null;feedback='Ô này không phải nước đi hợp lệ. Hãy chọn một quân trắng khác.';display();return;}
  const result=game.move({from:move.from,to:move.to});
  selected=null;hint=null;
  if(!result){feedback='Nước đi không hợp lệ theo luật cờ vua.';display();return;}
  if(!status().done)defend();
  feedback='';display();publish();
 }
 function reset(publishState=true){
  game=initial();selected=null;hint=null;feedback='';syncedSignature='';display();
  if(publishState)publish();
 }
 function open(i=0,remote=false){
  if(typeof Chess!=='function'){alert('Chưa tải được chess.js. Hãy kiểm tra kết nối Internet và tải lại trang.');return;}
  if(validationError){alert('Bài tập chưa vượt qua kiểm tra luật cờ: '+validationError);return;}
  const index=Number(i);
  if(!Number.isInteger(index)||index<0||index>=LEVELS.length)return;
  if(!remote&&inClass()&&roleName()==='student'){
   feedback='Giáo viên điều khiển việc chọn bài trong phòng học.';if(game)display();return;
  }
  mode=index;isOpen=true;
  const overlay=$('vqcLoneMateOverlay');
  if(overlay.parentElement!==document.body)document.body.append(overlay);
  if(typeof vqcCloseOtherViews==='function')vqcCloseOtherViews('lonemate');
  overlay.classList.add('open');
  reset(false);
  if(!remote&&typeof vqcBroadcastView==='function')vqcBroadcastView('lonemate',mode);
  if(!remote)publish();
 }
 function close(){
  isOpen=false;selected=null;hint=null;
  $('vqcLoneMateOverlay').classList.remove('open');
  if(inClass()&&typeof vqcBroadcastView==='function')vqcBroadcastView('board');
 }
 function publish(){
  if(!isOpen||!inClass()||!game||typeof roomRef==='undefined')return;
  const moves=game.history({verbose:true}).map(m=>({from:m.from,to:m.to}));
  const state={mode,moves,stamp:Date.now()+'-'+Math.random().toString(36).slice(2,7)};
  syncedSignature=mode+':'+moves.map(m=>m.from+m.to).join(',');
  roomRef.update({loneKingMateExercise:state})
   .catch(e=>console.warn('Không đồng bộ bài chiếu hết Vua đơn độc:',e));
 }
 function receive(data){
  if(!data||!isOpen||!game||data.mode!==mode||!Array.isArray(data.moves)||data.moves.length>220)return;
  const signature=mode+':'+data.moves.map(m=>String(m.from)+String(m.to)).join(',');
  if(syncedSignature===signature)return;
  const replay=initial();
  for(const m of data.moves){
   if(!m||!(/^[a-h][1-8]$/.test(m.from))||!(/^[a-h][1-8]$/.test(m.to)))return;
   if(!replay.move({from:m.from,to:m.to}))return;
  }
  game=replay;selected=null;hint=null;feedback='';syncedSignature=signature;display();
 }
 function restart(){
  if(inClass()&&roleName()==='student'){feedback='Trong phòng học, giáo viên thực hiện thao tác làm lại bài.';display();return;}
  reset();
 }
 function undo(){
  if(!game||!game.history().length)return;
  if(inClass()&&roleName()==='student'){feedback='Trong phòng học, giáo viên điều khiển hoàn tác.';display();return;}
  game.undo();
  if(game.turn()==='b')game.undo();
  selected=null;hint=null;feedback='';display();publish();
 }
 function suggest(){
  if(!game||status().done||game.turn()!=='w')return;
  const moves=game.moves({verbose:true});
  let best=null,bestScore=-Infinity;
  for(const m of moves){
   game.move(m);
   let val=0;
   if(game.in_checkmate())val=1e6;
   else if(game.in_stalemate()||game.in_draw())val=-1e6;
   else {
    const reply=game.moves({verbose:true});
    const kingSquare=(()=>{
     for(let rank=1;rank<=8;rank++)for(const file of SQUARES){
      const sq=file+rank,p=game.get(sq);
      if(p&&p.color==='b'&&p.type==='k')return sq;
     }return 'e8';
    })();
    val=(3-edgeDistance(kingSquare))*20-reply.length*3;
    const king=game.get(m.to);
    if(king?.type==='k')val+=4;
    if(m.flags?.includes('c'))val+=2;
    if(reply.some(x=>x.captured))val-=200;
   }
   game.undo();
   if(val>bestScore){bestScore=val;best=m;}
  }
  hint=best?{from:best.from,to:best.to}:null;
  selected=null;
  feedback=best?'💡 Gợi ý: '+best.san+' ('+best.from+' → '+best.to+'). Đây là gợi ý chiến thuật, không nhất thiết là đường chiếu hết nhanh nhất.':'';
  display();
 }
 function validateLessons(){
  for(const level of LEVELS){
   const chess=new Chess(level.fen);
   if(chess.turn()!=='w'||chess.in_check()||chess.in_stalemate()||chess.in_checkmate())throw Error('Bài tập không hợp lệ: '+level.name);
   const white=chess.board().flat().filter(p=>p&&p.color==='w'),black=chess.board().flat().filter(p=>p&&p.color==='b');
   if(black.length!==1||black[0].type!=='k'||white.filter(p=>p.type==='k').length!==1)throw Error('Bài tập không có Vua đơn độc: '+level.name);
   const bks=SQUARES.flatMap(file=>[4,5].map(rank=>file+rank)).find(sq=>chess.get(sq)?.color==='b'&&chess.get(sq)?.type==='k');
   if(!['d4','e4','d5','e5'].includes(bks))throw Error('Vua đen không bắt đầu ở trung tâm: '+level.name);
   if(chess.in_draw())throw Error('Bài tập đang hòa ngay từ đầu: '+level.name);
   if(level.name==='2 Tượng'&&white.filter(p=>p.type==='b').length!==2)throw Error('Thiếu Tượng');
  }
  // One legal Pat and one legal checkmate regression case.
  const pat=new Chess('k7/2Q5/2K5/8/8/8/8/8 w - - 0 1');
  if(!pat.move({from:'c7',to:'b6'})||!pat.in_stalemate()||pat.in_checkmate())throw Error('Kiểm tra hòa Pat không đạt');
  const mate=new Chess('k7/8/1QK5/8/8/8/8/8 w - - 0 1');
  if(!mate.move({from:'b6',to:'b7'})||!mate.in_checkmate()||mate.in_stalemate())throw Error('Kiểm tra chiếu hết không đạt');
 }
 function init(){
  if(typeof Chess==='function'){try{validateLessons();}catch(e){validationError=e.message;console.error('Bài chiếu hết Vua đơn độc:',e);}}
  $('vqcLoneMateClose')?.addEventListener('click',close);
  $('vqcLoneMatePrev')?.addEventListener('click',()=>open((mode+LEVELS.length-1)%LEVELS.length));
  $('vqcLoneMateNext')?.addEventListener('click',()=>open((mode+1)%LEVELS.length));
  $('vqcLoneMateRestart')?.addEventListener('click',restart);
  $('vqcLoneMateBack')?.addEventListener('click',undo);
  $('vqcLoneMateHint')?.addEventListener('click',suggest);
  $('vqcLoneMateOverlay')?.addEventListener('click',e=>{if(e.target===$('vqcLoneMateOverlay'))close();});
 }
 window.loneKingMateOpen=open;
 window.loneKingMateClose=close;
 window.loneKingMateReceive=receive;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
