/* Hai không gian độc lập: lớp học đồng bộ và hành trình cá nhân.
   Không sử dụng dữ liệu bài tập lớp để ghi tiến độ khám phá. */
(function(){
 window.vqcCurrentLearningMode='home';
 const body=document.body;
 function mode(next){
  window.vqcCurrentLearningMode=next;
  body.classList.remove('vqc-mode-home','vqc-mode-class','vqc-mode-world');
  body.classList.add('vqc-mode-'+next);
  document.getElementById('vqcModeHome')?.setAttribute('aria-hidden',String(next!=='home'));
  document.getElementById('vqcModeWorld')?.setAttribute('aria-hidden',String(next!=='world'));
  if(next!=='class'){
   ['mateOverlay','mate3Overlay','pvpOverlay','captureOverlay','freeCaptureOverlay','defenseOverlay','pawnGameOverlay','checkOneOverlay','escapeOverlay','starRewardOverlay'].forEach(id=>document.getElementById(id)?.classList.remove('open'));
  }
  window.scrollTo?.(0,0);
 }
 window.vqcGoHome=function(){
  if(roomRef){vqcNotify('Hãy rời phòng trước khi quay về trang chủ.','warning');return;}
  mode('home');
 };
 window.vqcOpenWorld=function(){
  if(roomRef){vqcNotify('Hãy rời lớp trước khi khám phá vương quốc.','warning');return;}
  mode('world');
 };
 window.vqcEnterClass=function(){
  if(!window.accountProfile){showAccountPanel();return;}
  if(window.accountProfile.role==='teacher'||roomRef){mode('class');return;}
  document.getElementById('vqcJoinArea').hidden=false;
  document.getElementById('vqcJoinCode')?.focus();
 };
 window.vqcJoinFromLanding=async function(){
  const input=document.getElementById('vqcJoinCode'),code=input?.value.trim();
  if(!code){vqcNotify('Hãy nhập mã phòng do giáo viên cung cấp.','warning');return;}
  document.getElementById('roomCode').value=code;
  await joinRoom();
  if(roomRef){document.getElementById('vqcJoinArea').hidden=true;mode('class');}
 };
 const originalCreate=createRoom;
 createRoom=async function(){await originalCreate();if(roomRef)mode('class');};
 const originalJoin=joinRoom;
 joinRoom=async function(){await originalJoin();if(roomRef)mode('class');};
 const originalLeave=leaveClassroom;
 leaveClassroom=async function(){await originalLeave();if(!roomRef)mode('home');};
 // Trạng thái lớp không được dùng để mở khóa vùng đất.
 document.querySelectorAll('.lesson').forEach(el=>el.title=(el.title?el.title+' · ':'')+'Hoạt động dùng trong lớp học');
 mode('home');
})();