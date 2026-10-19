/* Đảo Kỳ Thủ – independent Pawn / Knight arcade, matching classroom rules. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const files='abcdefgh';
const letters={P:'Tốt Trắng',p:'Tốt Đen',N:'Mã Trắng'};
let game=0,mode='computer',human='w',pos={},turn='w',selected='',enPassant='',ended='',last='',moves=0,botTimer=null,open=false,waitingPromotion=null,flipped=false,thinking=false;
const side=p=>p===p.toUpperCase()?'w':'b';
const sq=(x,y)=>files[x]+y;
const coord=s=>[files.indexOf(s[0]),Number(s[1])];
const title=()=>game===0?'Trò chơi Tốt':'Mã chống Tốt';
const isMine=()=>mode==='local'||turn===human;
function setup(){
 clearTimeout(botTimer);botTimer=null;thinking=false;pos={};turn='w';selected='';enPassant='';ended='';last='';moves=0;waitingPromotion=null;flipped=false;
 if(game===0){for(const f of files){pos[f+'2']='P';pos[f+'7']='p';}}
 else{pos.e1='N';for(const f of 'def')pos[f+'7']='p';}
 render();
}
function possible(from,state=pos,who=turn,ep=enPassant){
 const p=state[from];if(!p||side(p)!==who)return [];
 const [x,y]=coord(from),out=[];
 function add(nx,ny,capture=false){if(nx<0||nx>7||ny<1||ny>8)return;const to=sq(nx,ny),target=state[to];if(capture?target&&side(target)!==who:!target)out.push(to);}
 if(p.toLowerCase()==='p'){
  const dir=p==='P'?1:-1;
  add(x,y+dir);
  const first=sq(x,y+dir);
  if(y===(p==='P'?2:7)&&!state[first])add(x,y+dir*2);
  for(const dx of [-1,1]){
   add(x+dx,y+dir,true);
   if(x+dx>=0&&x+dx<8&&ep===sq(x+dx,y+dir)&&!state[ep]&&state[sq(x+dx,y)]===(p==='P'?'p':'P'))out.push(ep);
  }
 }
 if(p.toLowerCase()==='n')for(const [dx,dy] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]){
  const nx=x+dx,ny=y+dy;if(nx<0||nx>7||ny<1||ny>8)continue;
  const target=state[sq(nx,ny)];if(!target||side(target)!==who)out.push(sq(nx,ny));
 }
 return out;
}
function allMoves(who=turn,state=pos,ep=enPassant){
 const out=[];for(const from in state)if(side(state[from])===who)for(const to of possible(from,state,who,ep))out.push({from,to});return out;
}
function move(from,to,promotion){
 const piece=pos[from];if(!piece||side(piece)!==turn||!possible(from).includes(to)||ended||waitingPromotion)return false;
 const captured=pos[to];const epCapture=piece.toLowerCase()==='p'&&from[0]!==to[0]&&!captured&&to===enPassant;
 if(epCapture)delete pos[to[0]+from[1]];
 const oldEnPassant=enPassant;enPassant='';
 if(piece.toLowerCase()==='p'&&Math.abs(Number(to[1])-Number(from[1]))===2)enPassant=from[0]+((Number(to[1])+Number(from[1]))/2);
 delete pos[from];pos[to]=piece;last=from+' → '+to;moves++;
 selected='';
 if(game===1&&captured==='N')ended='🏆 Đen thắng! Ba Tốt đã bắt được Mã.';
 if(game===1&&!Object.values(pos).includes('p'))ended='🏆 Trắng thắng! Mã đã ăn hết ba Tốt.';
 if(piece.toLowerCase()==='p'&&(to[1]==='8'||to[1]==='1')){
  if(game===1){ended='🏆 Đen thắng! Một Tốt đã đến hàng cuối và phong cấp.';}
  else if(promotion){pos[to]=piece==='P'?promotion.toUpperCase():promotion.toLowerCase();ended='🏆 '+(piece==='P'?'Trắng':'Đen')+' thắng! Tốt đã phong cấp thành '+({q:'Hậu',r:'Xe',b:'Tượng',n:'Mã'}[promotion]||'Hậu')+'.';}
  else{waitingPromotion={square:to,color:turn};render();if(mode==='computer'&&turn!==human)botTimer=setTimeout(()=>promote('q'),500);return true;}
 }
 if(!ended){
  turn=turn==='w'?'b':'w';
  if(!allMoves(turn).length)ended='🏁 Ván kết thúc: '+(turn==='w'?'Trắng':'Đen')+' không còn nước đi hợp lệ.';
 }
 render();queueBot();return true;
}
function promote(piece){
 if(!waitingPromotion||!['q','r','b','n'].includes(piece))return;
 const {square,color}=waitingPromotion;
 if(mode==='computer'&&color!==human&&piece!=='q')return;
 pos[square]=color==='w'?piece.toUpperCase():piece;
 waitingPromotion=null;
 ended='🏆 '+(color==='w'?'Trắng':'Đen')+' thắng! Tốt phong cấp thành '+({q:'Hậu',r:'Xe',b:'Tượng',n:'Mã'}[piece])+'.';
 render();
}
function botPick(){
 const options=allMoves();if(!options.length)return null;
 const other=turn==='w'?'b':'w';
 const scores=options.map(m=>{
  const piece=pos[m.from],target=pos[m.to],state={...pos};
  delete state[m.from];state[m.to]=piece;
  let score=Math.random()*3;
  if(target)score+=target.toLowerCase()==='n'?150:40;
  if(piece.toLowerCase()==='p'){
   const advance=piece==='P'?Number(m.to[1])-2:7-Number(m.to[1]);
   score+=advance*3;
   if(m.to[1]==='1'||m.to[1]==='8')score+=500;
   if(m.to[0]!==m.from[0]&&!target)score+=35;
  }else score+=Math.random()*6;
  const threats=allMoves(other,state,'').some(o=>o.to===m.to);
  if(threats)score-=piece.toLowerCase()==='n'?55:15;
  return score;
 });
 let max=Math.max(...scores);const candidates=options.filter((_,i)=>scores[i]>=max-5);
 return candidates[Math.floor(Math.random()*candidates.length)];
}
function queueBot(){
 clearTimeout(botTimer);botTimer=null;
 if(!open||mode!=='computer'||turn===human||ended||waitingPromotion)return;
 thinking=true;render();
 botTimer=setTimeout(()=>{thinking=false;botTimer=null;if(!open||mode!=='computer'||turn===human||ended)return;const choice=botPick();if(choice)move(choice.from,choice.to);},600);
}
function clickSquare(square){
 if(ended||waitingPromotion||thinking||!isMine())return;
 if(selected&&possible(selected).includes(square)){move(selected,square);return;}
 selected=pos[square]&&side(pos[square])===turn?square:'';
 render();
}
function render(){
 if(!open)return;
 const board=$('vqcArcadeBoard');if(!board)return;
 const orientation=mode==='computer'&&human==='b'?!flipped:flipped;
 const f=orientation?'hgfedcba':'abcdefgh',r=orientation?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
 const hints=selected?possible(selected):[];
 board.replaceChildren();
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  const square=f[x]+r[y],cell=document.createElement('button');cell.type='button';
  cell.className='vqc-arcade-cell '+((x+y)%2?'dark':'light')+(selected===square?' selected':'')+(hints.includes(square)?' hint':'');
  cell.setAttribute('aria-label',square+(pos[square]?' '+(letters[pos[square]]||'quân cờ'):''));
  if(pos[square])cell.innerHTML=typeof pieceSvgMarkup==='function'?pieceSvgMarkup(pos[square]):pos[square];
  if(x===0){const lab=document.createElement('span');lab.className='vqc-arcade-rank';lab.textContent=r[y];cell.appendChild(lab);}
  if(y===7){const lab=document.createElement('span');lab.className='vqc-arcade-file';lab.textContent=f[x];cell.appendChild(lab);}
  cell.addEventListener('click',()=>clickSquare(square));board.appendChild(cell);
 }
 $('vqcArcadeTitle').textContent=game===0?'♟️ Trò chơi Tốt':'♞ Mã chống Tốt';
 $('vqcArcadeMode').value=mode;$('vqcArcadeColor').value=human;
 $('vqcArcadeColorRow').hidden=mode!=='computer';
 $('vqcArcadeGame0').classList.toggle('active',game===0);$('vqcArcadeGame1').classList.toggle('active',game===1);
 $('vqcArcadeRules').textContent=game===0?
  'Mỗi bên có 8 quân Tốt. Trắng đi trước. Tốt đi thẳng 1 ô (lần đầu có thể đi 2 ô nếu đường trống), ăn chéo 1 ô và được bắt Tốt qua đường ngay nước kế tiếp. Bên nào đưa Tốt đến hàng cuối để phong cấp sẽ thắng.':
  'Trắng có 1 quân Mã tại e1; Đen có 3 Tốt tại d7, e7, f7. Mã đi hình chữ L, thắng khi ăn hết cả 3 Tốt. Đen thắng nếu một Tốt đến hàng 1 để phong cấp hoặc bắt được Mã. Trắng đi trước.';
 $('vqcArcadeStatus').textContent=ended||(waitingPromotion?'♟️ Chọn quân phong cấp để hoàn tất ván.':thinking?'🤖 Máy đang suy nghĩ…':('Đến lượt '+(turn==='w'?'Trắng':'Đen')+(mode==='computer'?(turn===human?' — đến lượt em!':' — chờ máy…'):' — người chơi '+(turn==='w'?'Trắng':'Đen')+' đi.')));
 $('vqcArcadeHistory').textContent='Số lượt đã đi: '+moves+(last?' · Nước vừa đi: '+last:'');
 const promoteEl=$('vqcArcadePromotion'),buttons=$('vqcArcadePromotionButtons');
 promoteEl.hidden=!waitingPromotion||(mode==='computer'&&turn!==human);
 buttons.replaceChildren();
 if(!promoteEl.hidden)for(const [letter,name] of [['q','Hậu'],['r','Xe'],['b','Tượng'],['n','Mã']]){
  const button=document.createElement('button');button.type='button';button.textContent=name;button.addEventListener('click',()=>promote(letter));buttons.appendChild(button);
 }
}
function start(i=0){
 if(typeof roomRef!=='undefined'&&roomRef){if(typeof vqcNotify==='function')vqcNotify('Hãy rời phòng học trước khi chơi giải trí.','warning');return;}
 game=i===1?1:0;open=true;$('vqcArcadeOverlay').hidden=false;setup();queueBot();
}
function close(){open=false;clearTimeout(botTimer);botTimer=null;thinking=false;$('vqcArcadeOverlay').hidden=true;}
function init(){
 const wrap=document.createElement('div');wrap.id='vqcArcadeOverlay';wrap.className='vqc-arcade-overlay';wrap.hidden=true;
 wrap.innerHTML='<section class="vqc-arcade-dialog" role="dialog" aria-modal="true" aria-labelledby="vqcArcadeTitle"><div class="vqc-arcade-head"><h2 id="vqcArcadeTitle">🎮 Trò chơi giải trí</h2><button type="button" id="vqcArcadeClose">✕ Đóng</button></div><div class="vqc-arcade-tabs"><button type="button" id="vqcArcadeGame0">♟️ Trò chơi Tốt</button><button type="button" id="vqcArcadeGame1">♞ Mã chống Tốt</button></div><div class="vqc-arcade-layout"><div class="vqc-arcade-board-wrap"><div id="vqcArcadeBoard" class="vqc-arcade-board" aria-label="Bàn cờ giải trí"></div><p id="vqcArcadeHistory"></p></div><aside class="vqc-arcade-panel"><label for="vqcArcadeMode">Hình thức chơi</label><select id="vqcArcadeMode"><option value="computer">🤖 Chơi với máy</option><option value="local">👥 Hai người cùng thiết bị</option></select><div id="vqcArcadeColorRow"><label for="vqcArcadeColor">Em chọn bên</label><select id="vqcArcadeColor"><option value="w">⚪ Trắng (Mã ở trò chơi Mã)</option><option value="b">⚫ Đen (3 Tốt ở trò chơi Mã)</option></select></div><h3>📖 Luật chơi giống trong lớp</h3><p id="vqcArcadeRules"></p><p id="vqcArcadeStatus" aria-live="polite"></p><div class="vqc-arcade-actions"><button type="button" id="vqcArcadeRestart">↻ Ván mới</button><button type="button" id="vqcArcadeFlip">⇅ Đảo bàn cờ</button></div><div id="vqcArcadePromotion" hidden><h3>Chọn quân phong cấp</h3><div id="vqcArcadePromotionButtons"></div></div><small>Chế độ giải trí độc lập với lớp học và tiến độ các vùng đất.</small></aside></div></section>';
 document.body.appendChild(wrap);
 $('vqcArcadeClose').addEventListener('click',close);
 $('vqcArcadeGame0').addEventListener('click',()=>start(0));
 $('vqcArcadeGame1').addEventListener('click',()=>start(1));
 $('vqcArcadeRestart').addEventListener('click',()=>{setup();queueBot();});
 $('vqcArcadeFlip').addEventListener('click',()=>{flipped=!flipped;render();});
 $('vqcArcadeMode').addEventListener('change',e=>{mode=e.target.value==='local'?'local':'computer';setup();queueBot();});
 $('vqcArcadeColor').addEventListener('change',e=>{human=e.target.value==='b'?'b':'w';setup();queueBot();});
 wrap.addEventListener('click',e=>{if(e.target===wrap)close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)close();});
 window.addEventListener('vqc:account-change',close);
}
window.vqcArcadeOpen=start;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
