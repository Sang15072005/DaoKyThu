/* Unified last-move highlighting for every 8x8 board in Dao Ky Thu.
 * Visual-only: does not alter move legality, classroom data or saved progress.
 * Works on rerenders, castling, captures, board flips and network snapshots.
 */
(function(){
 'use strict';
 const FILES='abcdefgh';
 const CELL_IDS=[
  'board','mateBoard','mate3Board','pvpBoard','captureBoard','freeCaptureBoard',
  'defenseBoard','checkOneBoard','escapeBoard','pawnGameBoard','vqcLoneMateBoard',
  'vqcArcadeBoard','vqcDuelBoard','vqcAdventureBoard'
 ];
 const ID_SET=new Set(CELL_IDS);
 const SQUARE=/^[a-h][1-8]$/;
 const states=new Map();
 const fileRank=i=>FILES[i%8]+(8-Math.floor(i/8));
 const normalize=s=>typeof s==='string'&&SQUARE.test(s)?s:null;

 function ensure(id){
  if(!states.has(id))states.set(id,{snapshot:null,last:null,pending:false,revision:0,seenRevision:0,element:null,observer:null});
  return states.get(id);
 }
 function coords(cell,index){
  const d=cell.dataset||{};
  if(normalize(d.square))return d.square;
  if(d.index!==undefined&&/^\d{1,2}$/.test(d.index)&&+d.index<64)return fileRank(+d.index);
  const label=(cell.getAttribute('aria-label')||'').trim();
  const m=label.match(/^(?:Ô\s+)?([a-h][1-8])(?:\s|$)/i);
  return m?m[1].toLowerCase():fileRank(index);
 }
 function piece(cell){
  if(cell.dataset?.vqcPiece!==undefined)return String(cell.dataset.vqcPiece||'');
  const img=cell.querySelector('img');
  if(img)return 'img:'+String(img.getAttribute('src')||img.getAttribute('alt')||'');
  const holder=cell.querySelector('.piece,.vqc-adventure-piece,.vqc-lonemate-piece');
  if(holder)return 'piece:'+holder.innerHTML;
  const svg=cell.querySelector('svg:not(.vqc-annotation-overlay)');
  if(svg)return 'svg:'+svg.outerHTML;
  const text=cell.textContent||'';
  const unicode=text.match(/[♔♕♖♗♘♙♚♛♜♝♞♟]/);
  return unicode?'glyph:'+unicode[0]:'';
 }
 function boardSquares(board){
  const children=Array.from(board.children).filter(x=>
   x.nodeType===1 && /^(DIV|BUTTON)$/.test(x.tagName) &&
   !x.classList.contains('vqc-annotation-overlay'));
  if(children.length!==64)return null;
  const map=new Map(),snap=new Map();
  for(let i=0;i<64;i++){
   const cell=children[i],sq=coords(cell,i);
   if(map.has(sq))return null;
   map.set(sq,cell);
   snap.set(sq,piece(cell));
  }
  return {map,snap};
 }
 function inferredMove(a,b){
  if(!a||!b)return null;
  const changed=Array.from(b.keys()).filter(sq=>a.get(sq)!==b.get(sq));
  if(changed.length<2||changed.length>4)return null;
  // A moved piece is present in the new destination and previously occupied
  // the origin. En-passant introduces a third changed square, castling four.
  const candidates=[];
  for(const from of changed){
   const was=a.get(from),now=b.get(from);
   if(!was||was===now)continue;
   for(const to of changed){
    if(from===to)continue;
    if(b.get(to)!==was||a.get(to)===b.get(to))continue;
    candidates.push({from,to});
   }
  }
  return candidates.length===1?candidates[0]:null;
 }
 function paint(board,info,last){
  for(const [sq,cell] of info.map){
   cell.classList.toggle('vqc-last-from',!!last&&last.from===sq);
   cell.classList.toggle('vqc-last-to',!!last&&last.to===sq);
  }
 }
 function scan(board){
  const st=ensure(board.id);
  const info=boardSquares(board);
  if(!info)return;
  const explicitPending=st.revision!==st.seenRevision;
  if(!st.snapshot&&!st.last){
   // The main classroom board already has native .last markers after initial load.
   const old=Array.from(info.map).filter(([,cell])=>cell.classList.contains('last')).map(([sq])=>sq);
   if(old.length===2)st.last={from:old[0],to:old[1]};
  }
  if(st.snapshot&&!explicitPending){
   const changes=Array.from(info.snap.keys()).filter(sq=>st.snapshot.get(sq)!==info.snap.get(sq));
   if(changes.length>4){st.last=null;}
   else if(changes.length){
    const last=inferredMove(st.snapshot,info.snap);
    if(last)st.last=last;
    else if(changes.length>=3)st.last=null;
   }
  }
  st.snapshot=info.snap;
  st.seenRevision=st.revision;
  paint(board,info,st.last);
 }
 function queue(board){
  const st=ensure(board.id);
  if(st.pending)return;
  st.pending=true;
  Promise.resolve().then(()=>{
   st.pending=false;
   if(board.isConnected)scan(board);
  });
 }
 function attach(board){
  if(!board||!ID_SET.has(board.id))return;
  const st=ensure(board.id);
  if(st.element===board)return;
  if(st.observer)st.observer.disconnect();
  st.element=board;
  st.snapshot=null;
  st.last=null;
  st.revision++;
  st.observer=new MutationObserver(()=>queue(board));
  st.observer.observe(board,{childList:true});
  queue(board);
 }
 function findBoards(root){
  if(root.nodeType!==1&&root.nodeType!==9)return;
  if(root.id&&ID_SET.has(root.id))attach(root);
  if(root.querySelectorAll)for(const id of CELL_IDS){
   const board=root.querySelector('#'+id);
   if(board)attach(board);
  }
 }
 function mark(id,from,to){
  if(!ID_SET.has(id))return;
  const board=document.getElementById(id);
  if(board)attach(board); // Preserve the first recorded move on dynamic game boards.
  const st=ensure(id);
  const a=normalize(from),b=normalize(to);
  st.last=a&&b&&a!==b?{from:a,to:b}:null;
  st.revision++;
  if(board)queue(board);
 }
 function clear(id){mark(id,null,null);}
 function lastFromChess(id,chess){
  if(!chess||typeof chess.history!=='function'){clear(id);return;}
  const moves=chess.history({verbose:true});
  const last=moves.length?moves[moves.length-1]:null;
  mark(id,last?.from||null,last?.to||null);
 }
 function fromUci(id,moves){
  const last=Array.isArray(moves)&&moves.length?moves[moves.length-1]:null;
  const str=typeof last==='string'?last:(last&&last.from&&last.to?last.from+last.to:'');
  mark(id,str.slice(0,2),str.slice(2,4));
 }
 function init(){
  findBoards(document);
  const observer=new MutationObserver(records=>{
   for(const record of records)for(const n of record.addedNodes){
    // Skip updates within already registered boards: scoped observer handles them.
    if(n.nodeType!==1)continue;
    if(n.parentElement?.id&&ID_SET.has(n.parentElement.id))continue;
    findBoards(n);
   }
  });
  observer.observe(document.body,{childList:true,subtree:true});
 }
 window.vqcLastMove={mark,clear,fromChess:lastFromChess,fromUci,refresh:id=>{const board=document.getElementById(id);if(board)queue(board);}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
