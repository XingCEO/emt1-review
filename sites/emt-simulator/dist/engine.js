import {SCENARIOS,ACTIONS} from './content.js';
export const ROLES={main:'主手',sub:'副手'};
export const fmt=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const actionMap=Object.fromEntries(ACTIONS.map(a=>[a.id,a]));
export function createState(id='ohca',mode='coach'){
 const sc=SCENARIOS.find(s=>s.id===id)||SCENARIOS[0];
 return {scenario:sc,mode,time:0,paused:false,speed:1,ended:false,p:{...sc.p},flags:{},times:{},done:{},observed:{},tasks:{main:null,sub:null},holds:{main:null,sub:null},log:[],issues:[],announcements:[],branch:'assessment',knownArrest:false,oxygen:null,cooling:0,deterioration:0,lastReassess:0,aed:{power:false,pads:false,analyses:0,result:null,cleared:false,next:0,shocks:0},cpr:{total:0,count:0,breaths:0,cycles:0,taps:[],rate:null,lastTap:null,pauseSince:null,started:null,interruptions:0},bvm:{last:null,total:0},physical:{rate:'',depth:'',recoil:'',placement:'',ventilation:''},events:{},seed:1};
}
export function addLog(s,who,text,kind='action',id=''){s.log.push({t:s.time,who,text,kind,id});}
export function issue(s,id,text,critical=false){if(!s.issues.some(i=>i.id===id)){s.issues.push({id,text,critical,t:s.time});addLog(s,'系統',text,critical?'danger':'warning',id);}}
export function has(s,id){return !!s.flags[id];}
export function holder(s,type){return Object.keys(s.holds).find(r=>s.holds[r]===type);}
function mark(s,id,role){s.flags[id]=true;s.times[id]??=s.time;s.done[id]=role;}
const needsTouch=id=>!['safe','ppe','help','bag','als','transport','handover','history','lastwell','opqrst','aed_power'].includes(id);
export function canStart(s,id,role){
 if(s.ended)return '本次演練已結束，請開始新一輪。';
 const a=actionMap[id];if(!a)return '找不到這項操作。';
 if(!['main','sub'].includes(role))return '請指定主手或副手。';
 if(s.tasks[role])return `${ROLES[role]}正在${actionMap[s.tasks[role].id].title}，完成後才能執行其他操作。`;
 if(needsTouch(id)&&!has(s,'safe'))return '尚未確認現場安全，先處理現場風險。';
 if(needsTouch(id)&&!has(s,'ppe_'+role))return `${ROLES[role]}還沒完成個人防護。`;
 const allowHold=(s.holds[role]==='cspine'&&['cspine','helmet','collar','airway','bpcheck','response','clear'].includes(id))||(s.holds[role]==='pressure'&&['pressure','tourniquet','clear'].includes(id))||(s.holds[role]==='cpr'&&['cpr','clear'].includes(id))||(s.holds[role]==='bvm'&&['bvm','clear','airway'].includes(id));
 if(s.holds[role]&&!allowHold)return `${ROLES[role]}正在持續${holdLabel(s.holds[role])}，先由另一位接手交接，不能直接放手去做其他事。`;
 if(['helmet','collar'].includes(id)){
  if(!holder(s,'cspine'))return '需要一人先手持頸椎減移，另一人再操作。';
  const other=role==='main'?'sub':'main';
  if(s.tasks[other]||s.holds[other]&&s.holds[other]!=='cspine')return '這是兩人操作，另一位必須能持續支撐與回應交接口令。';
 }
 if(id==='helmet'&&s.scenario.id!=='helmet')return '本情境沒有安全帽。';
 if(id==='airway'&&s.scenario.id==='helmet'&&!has(s,'helmet'))return '安全帽影響完整呼吸道檢查；兩人持續保護頸椎並先完成脫帽。若通氣立即受威脅，以救命處置優先。';
 if(id==='collar'&&!has(s,'neck'))return '先完成頸部檢查與尺寸評估。';
 if(id==='oral'){
  if(!has(s,'glucose'))return '先測血糖。';
  if(s.p.glucose>=70)return '目前沒有已確認的低血糖口服適應情境，請重新評估。';
  if(!has(s,'swallow')||s.p.gcs<14||s.p.rr<10)return '未確認清醒且安全吞嚥，禁止口服糖。維持 ABC、請求進階支援與後送。';
 }
 if(id==='recheck_glucose'&&!has(s,'oral'))return '先完成低血糖評估與適當處置；目前可用「血糖監測」重測。';
 if(id==='splint'&&!has(s,'psm'))return '先記錄固定前遠端脈搏、感覺與運動（PSM）。';
 if(id==='psm_after'&&!has(s,'splint')&&!has(s,'collar'))return '固定完成後才進行「固定後」PSM。';
 if(id==='amputated'&&!has(s,'tourniquet'))return '先控制患者斷端出血，再包裝斷肢。';
 if(id==='tourniquet'&&!['bleed','amputation'].includes(s.scenario.id))return '這個情境沒有適合止血帶的肢體致命出血。';
 if(id==='opa'&&(s.p.gcs>3||s.p.rr>0&&s.branch!=='ventilation'))return '患者有反應，不能把 OPA 硬塞入；重新評估適應症與嘔吐反射。';
 if(id==='npa'&&s.scenario.type==='創傷')return '先排除疑顱底骨折等禁忌；本創傷情境優先徒手呼吸道與受訓支持。';
 if(id==='cpr'&&s.p.hr>0)return '患者仍有脈搏，不能胸外按壓。通氣不足時用 BVM。';
 if(id==='bvm'&&s.p.hr>0&&s.p.rr>=10)return '患者目前仍能通氣；先評估呼吸作功與適當給氧，不做不必要的強迫通氣。';
 if(id==='bvm'&&!has(s,'airway_open'))return '先檢查並暢通呼吸道，面罩與氣囊不能取代暢通呼吸道。';
 if(id==='aed_pads'&&!s.aed.power)return '先將 AED 開機。';
 if(id==='aed_analyze'&&!s.aed.pads)return '先貼片、接線，準備分析。';
 if(id==='clear'&&Object.values(s.tasks).some(t=>t&&needsTouch(t.id)))return '另一位還在接觸患者進行操作，先中止／完成該操作，再清場。';
 if(['aed_analyze','shock'].includes(id)&&(!s.aed.cleared||Object.values(s.holds).some(Boolean)))return '尚未清場，仍有人接觸患者。先完成「AED 清場」。';
 if(id==='aed_analyze'&&s.p.hr>0)return '患者有脈搏，這不是 AED 分析適應情境。持續監測與評估。';
 if(id==='shock'&&s.aed.result!=='shock')return 'AED 尚未指示電擊，不能自行電擊。';
 if(id==='ecg'&&s.p.hr===0)return '已心跳停止，先 CPR＋AED；十二導程不能延誤急救。';
 if(id==='secondary'&&s.p.hr===0)return '心跳停止時先 CPR＋AED，不可跳到完整二度檢查。';
 return null;
}
export function holdLabel(id){return {cspine:'頸椎減移',pressure:'直接加壓',cpr:'胸外按壓',bvm:'BVM 密合／通氣'}[id]||id;}
export function startAction(s,id,role,options={}){
 const error=canStart(s,id,role);if(error){issue(s,'attempt_'+id+'_'+error,error,['oral','cpr','shock','aed_analyze'].includes(id));return {ok:false,message:error};}
 const a=actionMap[id];
 if(s.paused)s.paused=false;
 if(id==='clear'){
  Object.keys(s.holds).forEach(r=>{if(s.holds[r])addLog(s,r,`停止接觸：${holdLabel(s.holds[r])}`,'info');s.holds[r]=null;});
  s.cpr.pauseSince??=s.time;
 }
 s.tasks[role]={id,remaining:a.sec,total:a.sec,options};
 if(['helmet','collar'].includes(id)){const other=role==='main'?'sub':'main';s.tasks[other]={id,remaining:a.sec,total:a.sec,options,secondary:true};}
 addLog(s,role,`開始：${a.title}`,'start',id);
 return {ok:true,message:`${ROLES[role]}：${a.title}`};
}
function observedVitals(s){s.observed.vitals={...s.p,t:s.time};}
export function finishAction(s,id,role,opt={}){
 const a=actionMap[id];mark(s,id,role);addLog(s,role,`完成：${a.title}`,'action',id);
 if(id==='ppe'){mark(s,'ppe_'+role,role);return;}
 if(['response','gcs'].includes(id)){s.observed.conscious={gcs:s.p.gcs,text:s.scenario.response,t:s.time};}
 if(id==='xcheck'){s.observed.bleeding=['bleed','amputation'].includes(s.scenario.id)&&!has(s,'tourniquet')?'致命肢體外出血，現在處理。':'目前未見致命外出血。';if(s.observed.bleeding.startsWith('致命'))notice(s,'先止血','發現致命外出血：停下例行順序，立即加壓／止血帶。');}
 if(id==='cspine'||id==='pressure'){
  const type=id==='cspine'?'cspine':'pressure',old=holder(s,type);
  if(old&&old!==role){s.holds[old]=null;addLog(s,role,`「我已接穩${holdLabel(type)}。」${ROLES[old]}確認後放手。`,'handoff');}
  s.holds[role]=type;
 }
 if(id==='airway'){s.observed.airway=s.scenario.airway;mark(s,'airway_open',role);if(s.scenario.type==='創傷'&&!holder(s,'cspine'))issue(s,'neck_absent','創傷呼吸道操作時未安排頸椎保護；應同步維持適當減移。');}
 if(['bpcheck','reassess','postcheck'].includes(id)){
  s.observed.breathing={rr:s.p.rr,text:s.p.rr===0?'沒有正常呼吸；瀕死喘息不算正常呼吸。':s.p.rr<10?'呼吸淺慢，通氣不足。':s.scenario.breathing,t:s.time};
  s.observed.pulse={hr:s.p.hr,text:s.p.hr===0?'沒有確定脈搏。':'摸得到脈搏。',t:s.time};
  s.lastReassess=s.time;mark(s,'pulsechecked',role);
  if(s.p.hr===0){s.branch='arrest';s.knownArrest=true;notice(s,'轉入 OHCA','沒有正常呼吸、沒有確定脈搏：現在開始／繼續 CPR＋AED。');}
  else if(s.p.rr<10){s.branch='ventilation';s.knownArrest=false;notice(s,'轉入呼吸支持','有脈搏但呼吸不足：BVM 每 6 秒一口，約每 2 分鐘重評脈搏。');}
  else {s.branch=has(s,'cpr')?'rosc':'assessment';s.knownArrest=false;if(has(s,'cpr'))notice(s,'有脈搏且能正常呼吸','停止不必要胸外按壓，持續監測、ABC、支援與後送。');}
  if(id==='postcheck'&&s.aed.analyses===1&&s.aed.result==='no-shock'&&s.p.hr===0)issue(s,'first_noshock_check','第一次不建議電擊，應立即回 CPR，避免額外檢查中斷。');
  if(id==='reassess'){observedVitals(s);if(s.scenario.id==='chestinjury'&&has(s,'chestseal'))mark(s,'chest_recheck',role);}
 }
 if(id==='lung')s.observed.lung=s.p.rr<10?'通氣明顯不足，胸部起伏微弱。':s.scenario.breathing;
 if(id==='vitals')observedVitals(s);
 if(['glucose','recheck_glucose'].includes(id)){
  s.observed.glucose={value:s.p.glucose,t:s.time};
  if(id==='recheck_glucose'&&s.time-s.times.oral<900)issue(s,'glucose_early','口服後尚未約 15 分鐘；此次可記錄，但仍需後續按時重測。');
 }
 if(id==='swallow')s.observed.swallow=s.p.gcs>=14&&s.p.rr>=10?'可依指令、能安全吞嚥。':'不符合安全吞嚥，禁止口服。';
 if(id==='history'||id==='opqrst')s.observed.history=s.scenario.history;
 if(id==='lastwell')s.observed.lastwell='最後正常 09:10；發現異常 10:00。';
 if(id==='gfast')s.observed.gfast=s.scenario.id==='stroke'?'眼球追視偏向一側；左嘴角下垂、左手下落、說話含糊，疑似中風。':'本情境未發現典型單側異常，仍須結合病史與血糖。';
 if(id==='oxygen'){
  const device=opt.device||'nrm',flow=Number(opt.flow||15);s.oxygen={device,flow};
  const range={nc:[1,6],simple:[6,10],nrm:[10,15]}[device];
  if(!range||flow<range[0]||flow>range[1]){issue(s,'oxygen_flow','給氧流量不符本教材裝置範圍，請重新設定；簡單面罩流量不足有再吸入風險。',true);s.oxygen=null;s.flags.oxygen=false;}
  if(!has(s,'airway'))issue(s,'oxygen_before_airway','尚未先確認呼吸道；給氧前後都必須維持暢通。');
 }
 if(id==='oral')notice(s,'低血糖處置後','持續觀察意識，口服後約 15 分鐘重測；不能因此取消後送評估。');
 if(id==='tourniquet'){s.flags.bleeding_controlled=true;if(holder(s,'pressure'))s.holds[holder(s,'pressure')]=null;s.observed.bleeding=`出血已停止，止血帶時間 ${fmt(s.time)}。`;}
 if(id==='bleedcheck')s.observed.bleeding=has(s,'tourniquet')?'重查：出血停止，止血帶固定。':holder(s,'pressure')?'加壓中仍出血，需要升級止血。':'出血仍持續！';
 if(id==='helmet'){s.flags.helmet_removed=true;addLog(s,'雙人','副手接下顎／枕部 →「已接穩」→主手脫帽 →主手接回頭部減移。','handoff');s.holds.main='cspine';s.holds.sub=null;}
 if(id==='collar')s.observed.neck='頸圈已戴妥，仍持續適當減移。';
 if(id==='neck')s.observed.neck=s.scenario.id==='helmet'?'頸椎壓痛；氣管居中、未見明顯頸靜脈怒張。':'氣管居中，需配合神經與創傷評估。';
 if(id==='psm'||id==='psm_after')s.observed.psm='遠端脈搏、感覺與運動存在；固定後持續追蹤。';
 if(id==='burncheck')s.observed.burn='右前臂局部熱燙傷，無吸入傷線索。其他機轉需另外評估。';
 if(id==='cover'&&s.cooling<1200){issue(s,'cool_short','局部熱燙傷尚未冷卻約 20 分鐘；如因 ABC、後送或低體溫停止，交接時說明原因。');}
 if(id==='chestseal')s.observed.chest='已處理開放胸傷，須重評肺音、呼吸與血氧；惡化時評估鬆開／移除。';
 if(id==='seal_release'){s.flags.chestseal=false;s.deterioration=Math.max(0,s.deterioration-15);}
 if(id==='secondary'&&isCritical(s)&&!has(s,'transport'))issue(s,'secondary_transport','危急患者尚未啟動後送準備，就進入完整二度評估；應並行處理。');
 if(id==='bvm'){
  const old=holder(s,'bvm');if(old&&old!==role){s.holds[old]=null;addLog(s,role,'接妥 BVM，確認密合後交接。','handoff');}
  s.holds[role]='bvm';s.aed.cleared=false;
 }
 if(id==='cpr'){
  if(!has(s,'bpcheck')&&!has(s,'postcheck')&&!has(s,'reassess'))issue(s,'cpr_unassessed','開始按壓前未完成呼吸與脈搏評估。',true);
  const old=holder(s,'cpr');if(old&&old!==role){s.holds[old]=null;addLog(s,role,'接手按壓，減少交接中斷。','handoff');}
  s.holds[role]='cpr';s.cpr.started??=s.time;s.cpr.pauseSince=null;s.aed.cleared=false;
  s.branch='arrest';s.knownArrest=true;
 }
 if(id==='aed_power')s.aed.power=true;
 if(id==='aed_pads')s.aed.pads=true;
 if(id==='clear')s.aed.cleared=true;
 if(id==='aed_analyze'){
  s.aed.analyses++;s.aed.next=s.time+120;
  s.aed.result=['VF','pVT'].includes(s.scenario.rhythm||s.events.rhythm||'PEA')&&s.p.hr===0?'shock':'no-shock';
  notice(s,'AED 分析結果',s.aed.result==='shock'?'建議電擊：維持清場，依指示電擊。':'不建議電擊：沒有確定脈搏就立即 CPR，不能推定已恢復心跳。');
 }
 if(id==='shock'){s.aed.shocks++;s.aed.result=null;s.aed.cleared=false;s.cpr.pauseSince=s.time;notice(s,'電擊完成','立即恢復 CPR，直到下次 AED 提示，減少按壓中斷。');}
 if(id==='transport')notice(s,'後送準備啟動','必要處置與評估繼續；完成通報後，可按「交接／結束演練」看回放。');
}
export function notice(s,title,text){s.announcements.push({t:s.time,title,text});if(s.announcements.length>12)s.announcements.shift();addLog(s,'考官',`${title}：${text}`,'branch');}
export function advance(s,seconds=1){
 if(s.ended)return;
 for(let i=0;i<seconds;i++){
  s.time++;
  const completed=[];
  for(const role of ['main','sub']){const task=s.tasks[role];if(task&&--task.remaining<=0){if(!task.secondary)completed.push([task.id,role,task.options]);s.tasks[role]=null;}}
  for(const [id,role,opt]of completed)finishAction(s,id,role,opt);
  if(has(s,'cool')&&!has(s,'cover'))s.cooling++;
  if(s.p.hr>0){
   const threat=['allergy','asthma','bleed','amputation','chestinjury'].includes(s.scenario.id);
   const treated=['bleed','amputation'].includes(s.scenario.id)?has(s,'tourniquet'):!!s.oxygen&&has(s,'airway');
   if(threat&&!treated)s.deterioration+=.22;
   else if(treated)s.deterioration=Math.max(0,s.deterioration-.18);
   if(s.deterioration>36&&!s.events.worse){s.events.worse=true;s.p.gcs=Math.max(3,s.p.gcs-3);s.p.rr=8;s.p.sbp=Math.max(55,s.p.sbp-20);s.p.spo2=Math.max(65,s.p.spo2-8);notice(s,'患者狀況改變','患者突然更嗜睡，呼吸淺慢。現在需要重新評估 ABC 與脈搏。這是教學事件。');}
   if(s.deterioration>70&&!s.events.arrest)inject(s,'arrest');
   if(s.oxygen&&s.p.rr>=10&&s.time%10===0)s.p.spo2=Math.min(98,s.p.spo2+1);
   if(has(s,'oral')&&s.time-s.times.oral>=180&&s.p.glucose<80){s.p.glucose=85;s.p.gcs=15;if(!s.events.sugar){s.events.sugar=true;notice(s,'患者反應改變','患者回答變清楚、手抖減少。需要重評並按時重測血糖。');}}
  }
  if(s.p.hr===0&&s.cpr.total>0&&s.cpr.lastCompressionTime!==undefined&&s.time-s.cpr.lastCompressionTime>10&&!Object.values(s.tasks).some(t=>t?.id==='aed_analyze'))issue(s,'cpr_longpause','距離上次按壓已超過 10 秒，應縮短分析、通氣或其他操作造成的停頓。',true);
  if(s.aed.next&&s.time>=s.aed.next&&!s.events['aed_'+s.aed.next]){s.events['aed_'+s.aed.next]=true;notice(s,'AED 提示','約 2 分鐘已到，準備清場並再次分析；維持按壓直到分析需要暫停。');}
  if(s.branch==='ventilation'&&s.p.hr>0&&s.time-s.lastReassess>=120)issue(s,'vent_recheck','有脈搏的呼吸支持已約 2 分鐘，應重評脈搏。');
 }
}
export function compression(s,nowMs){
 const role=holder(s,'cpr');if(!role)return {ok:false,message:'先由一位開始／接手胸外按壓。'};
 if(s.p.hr>0)return {ok:false,message:'患者有脈搏，停止按壓並重評。'};
 if(s.aed.cleared||Object.values(s.tasks).some(t=>t?.id==='aed_analyze')){issue(s,'touch_analysis','分析／電擊時仍接觸患者。',true);s.aed.cleared=false;return {ok:false,message:'分析／電擊時不能碰觸。'};}
 if(s.cpr.count>=30)return {ok:false,message:'已按 30 下，暫停並由副手給 2 口有效通氣。'};
 if(s.cpr.lastTap!==null&&nowMs-s.cpr.lastTap<180)return {ok:false,message:'按得過快；每分鐘目標 100–120 下。'};
 if(s.cpr.lastTap!==null){s.cpr.taps.push(nowMs-s.cpr.lastTap);if(s.cpr.taps.length>12)s.cpr.taps.shift();s.cpr.rate=Math.round(60000/(s.cpr.taps.reduce((a,b)=>a+b,0)/s.cpr.taps.length));}
 s.cpr.lastTap=nowMs;s.cpr.lastCompressionTime=s.time;s.cpr.total++;s.cpr.count++;
 if(s.cpr.count===30){s.cpr.breaths=0;s.cpr.pauseSince=s.time;addLog(s,role,'30 下按壓完成，等待 2 口 BVM。','cycle');}
 return {ok:true};
}
export function breath(s,nowMs){
 const role=holder(s,'bvm');if(!role)return {ok:false,message:'先準備 BVM 並由一人密合。'};
 if(s.aed.cleared||Object.values(s.tasks).some(t=>t?.id==='aed_analyze'))return {ok:false,message:'分析／電擊中不可通氣或接觸患者。'};
 if(s.p.hr===0&&s.cpr.count<30){issue(s,'bvm_early','未完成 30 下就通氣，打斷 30:2 節奏。');return {ok:false,message:'這是無進階呼吸道 CPR，先完成 30 下。'};}
 if(s.bvm.last!==null&&nowMs-s.bvm.last<(s.p.hr===0?1000:5000)){issue(s,'bvm_fast','通氣過快：CPR 每口約 1 秒；有脈搏呼吸不足每 6 秒一口。');return {ok:false,message:'請放慢通氣，避免過度通氣。'};}
 s.bvm.last=nowMs;s.bvm.total++;mark(s,'effective_bvm',role);
 if(s.p.hr===0){s.cpr.breaths++;if(s.cpr.breaths===2){s.cpr.cycles++;s.cpr.count=0;s.cpr.breaths=0;s.cpr.lastTap=null;s.cpr.taps=[];s.cpr.pauseSince=null;addLog(s,role,'2 口通氣完成，立即接續按壓。','cycle');}}
 else {s.p.spo2=Math.min(97,s.p.spo2+2);addLog(s,role,'有脈搏呼吸不足：給 1 口 BVM，觀察胸起。','ventilation');}
 return {ok:true};
}
export function inject(s,type){
 if(type==='arrest'){s.p.hr=0;s.p.rr=0;s.p.sbp=0;s.p.dbp=0;s.p.gcs=3;s.events.arrest=true;s.events.rhythm='VF';s.branch='change';s.knownArrest=false;notice(s,'患者突然無反應','胸部沒有正常起伏；需立即評估呼吸與脈搏，再轉入正確流程。');}
 if(type==='resp'){s.p.rr=6;s.p.gcs=6;s.p.spo2=78;if(!s.p.hr)s.p.hr=72;s.branch='change';notice(s,'患者呼吸淺慢','有無脈搏要重新檢查；不能只靠血氧決定胸外按壓。');}
 if(type==='rosc'){s.p.hr=78;s.p.sbp=106;s.p.dbp=68;s.p.rr=8;s.p.gcs=6;s.events.rhythm='NSR';s.aed.result=null;s.branch='change';notice(s,'出現生命跡象','患者開始有動作。快速重評脈搏與正常呼吸，不能只靠動作推定穩定。');}
 if(type==='normal'){s.p.hr=82;s.p.rr=18;s.p.spo2=96;s.p.sbp=116;s.p.dbp=74;s.p.gcs=14;s.branch='change';notice(s,'呼吸／反應改變','患者胸部開始規律起伏，需重評後決定後續照護。');}
 if(type==='noshock'){s.scenario={...s.scenario,rhythm:'PEA'};s.events.rhythm='PEA';notice(s,'考官設定','下一次分析將呈不可電擊心律。這不代表有脈搏。');}
 if(type==='sealworse'){s.p.rr=36;s.p.spo2=76;s.p.sbp=74;notice(s,'敷料後呼吸惡化','重新評估胸傷敷料、ABC，準備支援與快速後送。');}
 if(type==='unconscious'){s.p.gcs=3;s.p.rr=14;s.flags.swallow=false;notice(s,'患者意識變差','現在無法依指令吞嚥；重新評估 ABC，禁止口服。');}
}
export function isCritical(s){return s.p.gcs<14||s.p.rr>=30||s.p.rr<10||s.p.hr>150||s.p.hr<50||s.p.sbp<90||s.p.sbp>220||s.p.spo2<90||s.scenario.id==='stroke'||s.scenario.id==='chest'||['bleed','amputation','chestinjury'].includes(s.scenario.id);}
export function guidance(s){
 const main=[],sub=[];
 for(const r of ['main','sub']){if(!has(s,'ppe_'+r))(r==='main'?main:sub).push('ppe');}
 if(!has(s,'safe'))main.unshift('safe');
 if(!has(s,'help'))main.push('help');
 if(!has(s,'bag'))sub.push('bag');
 if(s.scenario.type==='創傷'&&!has(s,'cspine')&&s.scenario.id==='helmet')sub.push('cspine');
 if(['bleed','amputation'].includes(s.scenario.id)&&!has(s,'tourniquet')){if(!has(s,'xcheck'))main.push('xcheck');if(!has(s,'pressure'))main.push('pressure');else sub.push('tourniquet');}
 if(!has(s,'response'))main.push('response');
 if(s.scenario.id==='helmet'&&!has(s,'helmet')&&holder(s,'cspine'))main.push('helmet');
 if(!has(s,'airway'))main.push('airway');
 if(!has(s,'bpcheck'))main.push('bpcheck');
 if(s.branch==='change'){main.unshift('bpcheck');}
 if(s.knownArrest&&s.p.hr===0){
  if(!holder(s,'cpr'))main.push('cpr');
  if(!s.aed.power)sub.push('aed_power');else if(!s.aed.pads)sub.push('aed_pads');else if(!s.aed.analyses||s.time>=s.aed.next){if(!s.aed.cleared)sub.push('clear');else sub.push('aed_analyze');}
  if(s.aed.result==='shock')sub.unshift('shock');
  if(s.aed.result==='no-shock'&&s.aed.analyses>1)main.unshift('postcheck');
  if(!has(s,'opa')&&s.aed.analyses)sub.push('opa');
  if(!has(s,'bvm')&&s.aed.analyses)sub.push('bvm');
 }else if(s.branch==='ventilation'){if(!holder(s,'bvm'))sub.unshift('bvm');if(s.time-s.lastReassess>=120)main.unshift('bpcheck');}
 else if(has(s,'bpcheck')){
  if(!has(s,'vitals'))sub.push('vitals');
  for(const id of s.scenario.required){if(!has(s,id)&&!['cpr','aed_power','aed_pads','aed_analyze','bvm','opa','postcheck'].includes(id))(actionMap[id]?.role==='sub'?sub:main).push(id);}
  if(isCritical(s)&&!has(s,'als'))main.unshift('als');
  if(!has(s,'transport'))sub.push('transport');
  if(!has(s,'history'))sub.push('history');
  if(!has(s,'reassess'))main.push('reassess');
  if(!has(s,'handover'))sub.push('handover');
 }
 return {main:[...new Set(main)],sub:[...new Set(sub)]};
}
export function score(s){
 const base=['safe','ppe_main','ppe_sub','help','response','airway','bpcheck'];
 const required=[...new Set([...base,...s.scenario.required,'transport','handover','reassess'])];
 const checks=required.map(id=>({id,title:actionMap[id]?.title||({'ppe_main':'主手個人防護','ppe_sub':'副手個人防護'}[id]),done:has(s,id),who:s.done[id],t:s.times[id]}));
 const points=Math.max(0,Math.round(checks.filter(c=>c.done).length/checks.length*100)-s.issues.filter(i=>i.critical).length*10-s.issues.filter(i=>!i.critical).length*3);
 return {checks,points,ohca:s.scenario.id==='ohca'?ohcaScore(s):null};
}
export function ohcaScore(s){
 const rating=ids=>ids.every(id=>has(s,id))?0:ids.some(id=>has(s,id))?1:2;
 const rows=[{name:'1 現場安全、防護、人數、求援',deduct:rating(['safe','ppe_main','ppe_sub','help'])},{name:'2 呼叫、拍肩、反應測試',deduct:rating(['response'])},{name:'3 暢通呼吸道、呼吸評估、備 BVM',deduct:rating(['airway','bpcheck','bag'])},{name:'4 脈搏、備 AED、開始 CPR',deduct:rating(['bpcheck','cpr','aed_power'])}];
 const f=s.physical;
 const num=(v,min,max,badmin,badmax)=>v===''?null:Number(v)>=min&&Number(v)<=max?0:Number(v)>=badmin&&Number(v)<=badmax?1:2;
 const core=[{name:'5 AED 操作與清場',rating:has(s,'aed_analyze')&&has(s,'clear')&&!s.issues.some(i=>i.id==='touch_analysis')?0:2},
 {name:'6 按壓位置（教官實測）',rating:f.placement===''?null:Number(f.placement)},
 {name:'7 頻率（QCPR／教官）',rating:num(f.rate,100,120,90,130)},
 {name:'8 深度達標率（QCPR）',rating:num(f.depth,90,100,75,100)},
 {name:'9 胸回彈率（QCPR）',rating:num(f.recoil,90,100,75,100)}];
 const bad=core.filter(c=>c.rating===2).length,minor=core.filter(c=>c.rating===1).length;
 const coreDeduct=bad||minor>=2?10:minor?6:0;
 const bvmRating=f.ventilation===''?null:Number(f.ventilation);
 rows.push({name:'5–9 BLS 核心技能綜合加權',deduct:core.some(c=>c.rating===null)?null:coreDeduct});
 rows.push({name:'10 BVM、30:2 與有效胸起',deduct:!has(s,'effective_bvm')?2:bvmRating});
 rows.push({name:'11 口咽呼吸道操作',deduct:rating(['opa'])});
 rows.push({name:'12 後續不電擊之重評分支',deduct:rating(['postcheck'])});
 rows.push({name:'病史詢問',deduct:has(s,'history')?0:1});
 const known=rows.filter(r=>r.deduct!==null).reduce((n,r)=>n+r.deduct,0);
 return {rows,core,knownDeduction:known,score:rows.some(r=>r.deduct===null)?null:Math.max(0,25-known),ceiling:Math.max(0,25-known),pending:core.filter(c=>c.rating===null).length+(bvmRating===null?1:0)};
}
