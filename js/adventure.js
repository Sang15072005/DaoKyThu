/* Đảo Kỳ Thủ: hành trình cá nhân, độc lập với phòng học trực tuyến. */
(function(){
'use strict';
const REGIONS=[
 ['⚓','Bến Cảng Khởi Hành','Làm quen với bàn cờ và các quân cờ','coast'],
 ['🌳','Rừng Sao Bí Ẩn','Di chuyển và nhặt sao','forest'],
 ['⛰️','Hẻm Núi Chiến Thuật','Tìm quân có thể ăn','canyon'],
 ['💎','Hang Động Pha Lê','Bảo vệ quân bị tấn công','crystal'],
 ['🌋','Núi Lửa Vua Đen','Chiếu và thoát chiếu','volcano'],
 ['🏰','Lâu Đài Trên Mây','Chiếu hết trong nhiều nước','cloud'],
 ['👑','Thành Trì Đại Kỳ Thủ','Thử thách tổng hợp','castle']
];
const CANYON_GROUPS=[
 {kind:'capture',title:'Ăn quân',count:5,prefix:'Bài',icon:'🏹',container:'vqcCanyonCaptureTasks'},
 {kind:'freecapture',title:'Ăn quân không được bảo vệ',count:8,prefix:'Hình',icon:'🎯',container:'vqcCanyonFreeCaptureTasks'}
];
const CANYON_TOTAL=13;
const REGION_COIN_REWARDS=REGIONS.map((region,index)=>(index+1)*1000);
const AVAILABLE_REWARD_REGIONS=3; // Vùng 4–7 chưa có bài tập, chưa thể nhận xu.

let canyonActive=false,canyonCurrentKind=null;

const FOREST_PIECES=[
 ['R','♜','Quân Xe'],['B','♝','Quân Tượng'],['Q','♛','Quân Hậu'],
 ['K','♚','Quân Vua'],['N','♞','Quân Mã'],['P','♟','Quân Tốt']
];
let forestActive=false,forestPiece=null,forestBoardParent=null,forestBoardNext=null,forestBoardNode=null;
const QUESTIONS=[
 {title:'Bàn cờ bí ẩn',question:'Bàn cờ vua có bao nhiêu ô?',options:['32 ô','64 ô','81 ô'],answer:1,explain:'Bàn cờ có 8 hàng và 8 cột, tổng cộng 64 ô.',board:'grid'},
 {title:'Hai đội quân',question:'Một ván cờ vua bắt đầu với tổng cộng bao nhiêu quân?',options:['16 quân','24 quân','32 quân'],answer:2,explain:'Mỗi bên có 16 quân, tổng cộng 32 quân.',board:'start'},
 {title:'Đội quân của em',question:'Mỗi bên có bao nhiêu quân Tốt khi bắt đầu ván cờ?',options:['6 quân','8 quân','10 quân'],answer:1,explain:'Mỗi bên có 8 quân Tốt.',board:'pawns'},
 {title:'Quân Vua dũng cảm',question:'Quân Vua được đi tối đa bao nhiêu ô trong một nước đi bình thường?',options:['1 ô','2 ô','3 ô'],answer:0,explain:'Vua đi một ô theo chiều ngang, dọc hoặc chéo, miễn là ô đến an toàn.',board:'king'},
 {title:'Con đường của Xe',question:'Quân Xe có thể di chuyển theo hướng nào?',options:['Chỉ đi chéo','Ngang hoặc dọc','Nhảy hình chữ L'],answer:1,explain:'Xe đi ngang hoặc dọc, không nhảy qua quân khác.',board:'rook'},
 {title:'Bước chân Tượng',question:'Quân Tượng di chuyển như thế nào?',options:['Theo đường chéo','Ngang hoặc dọc','Một ô bất kỳ'],answer:0,explain:'Tượng đi theo đường chéo và không nhảy qua quân khác.',board:'bishop'},
 {title:'Mã phiêu lưu',question:'Quân Mã có cách đi đặc biệt nào?',options:['Đi hình chữ L','Đi chéo bất kỳ','Chỉ tiến một ô'],answer:0,explain:'Mã đi hình chữ L và có thể nhảy qua các quân khác.',board:'knight'},
 {title:'Hậu quyền năng',question:'Quân Hậu kết hợp cách đi của hai quân nào?',options:['Vua và Mã','Xe và Tượng','Tốt và Mã'],answer:1,explain:'Hậu đi ngang, dọc hoặc chéo như Xe và Tượng.',board:'queen'},
 {title:'Tốt tiến lên',question:'Ở nước đi đầu tiên, quân Tốt có thể tiến thẳng tối đa bao nhiêu ô nếu đường trống?',options:['1 ô','2 ô','3 ô'],answer:1,explain:'Tốt có thể tiến một hoặc hai ô ở nước đầu tiên nếu đường đi trống.',board:'pawnmove'},
 {title:'Thử thách cuối bến cảng',question:'Khi Vua đang bị chiếu, em cần làm gì?',options:['Bỏ qua và đi quân bất kỳ','Thực hiện nước đi hợp lệ để hết bị chiếu','Đưa Vua vào ô đang bị tấn công'],answer:1,explain:'Khi bị chiếu, em phải chọn một nước đi hợp lệ giúp Vua thoát chiếu.',board:'check'}
];
const PIECES={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
let progress={done:[],forestDone:[],canyonDone:[],rewardedRegions:[],purchasedAvatars:[],stars:0,coins:0},current=0,answerLocked=false,saveTimer=null,cloudOk=false;
let lastAnnouncedRewards=new Set(),coinToastTimer=null,coinWalletReady=false,coinWalletReturnFocus=null;

/* Avatar shop: free characters + permanent unlocks using earned virtual coins. */
const AVAILABLE_AVATARS=[
 {id:'king',name:'Nhà vua',src:'./assets/nhanvat%20(2).png',price:7000},
 {id:'queen',name:'Nữ hoàng',src:'./assets/nhanvat%20(3).png',price:7000},
 {id:'knight',name:'Hiệp sĩ',src:'./assets/nhanvat%20(4).png',price:3000},
 {id:'scholar',name:'Học giả',src:'./assets/nhanvat%20(5).png',price:0},
 {id:'explorer',name:'Nhà thám hiểm',src:'./assets/nhanvat%20(6).png',price:0}
];
const PAID_AVATAR_IDS=['knight','queen','king'];
const AVATAR_STORAGE_KEY='selectedAvatar'; // Backwards-compatible old key.
let selectedAvatar=AVAILABLE_AVATARS[4],previewAvatar=selectedAvatar;
let avatarPickerInitialized=false,avatarPreviousFocus=null,purchaseInFlight=false;

function avatarStorageKey(){return AVATAR_STORAGE_KEY+':'+(identity()||'guest');}
function ownsAvatar(avatar){
 return !!avatar&&(avatar.price===0||progress.purchasedAvatars.includes(avatar.id));
}
function readAvatarSelection(){
 let stored=null;
 try{stored=localStorage.getItem(avatarStorageKey())||localStorage.getItem(AVATAR_STORAGE_KEY);}
 catch(error){console.warn('Không thể đọc lựa chọn nhân vật',error);}
 const chosen=AVAILABLE_AVATARS.find(avatar=>avatar.src===stored||avatar.id===stored);
 return ownsAvatar(chosen)?chosen:AVAILABLE_AVATARS[4];
}
function restoreAvatarSelection(){
 applyAvatarSelection(readAvatarSelection(),false);
}
function setAvatarMessage(message){
 const el=$('vqcAvatarShopMessage');
 if(el)el.textContent=message;
}
function refreshCharacterShop(){
 const balance=formatCoins(progress.coins);
 const count=AVAILABLE_AVATARS.filter(ownsAvatar).length;
 const counter=$('vqcOwnedAvatarCount');
 if(counter)counter.textContent=String(count);
 const modalCoins=$('vqcAvatarCoins');
 if(modalCoins)modalCoins.textContent=balance;
 document.querySelectorAll('#vqcAvatarChoices .vqc-avatar-option').forEach(button=>{
  const avatar=AVAILABLE_AVATARS.find(item=>item.id===button.dataset.avatar);
  if(!avatar)return;
  const owned=ownsAvatar(avatar);
  const equipped=selectedAvatar.id===avatar.id;
  const preview=previewAvatar.id===avatar.id;
  button.classList.toggle('selected',equipped);
  button.classList.toggle('is-preview',preview&&!equipped);
  button.classList.toggle('is-locked',!owned);
  button.setAttribute('aria-pressed',String(equipped));
  button.setAttribute('aria-label',avatar.name+'. '+(equipped?'Đang trang bị':owned?'Đã sở hữu':formatCoins(avatar.price)+' xu'));
  const status=button.querySelector('.vqc-avatar-option__status');
  if(status)status.textContent=equipped?'✓ Đang trang bị':owned?(avatar.price===0?'Miễn phí':'✓ Đã sở hữu'):'🔒 '+formatCoins(avatar.price)+' xu';
 });
 const confirm=$('vqcAvatarConfirm');
 if(!confirm)return;
 const owned=ownsAvatar(previewAvatar);
 const missing=Math.max(0,previewAvatar.price-progress.coins);
 confirm.disabled=purchaseInFlight||(!owned&&missing>0);
 confirm.classList.toggle('is-buy',!owned);
 confirm.textContent=purchaseInFlight?'⌛ Đang xử lý...':
  owned?'✓ Trang bị '+previewAvatar.name:
  missing>0?'🔒 Cần thêm '+formatCoins(missing)+' xu':
  '🪙 Mua '+previewAvatar.name+' · '+formatCoins(previewAvatar.price)+' xu';
}
function applyAvatarSelection(avatar,save=true){
 const valid=AVAILABLE_AVATARS.find(item=>item.id===avatar?.id);
 if(!ownsAvatar(valid))return false;
 selectedAvatar=valid;
 previewAvatar=valid;
 const picture=$('playerAvatar'),preview=$('vqcAvatarButtonPreview');
 if(picture){picture.src=valid.src;picture.alt='Nhân vật '+valid.name;}
 if(preview){preview.src=valid.src;preview.alt='';}
 if(save){
  try{localStorage.setItem(avatarStorageKey(),valid.src);}
  catch(error){console.warn('Không thể lưu nhân vật trên thiết bị',error);}
 }
 refreshCharacterShop();
 return true;
}
function chooseAvatar(avatar){
 if(!avatar||purchaseInFlight)return;
 previewAvatar=avatar;
 if(ownsAvatar(avatar)){
  applyAvatarSelection(avatar);
  setAvatarMessage('✓ Đã trang bị '+avatar.name+'. Em có thể đổi nhân vật bất cứ lúc nào.');
 }else{
  const missing=Math.max(0,avatar.price-progress.coins);
  setAvatarMessage(missing>0
   ?'🔒 Em cần thêm '+formatCoins(missing)+' xu để mở khóa '+avatar.name+'.'
   :'🪙 '+avatar.name+' có giá '+formatCoins(avatar.price)+' xu. Bấm Mua để mở khóa vĩnh viễn.');
 }
 refreshCharacterShop();
}
function closeAvatarPicker(){
 const modal=$('vqcAvatarModal');
 if(!modal||modal.hidden)return;
 modal.hidden=true;
 document.body.classList.remove('vqc-avatar-open');
 if(avatarPreviousFocus?.isConnected&&document.body.classList.contains('vqc-mode-world'))avatarPreviousFocus.focus();
 avatarPreviousFocus=null;
}
function openAvatarPicker(){
 const modal=$('vqcAvatarModal');
 if(!modal)return;
 avatarPreviousFocus=document.activeElement;
 previewAvatar=selectedAvatar;
 refreshCharacterShop();
 setAvatarMessage('Nhân vật miễn phí: Học giả và Nhà thám hiểm. Nhân vật mua sẽ sở hữu vĩnh viễn.');
 modal.hidden=false;
 document.body.classList.add('vqc-avatar-open');
 (modal.querySelector('.vqc-avatar-option.selected')||$('vqcAvatarClose'))?.focus();
}
function avatarPurchaseLocal(avatar){
 if(ownsAvatar(avatar))return true;
 if(progress.coins<avatar.price)return false;
 progress=sanitize({...progress,purchasedAvatars:[...progress.purchasedAvatars,avatar.id]});
 localSave();render();
 return true;
}
async function purchaseAvatar(avatar){
 if(!avatar||ownsAvatar(avatar)||purchaseInFlight)return;
 if(progress.coins<avatar.price){
  setAvatarMessage('Chưa đủ xu để mua '+avatar.name+'.');
  return;
 }
 const remaining=progress.coins-avatar.price;
 if(!window.confirm('Mua '+avatar.name+' với '+formatCoins(avatar.price)+' Xu Kỳ Thủ? Sau khi mua còn '+formatCoins(remaining)+' xu.'))return;
 purchaseInFlight=true;
 refreshCharacterShop();
 clearTimeout(saveTimer); // Prevent an old progress save racing with this purchase.
 const ref=cloudRef();
 let synced=false;
 let failure=null;
 try{
  if(ref&&typeof db!=='undefined'&&typeof db.runTransaction==='function'){
   const purchased=await db.runTransaction(async transaction=>{
    const snap=await transaction.get(ref);
    const merged=mergeProgress(progress,snap.exists?snap.data():{});
    if(merged.purchasedAvatars.includes(avatar.id))return merged;
    if(merged.coins<avatar.price)throw new Error('NOT_ENOUGH_COINS');
    const next=sanitize({...merged,purchasedAvatars:[...merged.purchasedAvatars,avatar.id]});
    transaction.set(ref,progressPayload(next),{merge:true});
    return next;
   });
   progress=mergeProgress(progress,purchased);
   localSave();render();synced=true;
  }else{
   if(!avatarPurchaseLocal(avatar))throw new Error('NOT_ENOUGH_COINS');
  }
 }catch(error){
  failure=error;
  if(error?.message==='NOT_ENOUGH_COINS'){
   setAvatarMessage('Không đủ xu sau khi đồng bộ. Vui lòng kiểm tra ví xu.');
   try{
    const current=await ref?.get();
    if(current?.exists){progress=mergeProgress(progress,current.data());localSave();render();}
   }catch(ignore){}
   return;
  }
  // Offline or undeployed Firestore Rules: keep a local purchase.
  if(!avatarPurchaseLocal(avatar)){
   setAvatarMessage('Không đủ xu để hoàn tất giao dịch.');
   return;
  }
 }finally{
  purchaseInFlight=false;
  refreshCharacterShop();
 }
 if(!ownsAvatar(avatar)){
  setAvatarMessage('Giao dịch chưa thành công.');
  return;
 }
 applyAvatarSelection(avatar);
 setAvatarMessage(synced
  ?'🎉 Mua thành công '+avatar.name+'! Nhân vật đã trang bị và lưu vào tài khoản.'
  :'🎉 Đã mở khóa '+avatar.name+' trên thiết bị này! Cần cập nhật quyền Firebase để đồng bộ sang thiết bị khác.');
 if(!synced&&ref){
  // Retain purchase locally; ordinary saves retry cloud synchronisation later.
  saveProgress();
  if(failure)console.warn('Chưa lưu được giao dịch lên Firebase',failure);
 }
}
async function confirmAvatarChoice(){
 if(purchaseInFlight)return;
 if(ownsAvatar(previewAvatar)){
  applyAvatarSelection(previewAvatar);
  closeAvatarPicker();
 }else await purchaseAvatar(previewAvatar);
}
function initAvatarPicker(){
 if(avatarPickerInitialized)return;
 const modal=$('vqcAvatarModal'),trigger=$('vqcChangeAvatarBtn');
 if(!modal||!trigger||!$('playerAvatar'))return;
 avatarPickerInitialized=true;
 restoreAvatarSelection();
 trigger.addEventListener('click',openAvatarPicker);
 $('vqcCharacterShopOpen')?.addEventListener('click',openAvatarPicker);
 $('vqcAvatarClose')?.addEventListener('click',closeAvatarPicker);
 $('vqcAvatarConfirm')?.addEventListener('click',confirmAvatarChoice);
 modal.querySelectorAll('.vqc-avatar-option').forEach(button=>{
  button.addEventListener('click',()=>{
   chooseAvatar(AVAILABLE_AVATARS.find(avatar=>avatar.id===button.dataset.avatar));
  });
 });
 modal.addEventListener('click',event=>{if(event.target===modal)closeAvatarPicker();});
 modal.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closeAvatarPicker();return;}
  if(event.key!=='Tab')return;
  const buttons=[...modal.querySelectorAll('button:not([disabled])')];
  const first=buttons[0],last=buttons[buttons.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
}
window.vqcCloseAvatarModal=closeAvatarPicker;

const $=id=>document.getElementById(id);
function identity(){return window.accountProfile?.uid||null;}
function storageKey(){return 'vqc-adventure-v1-'+(identity()||'guest');}
function sanitize(data){
 const done=Array.isArray(data?.done)?[...new Set(data.done.filter(n=>Number.isInteger(n)&&n>=0&&n<QUESTIONS.length))].sort((a,b)=>a-b):[];
 const forestDone=Array.isArray(data?.forestDone)?[...new Set(data.forestDone.filter(p=>FOREST_PIECES.some(x=>x[0]===p)))]:[];
 const canyonDone=Array.isArray(data?.canyonDone)
  ?[...new Set(data.canyonDone.filter(key=>typeof key==='string'&&CANYON_GROUPS.some(g=>{
    if(!key.startsWith(g.kind+':'))return false;
    const index=Number(key.slice(g.kind.length+1));
    return Number.isInteger(index)&&index>=0&&index<g.count&&key===g.kind+':'+index;
   })))]
  :[];
 // Rewards are a permanent one-time record: 1,000 / 2,000 / ... / 7,000 Xu.
 // Keep earlier claims even if learners replay/reset a lesson.
 const rewarded=new Set(Array.isArray(data?.rewardedRegions)
  ?data.rewardedRegions.filter(n=>Number.isInteger(n)&&n>=0&&n<AVAILABLE_REWARD_REGIONS)
  :[]);
 if(done.length===QUESTIONS.length)rewarded.add(0);
 if(forestDone.length===FOREST_PIECES.length)rewarded.add(1);
 if(canyonDone.length===CANYON_TOTAL)rewarded.add(2);
 const rewardedRegions=[...rewarded].sort((a,b)=>a-b);
 const purchasedAvatars=Array.isArray(data?.purchasedAvatars)
  ?[...new Set(data.purchasedAvatars.filter(id=>PAID_AVATAR_IDS.includes(id)))]
  :[];
 const earnedCoins=rewardedRegions.reduce((sum,n)=>sum+REGION_COIN_REWARDS[n],0);
 const spentCoins=purchasedAvatars.reduce((sum,id)=>{
  const avatar=AVAILABLE_AVATARS.find(a=>a.id===id);
  return sum+(avatar?.price||0);
 },0);
 const coins=Math.max(0,earnedCoins-spentCoins);
 return {done,forestDone,canyonDone,rewardedRegions,purchasedAvatars,
  stars:done.length*3+forestDone.length*6+canyonDone.length*3,
  earnedCoins,spentCoins,coins};
}

function formatCoins(value){
 return new Intl.NumberFormat('vi-VN').format(Math.max(0,Number(value)||0));
}
function renderCoinWallet(){
 const container=$('vqcCoinRewardList');
 if(!container)return;
 container.replaceChildren();
 REGIONS.forEach((region,index)=>{
  const received=progress.rewardedRegions.includes(index);
  const available=index<AVAILABLE_REWARD_REGIONS;
  const row=document.createElement('div');
  row.className='vqc-coin-region'+(received?' is-received':!available?' is-unavailable':' is-pending');
  const badge=document.createElement('span');
  badge.className='vqc-coin-region__icon';
  badge.textContent=received?'✅':available?'🏝️':'🔒';
  badge.setAttribute('aria-hidden','true');
  const description=document.createElement('span');
  description.className='vqc-coin-region__description';
  const name=document.createElement('strong');
  name.textContent='Vùng '+(index+1)+' · '+region[1];
  const status=document.createElement('small');
  status.textContent=received?'Đã nhận thưởng':available?'Hoàn thành tất cả bài để nhận xu':'Sắp ra mắt';
  description.append(name,status);
  const amount=document.createElement('strong');
  amount.className='vqc-coin-region__amount';
  amount.textContent='+'+formatCoins(REGION_COIN_REWARDS[index])+' xu';
  row.append(badge,description,amount);
  container.appendChild(row);
 });
 const obtained=$('vqcCoinEarnedRegions');
 if(obtained)obtained.textContent=progress.rewardedRegions.length+'/7 vùng';
}
function closeCoinWallet(){
 const modal=$('vqcCoinModal');
 if(!modal||modal.hidden)return;
 modal.hidden=true;
 document.body.classList.remove('vqc-coin-wallet-open');
 if(coinWalletReturnFocus?.isConnected&&document.body.classList.contains('vqc-mode-world'))coinWalletReturnFocus.focus();
 coinWalletReturnFocus=null;
}
function openCoinWallet(){
 const modal=$('vqcCoinModal');
 if(!modal)return;
 coinWalletReturnFocus=document.activeElement;
 renderCoinWallet();
 modal.hidden=false;
 document.body.classList.add('vqc-coin-wallet-open');
 $('vqcCoinModalClose')?.focus();
}
function initCoinWallet(){
 if(coinWalletReady)return;
 const modal=$('vqcCoinModal'),button=$('vqcCoinWalletOpen');
 if(!modal||!button)return;
 coinWalletReady=true;
 button.addEventListener('click',openCoinWallet);
 $('vqcCoinModalClose')?.addEventListener('click',closeCoinWallet);
 $('vqcCoinModalDone')?.addEventListener('click',closeCoinWallet);
 modal.addEventListener('click',event=>{
  if(event.target===modal)closeCoinWallet();
 });
 modal.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
   event.preventDefault();closeCoinWallet();return;
  }
  if(event.key!=='Tab')return;
  const focusables=[...modal.querySelectorAll('button:not([disabled])')];
  const first=focusables[0],last=focusables[focusables.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
 renderCoinWallet();
}
function showCoinRewardToast(regions){
 const toast=$('vqcCoinsToast');
 if(!toast)return;
 const received=regions.reduce((sum,n)=>sum+REGION_COIN_REWARDS[n],0);
 const placeNames=regions.map(n=>'Vùng '+(n+1)).join(', ');
 toast.textContent='🏆 Chinh phục '+placeNames+'! +'+formatCoins(received)+' Xu Kỳ Thủ 🪙';
 toast.hidden=false;
 clearTimeout(coinToastTimer);
 coinToastTimer=setTimeout(()=>{toast.hidden=true;},6000);
}


function mergeProgress(...snapshots){
 const parts=snapshots.map(data=>data||{});
 return sanitize({
  done:parts.flatMap(data=>Array.isArray(data.done)?data.done:[]),
  forestDone:parts.flatMap(data=>Array.isArray(data.forestDone)?data.forestDone:[]),
  canyonDone:parts.flatMap(data=>Array.isArray(data.canyonDone)?data.canyonDone:[]),
  rewardedRegions:parts.flatMap(data=>Array.isArray(data.rewardedRegions)?data.rewardedRegions:[]),
  purchasedAvatars:parts.flatMap(data=>Array.isArray(data.purchasedAvatars)?data.purchasedAvatars:[])
 });
}
function progressPayload(data){
 return {
  studentId:identity(),
  done:[...data.done],forestDone:[...data.forestDone],canyonDone:[...data.canyonDone],
  rewardedRegions:[...data.rewardedRegions],purchasedAvatars:[...data.purchasedAvatars],
  stars:data.stars,updatedAt:firebase.firestore.FieldValue.serverTimestamp()
 };
}
function localLoad(){try{return sanitize(JSON.parse(localStorage.getItem(storageKey())||'{}'));}catch(e){return sanitize({});}}
function localSave(){try{localStorage.setItem(storageKey(),JSON.stringify(progress));}catch(e){console.warn('Không lưu được tiến độ trên thiết bị',e);}}
function cloudRef(){return identity()&&typeof db!=='undefined'?db.collection('adventureProgress').doc(identity()):null;}
async function loadProgress(){
 const accountKey=storageKey();
 progress=localLoad();
 lastAnnouncedRewards=new Set(progress.rewardedRegions);
 localSave();restoreAvatarSelection();render();
 const ref=cloudRef();
 if(!ref){setSaveStatus('Đăng nhập để đồng bộ tiến độ giữa các thiết bị.');return;}
 try{
  const snap=await ref.get();
  if(storageKey()!==accountKey)return;
  if(!snap.exists){
   cloudOk=true;
   if(progress.done.length||progress.forestDone.length||progress.canyonDone.length||progress.rewardedRegions.length||progress.purchasedAvatars.length)saveProgress();
   else setSaveStatus('Tiến độ lưu trên thiết bị.');
   return;
  }
  progress=mergeProgress(progress,snap.data());
  lastAnnouncedRewards=new Set(progress.rewardedRegions);
  localSave();restoreAvatarSelection();cloudOk=true;render();
  const remote=sanitize(snap.data());
  if(JSON.stringify(progress.rewardedRegions)!==JSON.stringify(remote.rewardedRegions)||
     JSON.stringify([...progress.purchasedAvatars].sort())!==JSON.stringify([...remote.purchasedAvatars].sort())||
     progress.done.length!==remote.done.length||
     progress.forestDone.length!==remote.forestDone.length||
     progress.canyonDone.length!==remote.canyonDone.length){
   saveProgress();
  }else setSaveStatus('Đã tải tiến độ và nhân vật trong tài khoản.');
 }catch(error){
  cloudOk=false;
  console.warn('Không thể tải tiến độ từ Firebase',error);
  setSaveStatus('Tiến độ đang lưu trên thiết bị này; chưa đồng bộ đám mây.');
 }
}
function saveProgress(){
 const newlyRewarded=progress.rewardedRegions.filter(n=>!lastAnnouncedRewards.has(n));
 lastAnnouncedRewards=new Set(progress.rewardedRegions);
 localSave();render();
 if(newlyRewarded.length)showCoinRewardToast(newlyRewarded);
 clearTimeout(saveTimer);
 const ref=cloudRef();
 if(!ref){setSaveStatus('Đã lưu trên thiết bị. Đăng nhập để lưu trực tuyến.');return;}
 const expectedAccount=storageKey();
 saveTimer=setTimeout(async()=>{
  try{
   let latest;
   if(typeof db.runTransaction==='function'){
    latest=await db.runTransaction(async transaction=>{
     const snapshot=await transaction.get(ref);
     const merged=mergeProgress(progress,snapshot.exists?snapshot.data():{});
     transaction.set(ref,progressPayload(merged),{merge:true});
     return merged;
    });
   }else{
    latest=progress;
    await ref.set(progressPayload(progress),{merge:true});
   }
   if(storageKey()!==expectedAccount)return;
   progress=mergeProgress(progress,latest);
   localSave();restoreAvatarSelection();render();
   cloudOk=true;setSaveStatus('✓ Đã lưu tiến độ, xu và nhân vật vào tài khoản.');
  }catch(error){
   cloudOk=false;
   console.warn('Không thể đồng bộ tiến độ và nhân vật',error);
   setSaveStatus('✓ Đã lưu trên thiết bị; đồng bộ tài khoản chưa khả dụng.');
  }
 },220);
}
function setSaveStatus(msg){if($('vqcAdventureSave'))$('vqcAdventureSave').textContent=msg;}
function unlocked(n){return n===0||progress.done.includes(n-1);}
// Coordinates are percentages of the same map surface as the SVG path.
// Hotspots aligned to the landmarks and circular stepping stones drawn
// directly on assets/map-background.jpg (1024 × 572).
const MAP_STOPS=[
 {x:19.8,y:77.5}, // 1 — Bến Cảng: đá cạnh cầu cảng
 {x:27.8,y:38.5}, // 2 — Rừng Sao: đá cạnh rừng
 {x:44.2,y:58.0}, // 3 — Hẻm Núi: đá trước dãy núi
 {x:58.6,y:75.4}, // 4 — Hang Động: đá phía trước hang
 {x:74.2,y:75.0}, // 5 — Núi Lửa: bệ xanh phía trước núi
 {x:59.5,y:42.5}, // 6 — Lâu Đài Trên Mây: bệ dưới lâu đài
 {x:78.5,y:37.5}  // 7 — Thành Trì: bệ xanh dưới thành
];
let selectedMapRegion=1;
let avatarPlaced=false;
let mapEventsReady=false;

function regionStatus(index){
 if(index===0){
  const done=progress.done.length;
  return done===QUESTIONS.length?'✓ Đã chinh phục':'▶ '+done+'/'+QUESTIONS.length+' thử thách';
 }
 if(index===1){
  const done=progress.forestDone.length;
  return done===FOREST_PIECES.length?'✓ Đã chinh phục':'▶ Đang chơi · '+done+'/'+FOREST_PIECES.length+' bài';
 }
 if(index===2){
  const done=progress.canyonDone.length;
  return done===CANYON_TOTAL?'✓ Đã chinh phục':'▶ Đang chơi · '+done+'/'+CANYON_TOTAL+' bài';
 }
 return '🔒 Sắp ra mắt';
}
function regionStars(index){
 if(index===0)return progress.done.length*3;
 if(index===1)return progress.forestDone.length*6;
 if(index===2)return progress.canyonDone.length*3;
 return 0;
}
function moveMapAvatar(index,animate=true){
 const map=$('vqcLevelMap'),avatar=$('vqcLevelAvatar'),pos=MAP_STOPS[index];
 if(!map||!avatar||!pos||map.clientWidth===0||map.clientHeight===0)return;
 const x=map.clientWidth*pos.x/100-avatar.offsetWidth/2;
 const y=map.clientHeight*pos.y/100-avatar.offsetHeight-13;
 if(!animate||!avatarPlaced){
  avatar.style.transition='none';
  avatar.style.transform='translate3d('+x+'px,'+y+'px,0)';
  requestAnimationFrame(()=>avatar.style.removeProperty('transition'));
 }else{
  avatar.style.transform='translate3d('+x+'px,'+y+'px,0)';
 }
 avatarPlaced=true;
}
function fillMapPopup(index){
 const popup=$('vqcLevelPopup'),map=$('vqcLevelMap'),region=REGIONS[index];
 if(!popup||!map||!region)return;
 $('vqcLevelPopupStage').textContent='VÙNG '+(index+1)+' · '+regionStatus(index);
 $('vqcLevelPopupTitle').textContent=region[0]+' '+region[1];
 $('vqcLevelPopupDescription').textContent=region[2];
 $('vqcLevelPopupProgress').textContent=
  index===0?'⭐ '+regionStars(index)+'/30 sao · '+progress.done.length+'/10 thử thách':
  index===1?'⭐ '+regionStars(index)+'/36 sao · '+progress.forestDone.length+'/6 bài':
  index===2?'⭐ '+regionStars(index)+'/39 sao · '+progress.canyonDone.length+'/13 bài':
  'Vùng đất chưa mở khóa';
 $('vqcLevelPopupPlay').hidden=index>2;
 popup.hidden=false;
 const pos=MAP_STOPS[index];
 const width=popup.offsetWidth||280,height=popup.offsetHeight||210;
 const mapWidth=map.clientWidth,mapHeight=map.clientHeight;
 const left=Math.max(12,Math.min(mapWidth-width-12,mapWidth*pos.x/100-width/2));
 const pointY=mapHeight*pos.y/100;
 const below=pointY<mapHeight/2;
 const top=Math.max(12,Math.min(mapHeight-height-12,below?pointY+78:pointY-height-100));
 popup.style.left=left+'px';
 popup.style.top=top+'px';
}
function hideMapPopup(){
 const popup=$('vqcLevelPopup');
 if(popup)popup.hidden=true;
}
function selectMapRegion(index){
 if(index>2)return;
 selectedMapRegion=index;
 document.querySelectorAll('#vqcAdventureRegions .vqc-level-node').forEach((button,i)=>{
  button.classList.toggle('is-selected',i===index);
  button.setAttribute('aria-pressed',String(i===index));
 });
 moveMapAvatar(index,true);
 fillMapPopup(index);
}
function prepareMapEvents(){
 if(mapEventsReady)return;
 mapEventsReady=true;
 const map=$('vqcLevelMap'),popup=$('vqcLevelPopup');
 $('vqcLevelPopupClose')?.addEventListener('click',hideMapPopup);
 $('vqcLevelPopupPlay')?.addEventListener('click',()=>{
  hideMapPopup();
  if(selectedMapRegion===0)openRegion();
  if(selectedMapRegion===1)openForest();
  if(selectedMapRegion===2)openCanyon();
 });
 map?.addEventListener('click',event=>{
  if(!event.target.closest('.vqc-level-node, .vqc-level-popup'))hideMapPopup();
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&popup&&!popup.hidden)hideMapPopup();
 });
 if(typeof ResizeObserver==='function'&&map){
  new ResizeObserver(()=>{
   if(!map.clientWidth)return;
   moveMapAvatar(selectedMapRegion,false);
   if(popup&&!popup.hidden)fillMapPopup(selectedMapRegion);
  }).observe(map);
 }
}
function showAdventureMap(){
 hideMapPopup();
 avatarPlaced=false;
 requestAnimationFrame(()=>{
  moveMapAvatar(selectedMapRegion,false);
  const scroller=$('vqcLevelScroll'),map=$('vqcLevelMap');
  if(scroller&&map&&scroller.clientWidth<map.clientWidth){
   const target=map.clientWidth*MAP_STOPS[selectedMapRegion].x/100-scroller.clientWidth/2;
   scroller.scrollLeft=Math.max(0,target);
  }
 });
}
function render(){
 const nodes=$('vqcAdventureRegions');if(!nodes)return;
 prepareMapEvents();
 nodes.replaceChildren();
 REGIONS.forEach((region,index)=>{
  const pos=MAP_STOPS[index];
  const isLocked=index>2;
  const isDone=index===0?progress.done.length===QUESTIONS.length:
   index===1?progress.forestDone.length===FOREST_PIECES.length:
   index===2?progress.canyonDone.length===CANYON_TOTAL:false;
  const button=document.createElement('button');
  button.type='button';
  button.className='vqc-level-node vqc-level-node--'+region[3]+
   (isLocked?' is-locked':isDone?' is-complete':' is-playing')+
   (selectedMapRegion===index?' is-selected':'');
  button.style.setProperty('--stop-x',pos.x+'%');
  button.style.setProperty('--stop-y',pos.y+'%');
  button.setAttribute('aria-pressed',String(selectedMapRegion===index));
  button.setAttribute('aria-label','Vùng '+(index+1)+': '+region[1]+'. '+regionStatus(index));
  button.disabled=isLocked;
  button.innerHTML=
   '<span class="vqc-level-node__medal" aria-hidden="true">'+
     (isLocked?'🔒':region[0])+
   '</span>'+
   '<span class="vqc-level-node__name">Vùng '+(index+1)+' · '+region[1]+'</span>'+
   '<span class="vqc-level-node__status">'+regionStatus(index)+'</span>';
  if(!isLocked)button.addEventListener('click',()=>selectMapRegion(index));
  nodes.appendChild(button);
 });
 $('vqcAdventureStars').textContent=String(progress.stars);
 const balance=formatCoins(progress.coins);
 if($('vqcCoinsBalance'))$('vqcCoinsBalance').textContent=balance;
 if($('vqcCoinCardBalance'))$('vqcCoinCardBalance').textContent=balance;
 if($('vqcMapHudCoins'))$('vqcMapHudCoins').textContent=balance;
 if($('vqcCoinWalletBalance'))$('vqcCoinWalletBalance').textContent=balance;
 renderCoinWallet();
 refreshCharacterShop();
 if($('vqcMapHudStars'))$('vqcMapHudStars').textContent=String(progress.stars);
 if($('vqcMapHudLessons'))$('vqcMapHudLessons').textContent=progress.done.length+'/'+QUESTIONS.length+' màn';
 if($('vqcMapHudProgress'))$('vqcMapHudProgress').style.width=(progress.done.length/QUESTIONS.length*100)+'%';
 if($('vqcForestProgress'))$('vqcForestProgress').textContent=progress.forestDone.length+'/'+FOREST_PIECES.length+' bài hoàn thành';
 renderForestCards();
 renderCanyonCards();
 $('vqcAdventureCount').textContent=progress.done.length+'/'+QUESTIONS.length;
 $('vqcAdventureProgress').style.width=(progress.done.length/QUESTIONS.length*100)+'%';
 if($('vqcAdventureStages')&&!$('vqcAdventurePlay').hidden)renderStages();
 if($('vqcLevelMap')?.clientWidth){
  requestAnimationFrame(()=>{
   moveMapAvatar(selectedMapRegion,false);
   if(!$('vqcLevelPopup').hidden)fillMapPopup(selectedMapRegion);
  });
 }
}
function renderStages(){
 const wrap=$('vqcAdventureStages');wrap.replaceChildren();
 QUESTIONS.forEach((q,i)=>{
  const button=document.createElement('button');button.type='button';button.className='vqc-stage'+(progress.done.includes(i)?' is-done':'')+(current===i?' is-current':'');
  button.textContent=progress.done.includes(i)?'★':String(i+1);
  button.title='Màn '+(i+1)+': '+q.title+(unlocked(i)?'':' (chưa mở khóa)');
  button.setAttribute('aria-label',button.title);button.disabled=!unlocked(i);
  button.onclick=()=>showStage(i);wrap.appendChild(button);
 });
}
// Ải 3 uses the original lesson dialogs and task arrays (5 + 8).
// Only completion badges and adventure progress are new.
function renderCanyonCards(){
 if(!$('vqcCanyonScreen'))return;
 let total=0;
 CANYON_GROUPS.forEach(group=>{
  const wrap=$(group.container);
  if(!wrap)return;
  wrap.replaceChildren();
  let count=0;
  for(let i=0;i<group.count;i++){
   const solved=progress.canyonDone.includes(group.kind+':'+i);
   if(solved)count++;
   const button=document.createElement('button');
   button.type='button';
   button.className='vqc-canyon-task'+(solved?' is-complete':'');
   const label=group.kind==='freecapture'?'Hình '+(43+i):'Bài '+(i+1);
   button.innerHTML='<span class="vqc-canyon-task__icon" aria-hidden="true">'+(solved?'🏆':'♟️')+
    '</span><strong>'+label+'</strong><small>'+(solved?'✓ Đã hoàn thành':'▶ Bắt đầu')+'</small>';
   button.setAttribute('aria-label',group.title+' · '+label+(solved?' · Đã hoàn thành':' · Chưa hoàn thành'));
   button.addEventListener('click',()=>openCanyonTask(group.kind,i));
   wrap.appendChild(button);
  }
  total+=count;
  const counter=$(group.kind==='capture'?'vqcCanyonCaptureCount':'vqcCanyonFreeCount');
  if(counter)counter.textContent=count+'/'+group.count;
 });
 if($('vqcCanyonDoneCount'))$('vqcCanyonDoneCount').textContent=total+'/'+CANYON_TOTAL;
 if($('vqcCanyonStarCount'))$('vqcCanyonStarCount').textContent=String(total*3);
 if($('vqcCanyonMeterFill'))$('vqcCanyonMeterFill').style.width=(total/CANYON_TOTAL*100)+'%';
}
function canyonMessage(message){
 const element=$('vqcCanyonMessage');
 if(element)element.textContent=message;
}
function openCanyon(){
 if(typeof roomRef!=='undefined'&&roomRef){
  if(typeof vqcNotify==='function')vqcNotify('Hãy rời phòng học trước khi khám phá Ải 3.','warning');
  return;
 }
 if(forestActive)closeForest();
 $('vqcAdventureMap').hidden=true;
 $('vqcAdventurePlay').hidden=true;
 if($('vqcForestScreen'))$('vqcForestScreen').hidden=true;
 $('vqcCanyonScreen').hidden=false;
 canyonActive=true;canyonCurrentKind=null;
 canyonMessage('Chọn một trong 13 bài gốc để ôn luyện. Mỗi bài hoàn thành lần đầu nhận 3 sao!');
 renderCanyonCards();
 $('vqcCanyonScreen').scrollIntoView({block:'start',behavior:'smooth'});
}
function openCanyonTask(kind,index){
 const group=CANYON_GROUPS.find(g=>g.kind===kind);
 if(!canyonActive||!group||!Number.isInteger(index)||index<0||index>=group.count)return;
 const fn=kind==='capture'?'captureOpen':'freeCaptureOpen';
 const overlay=$(kind==='capture'?'captureOverlay':'freeCaptureOverlay');
 try{
  if(typeof window[fn]!=='function'||!overlay)throw Error('Bài tập gốc chưa tải xong.');
  // Dialogs must live at body root so they remain visible above the island mode.
  if(overlay.parentElement!==document.body)document.body.appendChild(overlay);
  canyonCurrentKind=kind;
  window[fn](index);
  overlay.classList.add('open');
  const name=kind==='capture'?'Bài '+(index+1):'Hình '+(43+index);
  canyonMessage('Đang luyện '+group.title+' · '+name+'. Hoàn thành bài để nhận 3 sao!');
 }catch(error){
  canyonCurrentKind=null;
  console.error('Không mở được thử thách ăn quân:',error);
  canyonMessage('Không thể mở bài tập: '+(error?.message||String(error)));
  if(typeof vqcNotify==='function')vqcNotify('Chưa mở được bài: '+(error?.message||String(error)),'warning');
 }
}
function closeCanyon(){
 if(!canyonActive)return;
 canyonActive=false;canyonCurrentKind=null;
 // Closing a lesson must not leave a full-screen overlay covering the world.
 if($('captureOverlay')?.classList.contains('open')&&typeof captureClose==='function')captureClose();
 if($('freeCaptureOverlay')?.classList.contains('open')&&typeof freeCaptureClose==='function')freeCaptureClose();
 $('vqcCanyonScreen').hidden=true;
 $('vqcAdventureMap').hidden=false;
 render();
 showAdventureMap();
}
window.vqcAdventureCanyonBack=closeCanyon;
window.vqcIsAdventureCaptureActive=kind=>canyonActive&&(!kind||kind===canyonCurrentKind);
window.vqcAdventureCaptureCompleted=function(kind,index){
 const group=CANYON_GROUPS.find(g=>g.kind===kind);
 if(!canyonActive||canyonCurrentKind!==kind||!group||!Number.isInteger(index)||index<0||index>=group.count)return;
 const key=kind+':'+index;
 if(progress.canyonDone.includes(key)){
  canyonMessage('Đã hoàn thành bài này trước đó. Em có thể luyện lại!');
  return;
 }
 progress.canyonDone.push(key);
 progress=sanitize(progress);
 saveProgress();
 const label=kind==='capture'?'Bài '+(index+1):'Hình '+(43+index);
 canyonMessage('⭐ Chính xác! Hoàn thành '+label+' · +3 sao! Tiến độ: '+progress.canyonDone.length+'/'+CANYON_TOTAL+' bài.');
 if(progress.canyonDone.length===CANYON_TOTAL&&typeof vqcNotify==='function'){
  vqcNotify('🏆 Chúc mừng! Em đã vượt qua toàn bộ Hẻm Núi Chiến Thuật!','success');
 }
};

// Reuse the same chess-piece assets as the classroom board.
// Unicode chess characters inherit system fonts and render inconsistently.
function boardPieces(type){
 const pieces={};
 if(type==='start'){
  for(let x=0;x<8;x++){pieces['1'+x]='p';pieces['6'+x]='P';}
  ['r','n','b','q','k','b','n','r'].forEach((p,i)=>pieces['0'+i]=p);
  ['R','N','B','Q','K','B','N','R'].forEach((p,i)=>pieces['7'+i]=p);
 }
 if(type==='pawns')for(let x=0;x<8;x++){pieces['1'+x]='p';pieces['6'+x]='P';}
 const solo={king:'K',rook:'R',bishop:'B',knight:'N',queen:'Q',pawnmove:'P',check:'K'};
 if(solo[type])pieces[type==='pawnmove'?'60':'44']=solo[type];
 if(type==='check')pieces['04']='r';
 return pieces;
}
function renderBoard(type){
 const board=$('vqcAdventureBoard');
 if(!board)return;
 board.replaceChildren();
 const pieces=boardPieces(type);
 for(let r=0;r<8;r++)for(let col=0;col<8;col++){
  const cell=document.createElement('div');
  cell.className='vqc-adventure-square '+((r+col)%2?'dark':'light');
  const piece=pieces[''+r+col];
  if(piece){
   const pieceEl=document.createElement('span');
   pieceEl.className='vqc-adventure-piece';
   pieceEl.setAttribute('aria-label',(piece===piece.toUpperCase()?'Quân trắng ':'Quân đen ')+({P:'Tốt',R:'Xe',N:'Mã',B:'Tượng',Q:'Hậu',K:'Vua'}[piece.toUpperCase()]||''));
   if(typeof pieceSvgMarkup==='function')pieceEl.innerHTML=pieceSvgMarkup(piece);
   else pieceEl.textContent=({K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}[piece]||'');
   cell.appendChild(pieceEl);
  }
  board.appendChild(cell);
 }
}
function renderForestCards(){
 const wrap=$('vqcForestCards');if(!wrap)return;
 wrap.replaceChildren();
 FOREST_PIECES.forEach(([piece,icon,name])=>{
  const done=progress.forestDone.includes(piece);
  const btn=document.createElement('button');
  btn.type='button';btn.className='vqc-forest-card'+(done?' is-done':'');
  const pict=document.createElement('span');pict.className='vqc-forest-icon';pict.textContent=icon;
  const title=document.createElement('strong');title.textContent=name;
  const caption=document.createElement('small');caption.textContent=done?'✓ Đã thu thập đủ 6 sao':'⭐ Thu thập 6 ngôi sao';
  btn.append(pict,title,caption);
  btn.onclick=()=>openForestPiece(piece);wrap.appendChild(btn);
 });
}
function openForest(){
 if(typeof roomRef!=='undefined'&&roomRef){
  if(typeof vqcNotify==='function')vqcNotify('Hãy rời lớp trước khi chơi Vùng 2.','warning');
  return;
 }
 $('vqcAdventureMap').hidden=true;
 $('vqcAdventurePlay').hidden=true;
 $('vqcForestScreen').hidden=false;
 $('vqcForestGame').hidden=true;
 forestActive=true;
 renderForestCards();
}
function attachClassroomBoard(){
 const node=document.querySelector('section.center');
 const target=$('vqcForestBoardMount');
 if(!node||!target||typeof startPieceGame!=='function')throw Error('Chưa tải được bàn cờ nhặt sao.');
 if(!forestBoardNode){
  forestBoardNode=node;forestBoardParent=node.parentNode;forestBoardNext=node.nextSibling;
 }
 target.appendChild(node);
 node.classList.add('vqc-forest-board-active');
}
function restoreClassroomBoard(){
 if(!forestBoardNode)return;
 forestBoardNode.classList.remove('vqc-forest-board-active');
 if(forestBoardNext&&forestBoardNext.parentNode===forestBoardParent)forestBoardParent.insertBefore(forestBoardNode,forestBoardNext);
 else forestBoardParent.appendChild(forestBoardNode);
}
function openForestPiece(piece){
 if(!FOREST_PIECES.some(x=>x[0]===piece))return;
 if(typeof roomRef!=='undefined'&&roomRef)return;
 try{
  attachClassroomBoard();
  forestPiece=piece;
  $('vqcForestGame').hidden=false;
  $('vqcForestSelect').hidden=true;
  $('vqcForestGameTitle').textContent='🌳 Rừng Sao · '+FOREST_PIECES.find(x=>x[0]===piece)[2];
  startPieceGame(piece);
  $('vqcForestBoardMount').scrollIntoView({block:'nearest',behavior:'smooth'});
 }catch(e){
  console.error('Không mở được bài nhặt sao cũ',e);
  $('vqcForestGame').hidden=true;
  $('vqcForestSelect').hidden=false;
  if(typeof vqcNotify==='function')vqcNotify('Không mở được bài nhặt sao: '+e.message,'warning');
 }
}
function closeForestPiece(){
 if(typeof hideStarRewardLocal==='function')hideStarRewardLocal();
 if(typeof exitPieceGame==='function'&&forestPiece)exitPieceGame();
 forestPiece=null;
 restoreClassroomBoard();
 $('vqcForestGame').hidden=true;
 $('vqcForestSelect').hidden=false;
 renderForestCards();
}
function closeForest(){
 if(forestPiece)closeForestPiece();
 forestActive=false;
 $('vqcForestScreen').hidden=true;
 $('vqcAdventureMap').hidden=false;
 render();
 showAdventureMap();
}
window.vqcAdventureForestBack=closeForest;
window.vqcAdventureForestExit=closeForestPiece;
window.vqcAdventurePieceCompleted=function(piece){
 if(!forestActive||forestPiece!==piece||progress.forestDone.includes(piece))return;
 progress.forestDone.push(piece);
 progress=sanitize(progress);
 saveProgress();
 // Preserve the original 6-star reward dialog and its existing continue button.
};
window.vqcAdventureLeaveWorld=function(){
 closeCoinWallet();
 closeAvatarPicker();
 if(canyonActive)closeCanyon();
 if(forestActive)closeForest();
};

function openRegion(){
 if(canyonActive)closeCanyon();
 if(forestActive)closeForest();
 $('vqcAdventureMap').hidden=true;$('vqcAdventurePlay').hidden=false;
 const next=QUESTIONS.findIndex((q,i)=>!progress.done.includes(i)&&unlocked(i));
 showStage(next<0?QUESTIONS.length-1:next);
}
function showStage(index){
 if(!unlocked(index))return;
 current=index;answerLocked=false;
 const q=QUESTIONS[index];$('vqcAdventureStageTitle').textContent='Màn '+(index+1)+' · '+q.title;
 $('vqcAdventureQuestion').textContent=q.question;
 const choices=$('vqcAdventureAnswers');choices.replaceChildren();
 q.options.forEach((opt,i)=>{
  const btn=document.createElement('button');btn.type='button';btn.className='vqc-adventure-answer';btn.textContent=String.fromCharCode(65+i)+'. '+opt;btn.onclick=()=>choose(i);choices.appendChild(btn);
 });
 $('vqcAdventureFeedback').hidden=true;$('vqcAdventureFeedback').textContent='';
 $('vqcAdventureNext').hidden=true;renderBoard(q.board);renderStages();
}
function choose(choice){
 if(answerLocked)return;
 const q=QUESTIONS[current],correct=choice===q.answer;
 const buttons=[...$('vqcAdventureAnswers').children];
 buttons[choice].classList.add(correct?'correct':'incorrect');
 const fb=$('vqcAdventureFeedback');fb.hidden=false;
 if(!correct){fb.textContent='Chưa đúng rồi! Em hãy thử chọn đáp án khác nhé.';return;}
 answerLocked=true;buttons.forEach(b=>b.disabled=true);
 fb.textContent='🌟 Chính xác! '+q.explain;
 if(!progress.done.includes(current)){progress.done.push(current);progress=sanitize(progress);saveProgress();}
 $('vqcAdventureNext').hidden=false;
 $('vqcAdventureNext').textContent=current===QUESTIONS.length-1?'🏆 Xem thành tích':'Tiếp tục khám phá →';
}
function next(){
 if(current===QUESTIONS.length-1){closeRegion();return;}
 showStage(current+1);
}
function closeRegion(){$('vqcAdventurePlay').hidden=true;$('vqcAdventureMap').hidden=false;render();showAdventureMap();}
window.vqcAdventureStart=function(){
 if(avatarPickerInitialized)restoreAvatarSelection();
 if(typeof roomRef!=='undefined'&&roomRef){if(typeof vqcNotify==='function')vqcNotify('Hãy rời phòng học trước khi khám phá hòn đảo.','warning');return;}
 $('vqcAdventurePlay').hidden=true;$('vqcAdventureMap').hidden=false;
 if($('vqcForestScreen'))$('vqcForestScreen').hidden=true;
 if($('vqcCanyonScreen'))$('vqcCanyonScreen').hidden=true;
 forestActive=false;canyonActive=false;canyonCurrentKind=null;
 selectedMapRegion=1;
 loadProgress();
 showAdventureMap();
};
window.vqcAdventureBack=closeRegion;
window.vqcAdventureNext=next;
window.vqcAdventureReset=function(){
 if(!confirm('Em có muốn chơi lại từ màn đầu? Tiến độ cũ sẽ được đặt lại.'))return;
 progress=sanitize({rewardedRegions:progress.rewardedRegions,purchasedAvatars:progress.purchasedAvatars});saveProgress();closeRegion();
};
window.addEventListener('DOMContentLoaded',()=>{initCoinWallet();initAvatarPicker();if($('vqcAdventureRegions')){render();$('vqcAdventurePlay').hidden=true;}});
})();
