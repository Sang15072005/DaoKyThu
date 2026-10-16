

/* Tự nhận diện Vua đang bị chiếu, kể cả khi nhận nước đi từ Firebase. */
(function(){
 const configs=[
  ['board',()=>typeof state!=='undefined'?Object.fromEntries(state.map((p,i)=>['abcdefgh'[i%8]+(8-Math.floor(i/8)),p]).filter(x=>x[1])):null],
  ['captureBoard',()=>typeof capturePosition!=='undefined'?capturePosition:null],
  ['defenseBoard',()=>typeof defensePosition!=='undefined'?defensePosition:null],
  ['checkOneBoard',()=>typeof checkOnePosition!=='undefined'?checkOnePosition:null],
  ['escapeBoard',()=>typeof escapePosition!=='undefined'?escapePosition:null],
  ['mateBoard',()=>typeof mateChess!=='undefined'&&mateChess?mateChess:null],
  ['mate3Board',()=>typeof mate3Chess!=='undefined'&&mate3Chess?mate3Chess:null],
  ['pvpBoard',()=>typeof pvpChess==='function'?pvpChess():null]
 ];
 let soundEnabled=true,ctx=null;
 function play(){if(!soundEnabled)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=ctx||new AC();if(ctx.state==='suspended')ctx.resume();const now=ctx.currentTime;[660,880].forEach((freq,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,now+i*.16);gain.gain.exponentialRampToValueAtTime(.14,now+i*.16+.018);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.16+.14);osc.connect(gain);gain.connect(ctx.destination);osc.start(now+i*.16);osc.stop(now+i*.16+.15);});}catch(e){}}
 function attacks(piece,from,to,pos){
  const a=from.charCodeAt(0)-97,b=Number(from[1]),x=to.charCodeAt(0)-97,y=Number(to[1]);const dx=x-a,dy=y-b,t=piece.toUpperCase();
  if(t==='P')return Math.abs(dx)===1&&dy===(piece==='P'?1:-1);
  if(t==='N')return Math.abs(dx)*Math.abs(dy)===2;
  if(t==='K')return Math.max(Math.abs(dx),Math.abs(dy))===1;
  if(t==='R'&&dx!==0&&dy!==0)return false;
  if(t==='B'&&Math.abs(dx)!==Math.abs(dy))return false;
  if(t==='Q'&&!(dx===0||dy===0||Math.abs(dx)===Math.abs(dy)))return false;
  if(!['R','B','Q'].includes(t)||(dx===0&&dy===0))return false;
  const sx=Math.sign(dx),sy=Math.sign(dy);let cx=a+sx,cy=b+sy;
  while(cx!==x||cy!==y){if(pos['abcdefgh'[cx]+cy])return false;cx+=sx;cy+=sy;}
  return true;
 }
 function checks(position){
  if(!position)return [];
  if(typeof position.get==='function'&&(typeof position.in_check==='function'||typeof position.isCheck==='function')){
   const checked=typeof position.isCheck==='function'?position.isCheck():position.in_check();
   if(!checked)return [];
   const color=position.turn();
   for(const f of 'abcdefgh')for(let r=1;r<=8;r++){const sq=f+r,pc=position.get(sq);if(pc&&pc.type==='k'&&pc.color===color)return [sq];}
   return [];
  }
  const pos=position,found=[];
  for(const [sq,p] of Object.entries(pos)){
   if(p!=='K'&&p!=='k')continue;
   const enemy=p==='K'?v=>v===v.toLowerCase():v=>v===v.toUpperCase();
   if(Object.entries(pos).some(([from,v])=>v&&enemy(v)&&attacks(v,from,sq,pos)))found.push(sq);
  }
  return found;
 }
 const last=new Map();let lastSound=0;
 function update(id,getPos){
  const el=document.getElementById(id);if(!el||!el.children.length)return;
  let pos;try{pos=getPos();}catch(e){return;}
  const marked=checks(pos),signature=JSON.stringify(marked)+':'+(pos&&typeof pos.fen==='function'?pos.fen():JSON.stringify(pos));
  const prev=last.get(id);last.set(id,{signature,marked:marked.join(',')});
  [...el.children].forEach(c=>c.classList.remove('vqc-king-in-check'));
  const flip=id==='pvpBoard'&&typeof pvpMyColor==='function'&&pvpMyColor()==='b';
  marked.forEach(sq=>{
   let index=(8-Number(sq[1]))*8+sq.charCodeAt(0)-97;
   if(id==='board'&&typeof editorFlipped!=='undefined'&&typeof editorMode!=='undefined'&&(editorMode||editorPlaying)&&editorFlipped)index=63-index;
   if(flip)index=63-index;
   el.children[index]?.classList.add('vqc-king-in-check');
  });
  if(marked.length&&(!prev||prev.marked!==marked.join(','))&&Date.now()-lastSound>700){lastSound=Date.now();play();}
 }
 configs.forEach(([id,getPos])=>{
  const el=document.getElementById(id);if(!el)return;
  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;update(id,getPos);});});
  observer.observe(el,{childList:true,subtree:false});update(id,getPos);
 });
})();

