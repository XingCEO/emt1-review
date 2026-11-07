import {ACTIONS} from './content.js';
import {createState,startAction,advance,inject,holder,addLog} from './engine.js';
const act=(id,role)=>({id,role});
export const INTRO_STEPS=[
 {title:'先看現場安不安全',who:'主手',main:'觀察現場風險，確認可以接近。',sub:'先等安全確認，準備個人防護。',why:'先保護自己，才能靠近患者。這一頁只要做現場安全這件事。',say:'環境安全，確認可以接近。',button:'主手：確認現場安全',recipe:[[act('safe','main')]],result:'現場確認安全。下一步是兩人各自做好防護。'},
 {title:'兩個人都要做好防護',who:'主手＋副手',main:'戴好自己的手套、口罩。',sub:'也要戴好自己的手套、口罩。',why:'主手戴了，不代表副手也完成。兩人的防護各算各的。',say:'主副手個人防護完成。',button:'兩人各自完成防護',recipe:[[act('ppe','main'),act('ppe','sub')]],result:'兩人的個人防護都完成了。'},
 {title:'主手求援，副手拿器材',who:'兩人同時做不同的事',main:'確認患者人數，指定人員打 119、拿 AED。',sub:'打開急救包，準備氧氣與 BVM。',why:'這叫並行：一個人評估，另一個人備器材，不用兩個人等著做同一件事。',say:'一位患者。請撥打 119、拿 AED；副手準備急救包和 BVM。',button:'主手求援＋副手備器材',recipe:[[act('help','main'),act('bag','sub')]],result:'已求援、器材就位。現在由主手確認患者反應。'},
 {title:'叫他、拍肩，確認有沒有反應',who:'主手',main:'呼叫；沒反應再拍肩，依受訓方式確認反應。',sub:'回報器材已就位。',why:'考官回應：患者沒有反應。這時要繼續確認呼吸道、呼吸與脈搏。',say:'先生，聽得到嗎？先生！',button:'主手：確認患者反應',recipe:[[act('response','main')]],result:'患者無反應。下一步要先讓呼吸道暢通。'},
 {title:'先讓呼吸道暢通',who:'主手',main:'檢查口腔，非創傷用壓額抬頦。',sub:'準備 BVM，等主手回報。',why:'這個案例沒有創傷機轉。通道被堵住，光拿氧氣面罩過來也不夠。',say:'檢查口腔，暢通呼吸道。',button:'主手：檢查並暢通呼吸道',recipe:[[act('airway','main')]],result:'呼吸道已處理。現在要查呼吸與脈搏。'},
 {title:'10 秒內，同時查呼吸與脈搏',who:'主手',main:'看有無正常呼吸，同時摸頸動脈。',sub:'準備聽主手的判斷，AED 隨時可用。',why:'這一步決定要跳哪條路。此案例回應：沒有正常呼吸，也沒有確定脈搏。',say:'無正常呼吸，10 秒內沒有確定脈搏。',button:'主手：檢查呼吸與脈搏',recipe:[[act('bpcheck','main')]],result:'確認心跳停止：現在跳進 OHCA，先 CPR＋AED。'},
 {title:'主手開始 CPR，副手開 AED',who:'兩人同時做',main:'定位，開始胸外按壓。',sub:'AED 開機，依語音準備貼片。',why:'不用先補完血壓、病史或全身檢查。現在最要緊的是按壓與 AED。導讀的重複按壓先由示範代演，稍後讓你練一輪。',say:'開始 CPR！副手操作 AED。',button:'主手按壓＋副手開 AED',recipe:[[act('cpr','main'),act('aed_power','sub')]],result:'主手已開始按壓，副手 AED 已開機。'},
 {title:'副手貼片，主手接續按壓',who:'副手',main:'持續按壓，直到 AED 要求分析才暫停。',sub:'依貼片圖示黏貼、接妥導線。',why:'貼片與接線由副手做；不要為了準備 AED 就讓主手一直停著。',say:'貼片、導線接妥。',button:'副手：貼片與接線',recipe:[[act('aed_pads','sub')]],result:'貼片接妥。下一步才是清場分析。'},
 {title:'喊清場，分析時誰都別碰',who:'副手下口令，兩人配合',main:'停止按壓、離開接觸。',sub:'喊清場並目視確認，讓 AED 分析。',why:'這是需要暫停接觸的時候。本案例 AED 會說「建議電擊」。',say:'大家離開，我離開，你離開，全部離開。',button:'清場，接著讓 AED 分析',recipe:[[act('clear','sub')],[act('aed_analyze','sub')]],result:'AED 建議電擊，維持清場，再依指示按電擊。'},
 {title:'電擊後，立即接回 CPR',who:'副手電擊，主手立即接回',main:'電擊完成後立刻繼續按壓。',sub:'再次確認清場，依 AED 指示電擊。',why:'電擊完不要站著等，也不是先慢慢量血壓。沒有其他生命跡象就立即接回 CPR。',say:'確認清場，電擊！立即繼續 CPR。',button:'副手電擊 → 主手立即按壓',recipe:[[act('shock','sub')],[act('cpr','main')]],result:'已電擊並立刻恢復按壓。副手接著處理通氣器材。'},
 {title:'副手準備口咽呼吸道',who:'副手',main:'持續按壓。',sub:'依適應症評估、選尺寸、置入 OPA。',why:'此案例無反應，導讀設定符合 OPA 適應症。真實患者仍須檢查嘔吐反射等條件。',say:'選合適尺寸，置入口咽呼吸道，確認通氣。',button:'副手：完成 OPA 操作',recipe:[[act('opa','sub')]],result:'OPA 已就位。下一步接好 BVM 並密合。'},
 {title:'BVM 準備好，再配合 30：2',who:'副手',main:'數清楚 30 下按壓。',sub:'接妥氧氣、保持呼吸道與面罩密合。',why:'副手要等主手完成 30 下，再給兩口。每口約一秒，看見胸部起伏。',say:'BVM 已密合，配合 30 比 2。',button:'副手：BVM 就位',recipe:[[act('bvm','sub')]],result:'現在換你練一輪：30 下按壓，接著兩口通氣。'},
 {title:'親手練一輪 30：2',who:'你輪流操作主手、副手',main:'按下方深色區 30 次，目標每分鐘 100–120 下。',sub:'滿 30 下後，再按兩次 BVM，兩口至少間隔約一秒。',why:'你在練「什麼時候換誰做」。滑鼠不能測到真實按壓深度、回彈或吹氣胸起。',say:'一、二、三……三十。給兩口，立刻接續按壓。',button:'這一輪完成，接著看跳轉',exercise:'cycle',result:'一輪 30：2 完成。正式急救會持續重複；接著快轉示範後續分析。'},
 {title:'後續不建議電擊，代表什麼？',who:'副手操作 AED',main:'持續 CPR，直到分析要求暫停。',sub:'約兩分鐘到，清場並再次分析。',why:'導讀現在略過重複的 CPR 段落，快轉到下一次提示。考官安排這次不建議電擊，但患者仍沒有脈搏。',say:'再次清場，依 AED 分析結果處理。',button:'快轉重複段落，清場再分析',event:'later-no-shock',result:'第二次分析不建議電擊；先別把它當成恢復心跳。'},
 {title:'沒有脈搏，就接回 CPR',who:'主手',main:'依你的課程表，後續不電擊時快速評脈搏與呼吸。',sub:'準備接續通氣。',why:'考官回應：仍無脈搏。結論就是立即 CPR。第一次不建議電擊則直接 CPR，避免多餘停頓。',say:'無脈搏，立即繼續 CPR。',button:'快速重評 → 立即繼續 CPR',recipe:[[act('postcheck','main')],[act('cpr','main')]],result:'你已學會：不建議電擊，不等於恢復心跳。'},
 {title:'如果恢復脈搏，但呼吸不夠？',who:'主手評估，副手通氣',main:'有生命跡象時，快速重評脈搏與正常呼吸。',sub:'有脈搏但通氣不足，準備 BVM。',why:'考官現在改變患者狀況：脈搏回來、呼吸仍淺慢。這條路是人工呼吸，不做胸外按壓。',say:'有脈搏，呼吸不足。副手每六秒給一口 BVM。',button:'重評 → 轉到有脈搏的呼吸支持',event:'pulse-returns',result:'有脈搏、通氣不足：改走 BVM，每六秒一口。'},
 {title:'這次只給一口，下一口約六秒後',who:'副手',main:'維持評估，約每兩分鐘重評脈搏。',sub:'每六秒一口，觀察胸起、避免過度通氣。',why:'30：2 是剛才無脈搏的 CPR。現在有脈搏，通氣節奏要改變。',say:'有脈搏，人工呼吸每六秒一口，持續重評。',button:'已理解，接著看呼吸恢復',exercise:'one-breath',result:'你已學會第二條路：有脈搏、呼吸不足，走 BVM。'},
 {title:'有脈搏，也有正常呼吸了',who:'主手重評，副手準備後送',main:'確認呼吸正常，維持 ABC、持續監測。',sub:'準備後送、詢問病史、簡潔通報。',why:'考官安排患者開始正常呼吸。重評確認後，進入循環恢復後照護；若再惡化，隨時回 ABC。',say:'有脈搏、有正常呼吸，持續監測並準備後送。',button:'重評 → 準備後送與交接',event:'normal-returns',result:'三個主要分支都走過了。接著可慢慢練完整模式。'},
];
export function createIntro(){const s=createState('ohca','coach');s.paused=true;s.intro=true;return s;}
// These ticks represent narrated demonstration, not the learner's real CPR pause time.
// The full simulation retains its unmodified interruption checks.
function teachAdvance(s,sec){for(let i=0;i<sec;i++){if(s.p.hr===0)s.cpr.lastCompressionTime=s.time+1;advance(s,1);}}
function runRecipe(s,groups){for(const group of groups){for(const x of group){const r=startAction(s,x.id,x.role);if(!r.ok)throw new Error(r.message);}teachAdvance(s,Math.max(...group.map(x=>ACTIONS.find(a=>a.id===x.id).sec)));}}
export function runIntroStep(s,index){
 const step=INTRO_STEPS[index];if(!step)throw new Error('導讀步驟不存在。');
 if(step.exercise==='cycle'&&s.cpr.cycles<1)throw new Error('先完成 30 下按壓與 2 口通氣，再往下走。');
 if(step.exercise==='one-breath'&&!s.flags.intro_one_breath)throw new Error('先示範給一口 BVM，再繼續。');
 if(step.recipe)runRecipe(s,step.recipe);
 if(step.event==='later-no-shock'){
  addLog(s,'導讀','為理解後續分支，略過重複 CPR 段落，快轉到下一次 AED 提示。','info');
  teachAdvance(s,Math.max(0,s.aed.next-s.time));
  runRecipe(s,[[act('clear','sub')]]);inject(s,'noshock');runRecipe(s,[[act('aed_analyze','sub')]]);
 }
 if(step.event==='pulse-returns'){
  runRecipe(s,[[act('clear','sub')]]);inject(s,'rosc');runRecipe(s,[[act('postcheck','main')],[act('bvm','sub')]]);
 }
 if(step.event==='normal-returns'){
  inject(s,'normal');runRecipe(s,[[act('postcheck','main')]]);s.holds.sub=null;
  addLog(s,'副手','確認正常呼吸後，停止不必要的 BVM，持續維持呼吸道。','info');
  runRecipe(s,[[act('transport','sub')],[act('history','sub')],[act('handover','sub')]]);
 }
 s.paused=true;return step.result;
}
