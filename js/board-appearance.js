/* Personal board appearance: intentionally NOT synchronized to classroom. */
(function(){
'use strict';
const KEY='vqc-board-appearance-v1';
const THEMES=[
 ['original','Nguyên bản','#fff0c7','#79b7e8'],
 ['wood','Gỗ cổ điển','#f0d9b5','#b58863'],
 ['forest','Rừng xanh','#eeeed2','#769656'],
 ['ocean','Đại dương','#dcecf7','#6798c0'],
 ['candy','Kẹo ngọt','#f9dceb','#b99ad5'],
 ['night','Bóng đêm','#b7b9bd','#555b67'],
 ['royal','Hoàng gia','#f7e9b5','#c19a40']
];
const defaults={theme:'original',piece:'classic',coordinates:true,hints:true,lastmove:true};
let prefs={...defaults};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');if(saved&&typeof saved==='object')prefs={...defaults,...saved};}catch(e){}
if(!THEMES.some(t=>t[0]===prefs.theme))prefs.theme=defaults.theme;
if(!['classic','contrast','soft'].includes(prefs.piece))prefs.piece='classic';
for(const k of ['coordinates','hints','lastmove'])if(typeof prefs[k]!=='boolean')prefs[k]=defaults[k];
function apply(){
 const root=document.documentElement;
 root.dataset.vqcBoardTheme=prefs.theme;
 root.dataset.vqcPieceStyle=prefs.piece;
 root.dataset.vqcCoordinates=prefs.coordinates?'on':'off';
 root.dataset.vqcHints=prefs.hints?'on':'off';
 root.dataset.vqcLastmove=prefs.lastmove?'on':'off';
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch(e){}apply();}
apply();
function el(tag,attrs={},text){
 const n=document.createElement(tag);
 Object.entries(attrs).forEach(([k,v])=>{if(k==='class')n.className=v;else n.setAttribute(k,v);});
 if(text!==undefined)n.textContent=text;
 return n;
}
function init(){
 if(document.getElementById('vqcAppearanceDialog'))return;
 const btn=el('button',{type:'button',class:'btn btn-soft vqc-appearance-open',title:'Thay đổi giao diện bàn cờ'},'🎨 Bàn cờ');
 const header=document.querySelector('.header');
 if(header)header.appendChild(btn);
 else document.body.prepend(btn);
 const overlay=el('div',{id:'vqcAppearanceDialog',class:'vqc-appearance-dialog',role:'dialog','aria-modal':'true','aria-labelledby':'vqcAppearanceTitle',hidden:''});
 const panel=el('div',{class:'vqc-appearance-panel'});
 const top=el('div',{class:'vqc-appearance-top'});
 const head=el('div');
 head.appendChild(el('h2',{id:'vqcAppearanceTitle'},'🎨 Tùy chỉnh bàn cờ'));
 head.appendChild(el('p',{},'Chọn màu và cách hiển thị yêu thích. Chỉ thay đổi trên thiết bị này.'));
 const close=el('button',{type:'button',class:'vqc-appearance-close','aria-label':'Đóng'},'×');
 top.append(head,close);panel.appendChild(top);
 panel.appendChild(el('label',{class:'vqc-appearance-label'},'Màu bàn cờ'));
 const grid=el('div',{class:'vqc-appearance-grid'});
 const swatches=[];
 THEMES.forEach(([id,name,light,dark])=>{
  const choice=el('button',{type:'button',class:'vqc-appearance-choice','data-theme':id,'aria-pressed':String(prefs.theme===id)});
  const swatch=el('span',{class:'vqc-appearance-swatch','aria-hidden':'true'});
  swatch.style.setProperty('--swatch-light',light);swatch.style.setProperty('--swatch-dark',dark);
  choice.append(swatch,el('span',{},name));
  choice.addEventListener('click',()=>{prefs.theme=id;save();swatches.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===id)));});
  swatches.push(choice);grid.appendChild(choice);
 });
 panel.appendChild(grid);
 const pieceLabel=el('label',{class:'vqc-appearance-label',for:'vqcPieceAppearance'},'Hiển thị quân cờ');
 panel.appendChild(pieceLabel);
 const select=el('select',{id:'vqcPieceAppearance',class:'vqc-appearance-select'});
 [['classic','Nguyên bản'],['contrast','Tương phản rõ nét'],['soft','Đổ bóng mềm']].forEach(([v,t])=>select.appendChild(el('option',{value:v},t)));
 select.value=prefs.piece;
 select.addEventListener('change',()=>{prefs.piece=select.value;save();});
 panel.appendChild(select);
 const toggles=[];
 [['coordinates','Hiển thị tọa độ bàn cờ'],['hints','Hiển thị chấm gợi ý nước đi'],['lastmove','Làm nổi nước đi cuối cùng']].forEach(([key,title])=>{
  const line=el('label',{class:'vqc-appearance-check'});
  const input=el('input',{type:'checkbox'});input.checked=prefs[key];
  input.addEventListener('change',()=>{prefs[key]=input.checked;save();});
  if(key==='lastmove'){
   const description=el('span',{class:'vqc-appearance-check__copy'});
   description.append(el('strong',{},title),el('small',{},'Xem nước đi gần nhất: làm nổi bật ô xuất phát và ô đích trên bàn cờ ở mọi chế độ.'));
   line.append(input,description);
  }else line.append(input,el('span',{},title));
  panel.appendChild(line);toggles.push([key,input]);
 });
 const actions=el('div',{class:'vqc-appearance-actions'});
 const reset=el('button',{type:'button'},'Mặc định');
 const done=el('button',{type:'button'},'Hoàn tất');
 function hide(){overlay.hidden=true;document.body.style.removeProperty('overflow');btn.focus();}
 function show(){overlay.hidden=false;document.body.style.overflow='hidden';close.focus();}
 reset.addEventListener('click',()=>{prefs={...defaults};save();select.value=prefs.piece;toggles.forEach(([k,n])=>n.checked=prefs[k]);swatches.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===prefs.theme)));});
 close.addEventListener('click',hide);done.addEventListener('click',hide);btn.addEventListener('click',show);
 overlay.addEventListener('click',e=>{if(e.target===overlay)hide();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)hide();});
 actions.append(reset,done);panel.appendChild(actions);overlay.appendChild(panel);document.body.appendChild(overlay);
 window.vqcOpenBoardAppearance=show;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
