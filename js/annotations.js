/* Đảo Kỳ Thủ · arrows and square highlights, compatible with existing chess boards.
   Desktop: right-drag arrow, right-click circle; Shift / Ctrl / Alt change color.
   Touch: tap the drawing tool first, then drag or tap a square.
   Classroom: teacher annotations are shared through the existing Firestore room. */
(function(){
 'use strict';
 const BOARD_IDS=[
  'board','mateBoard','mate3Board','pvpBoard','captureBoard',
  'freeCaptureBoard','defenseBoard','checkOneBoard','escapeBoard',
  'pawnGameBoard','vqcAdventureBoard'
 ];
 const SELECTOR=BOARD_IDS.map(id=>'#'+id).join(',');
 const SVG_NS='http://www.w3.org/2000/svg';
 const COLORS={green:'#31985f',red:'#df4848',blue:'#357edb',yellow:'#d0a21a'};
 const MAX_MARKS=72;
 const boards=new Map();
 const marks=new Map();
 const layers=new Map();
 let drawingMode=false;
 let gesture=null;
 let toolbar=null;
 let visibilityQueued=false;
 let lastRemoteStamp=null;
 let remoteWasPresent=false;
 let publishTimer=null;
 let publishSerial=0;
 const svgNode=(tag,attrs={})=>{
  const n=document.createElementNS(SVG_NS,tag);
  Object.entries(attrs).forEach(([name,value])=>n.setAttribute(name,String(value)));
  return n;
 };
 function boardFromTarget(target){
  return target instanceof Element?target.closest(SELECTOR):null;
 }
 function isBoardVisible(board){
  if(!board||!board.isConnected)return false;
  const r=board.getBoundingClientRect();
  return r.width>=160&&r.height>=160;
 }
 function activeBoard(){
  const all=BOARD_IDS.map(id=>boards.get(id)).filter(isBoardVisible);
  const dialogBoard=all.find(board=>!!board.closest('.open'));
  if(dialogBoard)return dialogBoard;
  const inViewport=all.find(board=>{
   const r=board.getBoundingClientRect();
   return r.bottom>0&&r.top<window.innerHeight&&r.right>0&&r.left<window.innerWidth;
  });
  return inViewport||all[0]||null;
 }
 function annotationModeClass(){
  for(const board of boards.values())board.classList.toggle('vqc-annotation-draw',drawingMode);
 }
 function scheduleToolbar(){
  if(visibilityQueued)return;
  visibilityQueued=true;
  requestAnimationFrame(()=>{
   visibilityQueued=false;
   if(!toolbar)return;
   const visible=!!activeBoard();
   toolbar.hidden=!visible;
   if(!visible&&drawingMode){drawingMode=false;annotationModeClass();}
   updateToolbar();
  });
 }
 function updateToolbar(){
  if(!toolbar)return;
  const btn=toolbar.querySelector('[data-action="draw"]');
  btn.classList.toggle('is-active',drawingMode);
  btn.setAttribute('aria-pressed',String(drawingMode));
  btn.textContent=drawingMode?'✅ Đang vẽ':'✏️ Vẽ';
  const board=activeBoard();
  const clear=toolbar.querySelector('[data-action="clear"]');
  clear.disabled=!board||!(marks.get(board.id)||[]).length;
 }
 function createToolbar(){
  toolbar=document.createElement('div');
  toolbar.id='vqcAnnotationToolbar';
  toolbar.className='vqc-annotation-toolbar';
  toolbar.setAttribute('role','toolbar');
  toolbar.setAttribute('aria-label','Công cụ vẽ trên bàn cờ');
  toolbar.hidden=true;
  toolbar.innerHTML=
   '<button type="button" data-action="draw" aria-pressed="false" title="Bật hoặc tắt vẽ bằng chuột trái hoặc cảm ứng">✏️ Vẽ</button>'+
   '<button type="button" data-action="clear" title="Xóa các nét vẽ trên bàn cờ này">🧹 Xóa</button>'+
   '<span class="vqc-annotation-hint" title="Chuột phải: nhấp để khoanh ô, kéo để vẽ mũi tên. Shift: đỏ · Ctrl: xanh dương · Alt: vàng. Trên điện thoại, bật Vẽ.">ⓘ</span>';
  toolbar.addEventListener('pointerdown',event=>event.stopPropagation());
  toolbar.addEventListener('click',event=>{
   const button=event.target.closest('button[data-action]');
   if(!button)return;
   event.preventDefault();
   event.stopPropagation();
   if(button.dataset.action==='draw'){
    drawingMode=!drawingMode;
    annotationModeClass();
    updateToolbar();
   }else if(button.dataset.action==='clear'){
    const board=activeBoard();
    if(board)clearBoard(board.id,true);
   }
  });
  document.body.appendChild(toolbar);
 }
 function mountBoard(board){
  if(!board||boards.has(board.id))return;
  boards.set(board.id,board);
  marks.set(board.id,[]);
  board.classList.add('vqc-annotation-board');
  const svg=svgNode('svg',{
   class:'vqc-annotation-overlay',viewBox:'0 0 800 800',preserveAspectRatio:'none','aria-hidden':'true'
  });
  layers.set(board.id,svg);
  const ensure=()=>{
   if(!board.isConnected)return;
   if(svg.parentNode!==board)board.appendChild(svg);
  };
  // Most existing exercise renderers replace board.innerHTML. Reattach after every redraw.
  const observer=new MutationObserver(ensure);
  observer.observe(board,{childList:true});
  ensure();
 }
 function initBoards(){
  BOARD_IDS.forEach(id=>mountBoard(document.getElementById(id)));
  annotationModeClass();
  scheduleToolbar();
 }
 function squareAt(board,clientX,clientY){
  const rect=board.getBoundingClientRect();
  const insetX=board.clientLeft||0,insetY=board.clientTop||0;
  const width=Math.max(1,board.clientWidth),height=Math.max(1,board.clientHeight);
  const x=(clientX-rect.left-insetX)/width;
  const y=(clientY-rect.top-insetY)/height;
  if(x<0||x>=1||y<0||y>=1)return null;
  return Math.floor(y*8)*8+Math.floor(x*8);
 }
 function center(index){
  return {x:(index%8)*100+50,y:Math.floor(index/8)*100+50};
 }
 function drawMark(svg,mark,isPreview=false){
  const opacity=isPreview?0.45:0.82;
  const a=center(mark.from);
  const color=COLORS[mark.color]||COLORS.green;
  if(mark.from===mark.to||mark.kind==='circle'){
   svg.appendChild(svgNode('circle',{
    cx:a.x,cy:a.y,r:38,fill:'none',stroke:color,'stroke-width':15,
    'stroke-opacity':opacity,'stroke-linecap':'round'
   }));
   return;
  }
  const b=center(mark.to);
  const dx=b.x-a.x,dy=b.y-a.y;
  const d=Math.hypot(dx,dy);
  if(d<10)return;
  const ux=dx/d,uy=dy/d,px=-uy,py=ux;
  const tip={x:b.x-9*ux,y:b.y-9*uy};
  const base={x:tip.x-36*ux,y:tip.y-36*uy};
  svg.appendChild(svgNode('line',{
   x1:a.x+ux*10,y1:a.y+uy*10,
   x2:base.x+ux*5,y2:base.y+uy*5,
   stroke:color,'stroke-width':18,'stroke-opacity':opacity,'stroke-linecap':'round'
  }));
  svg.appendChild(svgNode('polygon',{
   points:[tip.x+','+tip.y,(base.x+px*26)+','+(base.y+py*26),(base.x-px*26)+','+(base.y-py*26)].join(' '),
   fill:color,'fill-opacity':opacity,'stroke-linejoin':'round'
  }));
 }
 function redraw(boardId,preview=null){
  const layer=layers.get(boardId);
  if(!layer)return;
  layer.replaceChildren();
  for(const mark of marks.get(boardId)||[])drawMark(layer,mark);
  if(preview)drawMark(layer,preview,true);
  updateToolbar();
 }
 function currentColor(event){
  if(event.shiftKey)return 'red';
  if(event.ctrlKey||event.metaKey)return 'blue';
  if(event.altKey)return 'yellow';
  return 'green';
 }
 function addMark(boardId,from,to,color){
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>63||to>63)return;
  const kind=from===to?'circle':'arrow';
  const items=marks.get(boardId)||[];
  const match=items.findIndex(m=>m.kind===kind&&m.from===from&&m.to===to);
  if(match>=0)items.splice(match,1);
  else{
   items.push({kind,from,to,color});
   if(items.length>MAX_MARKS)items.shift();
  }
  marks.set(boardId,items);
  redraw(boardId);
  publish(boardId);
 }
 function clearBoard(id,broadcast=false){
  if(!marks.has(id))return;
  if(!(marks.get(id)||[]).length)return;
  marks.set(id,[]);
  redraw(id);
  if(broadcast)publish(id);
 }
 function clearAllLocal(){
  clearTimeout(publishTimer);
  publishTimer=null;
  for(const id of boards.keys()){
   marks.set(id,[]);
   redraw(id);
  }
 }
 // Global handler is also called when teacher switches lesson. Firestore navigation
 // clears annotations together with its activeView to prevent stale drawings.
 window.vqcAnnotationsClearAll=clearAllLocal;
 function publish(boardId){
  if(typeof roomRef==='undefined'||!roomRef||
     typeof role==='undefined'||role!=='teacher'||
     window.vqcCurrentLearningMode!=='class')return;
  clearTimeout(publishTimer);
  const ref=roomRef;
  const data={
   boardId,marks:(marks.get(boardId)||[]).slice(0,MAX_MARKS),
   stamp:Date.now()+'-'+(++publishSerial)
  };
  publishTimer=setTimeout(()=>{
   if(typeof roomRef==='undefined'||roomRef!==ref)return;
   ref.update({boardAnnotations:data}).catch(error=>console.warn('Không thể chia sẻ nét vẽ:',error));
  },70);
 }
 function sanitizeRemote(data){
  if(!data||!BOARD_IDS.includes(data.boardId)||!Array.isArray(data.marks))return null;
  return {
   boardId:data.boardId,stamp:String(data.stamp||''),
   marks:data.marks.slice(0,MAX_MARKS).filter(m=>
    m&&['circle','arrow'].includes(m.kind)&&Number.isInteger(m.from)&&Number.isInteger(m.to)&&
    m.from>=0&&m.from<64&&m.to>=0&&m.to<64&&Object.hasOwn(COLORS,m.color))
  };
 }
 window.vqcAnnotationsReceive=function(input){
  if(typeof role!=='undefined'&&role==='teacher')return;
  const data=sanitizeRemote(input);
  if(!data){
   if(remoteWasPresent){remoteWasPresent=false;lastRemoteStamp=null;clearAllLocal();}
   return;
  }
  if(remoteWasPresent&&lastRemoteStamp===data.stamp)return;
  remoteWasPresent=true;
  lastRemoteStamp=data.stamp;
  // The teacher controls classroom drawings; students still move pieces normally.
  clearAllLocal();
  marks.set(data.boardId,data.marks);
  redraw(data.boardId);
 };
 function handleDown(event){
  const board=boardFromTarget(event.target);
  if(!board)return;
  const right=event.button===2;
  const draw=drawingMode&&(event.button===0||event.pointerType==='touch');
  if(!right&&!draw){
   if(event.button===0&&!drawingMode)clearBoard(board.id,true);
   return;
  }
  if(!isBoardVisible(board))return;
  const sq=squareAt(board,event.clientX,event.clientY);
  if(sq===null)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  gesture={boardId:board.id,pointerId:event.pointerId,start:sq,last:sq,color:currentColor(event)};
  redraw(board.id,{from:sq,to:sq,kind:'circle',color:gesture.color});
 }
 function handleMove(event){
  if(!gesture||event.pointerId!==gesture.pointerId)return;
  const board=boards.get(gesture.boardId);
  if(!board)return;
  const sq=squareAt(board,event.clientX,event.clientY);
  if(sq===null)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if(gesture.last!==sq){
   gesture.last=sq;
   redraw(board.id,{from:gesture.start,to:sq,kind:sq===gesture.start?'circle':'arrow',color:gesture.color});
  }
 }
 function handleEnd(event){
  if(!gesture||event.pointerId!==gesture.pointerId)return;
  const {boardId,start,last,color}=gesture;
  gesture=null;
  event.preventDefault();
  event.stopImmediatePropagation();
  const board=boards.get(boardId);
  if(!board)return;
  const end=squareAt(board,event.clientX,event.clientY);
  addMark(boardId,start,end??last,color);
 }
 function handleCancel(){
  if(!gesture)return;
  const id=gesture.boardId;
  gesture=null;
  redraw(id);
 }
 function installListeners(){
  document.addEventListener('pointerdown',handleDown,true);
  document.addEventListener('pointermove',handleMove,true);
  document.addEventListener('pointerup',handleEnd,true);
  document.addEventListener('pointercancel',handleCancel,true);
  document.addEventListener('contextmenu',event=>{
   if(boardFromTarget(event.target)){event.preventDefault();event.stopPropagation();}
  },true);
  document.addEventListener('click',event=>{
   if(!drawingMode||!boardFromTarget(event.target))return;
   event.preventDefault();
   event.stopImmediatePropagation();
  },true);
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&gesture)handleCancel();
  },true);
  const request=()=>scheduleToolbar();
  document.addEventListener('click',request,true);
  window.addEventListener('resize',request);
  window.addEventListener('scroll',request,true);
  // Check only visibility-affecting changes; board content is watched separately.
  new MutationObserver(request).observe(document.body,{
   subtree:true,attributes:true,attributeFilter:['class','hidden']
  });
 }
 function init(){
  if(!document.body)return;
  createToolbar();
  initBoards();
  installListeners();
  scheduleToolbar();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();