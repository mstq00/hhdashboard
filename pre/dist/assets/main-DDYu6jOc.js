import{initializeApp as St}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";import{getAuth as bt}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";import{getFirestore as vt,enableIndexedDbPersistence as wt,collection as E,doc as $,getDocs as M,addDoc as Ct,deleteDoc as ut,serverTimestamp as ht,writeBatch as Et}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";import"./firebase-Dr3GniDU.js";import nt from"https://cdn.jsdelivr.net/npm/chart.js/auto/auto.mjs";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function e(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(s){if(s.ep)return;s.ep=!0;const r=e(s);fetch(s.href,r)}})();const pt={apiKey:"AIzaSyAyhRpZmtfCCa8IajLPUld43o3MIovI85A",authDomain:"hejdoohome-dashboard.firebaseapp.com",databaseURL:"https://hejdoohome-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"hejdoohome-dashboard",storageBucket:"hejdoohome-dashboard.appspot.com",messagingSenderId:"824702367003",appId:"1:824702367003:web:ef829133d3e5f216354fbe",measurementId:"G-BD1SEL028K"};window.CONFIG={API:{KEY:"AIzaSyD1I839Np6CFFysPqwSQlxBDYPiFzguBiM"},SHEETS:{ID:"1DuDFQ9cMU7Wfqc92YOcAK_591eMbEy7COGG9PQJE2JY",RANGES:{CHANNEL:"channel!A2:E",SMARTSTORE:"smartstore!A2:P",OHOUSE:"ohouse!A2:AO",OHOUSE2:"ohouse2!A2:AO",YTSHOPPING:"YTshopping!A2:R",MAPPING:"mapping!A2:F"},CHANNEL_COLUMNS:{PRODUCT:0,OPTION:1,SMARTSTORE:2,OHOUSE:3,YTSHOPPING:4}},FIREBASE:pt,SALES:{ZERO_SALES_STATUSES:["취소","반품","미결제취소"],CHANNELS:{SMARTSTORE:"스마트스토어",OHOUSE:"오늘의집",YTSHOPPING:"유튜브쇼핑"},DEFAULT_COMMISSION_RATE:0}};const $t={...pt,automaticDataCollectionEnabled:!1},mt=St($t),it=bt(mt),C=vt(mt);wt(C,{synchronizeTabs:!1}).catch(f=>{console.warn("오프라인 지속성 비활성화 중 오류:",f)});window.firebase={auth:it,getAuth:()=>it,db:C,firestore:{collection:f=>E(C,f),doc:(f,t)=>$(C,f,t),getDocs:M,addDoc:Ct,deleteDoc:ut,serverTimestamp:ht,batch:()=>Et(C)}};class gt{constructor(){var t;if(!((t=window.firebase)!=null&&t.auth)){console.error("Firebase Auth가 초기화되지 않았습니다.");return}this.auth=window.firebase.auth,this.currentUser=null,console.log("AuthService 생성됨")}onAuthStateChanged(t){if(!this.auth){console.error("Auth가 초기화되지 않았습니다.");return}return this.auth.onAuthStateChanged(e=>{this.currentUser=e,t(e)})}getCurrentUser(){return this.currentUser}async signIn(t,e){if(!this.auth)throw new Error("Auth가 초기화되지 않았습니다.");try{const a=await this.auth.signInWithEmailAndPassword(t,e);return this.currentUser=a.user,a}catch(a){throw console.error("로그인 실패:",a),a}}async signOut(){if(!this.auth)throw new Error("Auth가 초기화되지 않았습니다.");try{await this.auth.signOut(),this.currentUser=null}catch(t){throw console.error("로그아웃 실패:",t),t}}}const yt=new URLSearchParams(window.location.search),lt=yt.get("email"),ct=yt.get("password"),ft=new gt;lt&&ct&&ft.signIn(lt,ct).then(f=>{console.log("로그인 성공:",f)}).catch(f=>{console.error("로그인 실패:",f)});ft.onAuthStateChanged(f=>{f?console.log("사용자 로그인 상태:",f):console.log("로그아웃 상태")});class At{static calculateDateRange(t){const e=new Date;let a,s;switch(t){case"today":a=s=new Date(e.setHours(0,0,0,0));break;case"yesterday":a=s=new Date(e.setDate(e.getDate()-1)),a.setHours(0,0,0,0),s.setHours(23,59,59,999);break;case"this-week":a=new Date(e),a.setDate(e.getDate()-(e.getDay()===0?6:e.getDay()-1)),a.setHours(0,0,0,0),s=new Date(a),s.setDate(a.getDate()+6),s.setHours(23,59,59,999);break;case"last-week":a=new Date(e),a.setDate(e.getDate()-(e.getDay()===0?6:e.getDay()-1)-7),a.setHours(0,0,0,0),s=new Date(a),s.setDate(a.getDate()+6),s.setHours(23,59,59,999);break;case"this-month":a=new Date(e.getFullYear(),e.getMonth(),1),a.setHours(0,0,0,0),s=new Date(e),s.setHours(23,59,59,999);break;case"last-month":a=new Date(e.getFullYear(),e.getMonth()-1,1),a.setHours(0,0,0,0),s=new Date(e.getFullYear(),e.getMonth(),0),s.setHours(23,59,59,999);break;case"last-3-months":a=new Date(e.getFullYear(),e.getMonth()-2,1),a.setHours(0,0,0,0),s=new Date(e),s.setHours(23,59,59,999);break;case"last-6-months":a=new Date(e.getFullYear(),e.getMonth()-5,1),a.setHours(0,0,0,0),s=new Date(e),s.setHours(23,59,59,999);break;case"all":return{startDate:null,endDate:null};default:a=new Date(e.getFullYear(),e.getMonth(),1),a.setHours(0,0,0,0),s=new Date(e),s.setHours(23,59,59,999)}return{startDate:a,endDate:s}}static isWithinRange(t,e,a){const s=new Date(t);return s>=e&&s<=a}static formatDate(t){return t.toLocaleString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"})}static filterDataByDateRange(t,e,a){if(!e||!a||!Array.isArray(t))return[];const s=new Date(e);s.setHours(0,0,0,0);const r=new Date(a);return r.setHours(23,59,59,999),t.filter(o=>{const n=new Date(o.date);return n>=s&&n<=r})}static isCustomDateRange(t,e){return t&&e&&t!==e}}class Mt{static formatCurrency(t){return typeof t!="number"&&(t=parseFloat(t)||0),new Intl.NumberFormat("ko-KR",{style:"currency",currency:"KRW",minimumFractionDigits:0,maximumFractionDigits:0}).format(t)}static formatNumber(t){return typeof t!="number"&&(t=parseFloat(t)||0),new Intl.NumberFormat("ko-KR",{minimumFractionDigits:0,maximumFractionDigits:0}).format(t)}static formatPercentage(t){return typeof t!="number"&&(t=parseFloat(t)||0),new Intl.NumberFormat("ko-KR",{style:"percent",minimumFractionDigits:1,maximumFractionDigits:1}).format(t/100)}static formatDecimal(t,e=2){return typeof t!="number"&&(t=parseFloat(t)||0),new Intl.NumberFormat("ko-KR",{minimumFractionDigits:e,maximumFractionDigits:e}).format(t)}}class It{constructor(t){this.dataService=t,this.productMappings={},this.channelFees=[]}createMappingKey(t,e){return`${t}-${e}`}async loadMappingData(){try{const t=await gapi.client.sheets.spreadsheets.values.get({spreadsheetId:CONFIG.SHEETS.ID,range:CONFIG.SHEETS.RANGES.MAPPING});if(!t.result||!t.result.values)throw new Error("매핑 데이터를 찾을 수 없습니다");return this.productMappings={},t.result.values.forEach(e=>{if(e.length<6)return;const a=e[0],s=e[1],r=`${a}-${s}`;this.productMappings[r]={product:e[2],option:e[3],price:parseFloat(e[4]),cost:parseFloat(e[5])}}),this.productMappings}catch(t){throw console.error("매핑 데이터 로드 실패:",t),t}}getMappedProductInfo(t,e,a){if(!t)return null;const r=`${t}-${e||""}`,o=this.productMappings[r];return o?{productName:o.product,option:o.option,price:o.price,cost:o.cost}:null}getChannelFee(t,e,a){try{const s=this.channelFees.find(r=>r.상품명===t&&(e?r.옵션===e:!0));if(s)switch(a){case"스마트스토어":return s.스마트스토어||0;case"오늘의집":return s.오늘의집||0;case"유튜브쇼핑":return s.유튜브쇼핑||0;default:return 0}return 0}catch(s){return console.error("채널 수수료 조회 중 오류:",s),0}}createMappingKeyFromSheet(t,e){let a,s;switch(e){case"스마트스토어":a=t[8],s=t[9];break;case"오늘의집":a=t[3],s=t[6];break;case"오늘의집2":a=t[5],s=t[8];break;case"유튜브쇼핑":a=t[6],s=t[7];break;default:return console.warn("알 수 없는 채널:",e),null}return a?this.createMappingKey(a,s||""):(console.warn("상품명을 찾을 수 없습니다:",{seller:e,row:t}),null)}}class Lt{constructor(){this.data=null,this.productMappings={},this.processedData=null,this.channelCommissions={},this.productChannelCommissions={},this.ZERO_SALES_STATUSES=CONFIG.SALES.ZERO_SALES_STATUSES,this.spreadsheetId=CONFIG.SHEETS.ID,this.data=[],this.processedData=[],this.channelFees={},this.defaultCommission=0,this.currentData=null,this.mappingService=new It(this)}async initialize(){try{return console.log("DataService 초기화 시작"),await this.initializeGoogleAPI(),await this.initializeMappings(),await this.loadChannelCommissions(),console.log("DataService 초기화 완료"),!0}catch(t){throw console.error("DataService 초기화 실패:",t),t}}async initializeMappings(){try{this.productMappings=await this.mappingService.loadMappingData(),await this.loadChannelCommissions()}catch(t){console.error("매핑 초기화 중 오류:",t)}}getProductMapping(t,e){return this.mappingService?this.mappingService.getMapping(t,e):(console.error("MappingService가 초기화되지 않았습니다"),null)}async initializeGoogleAPI(){try{if(!gapi)throw new Error("GAPI가 로드되지 않았습니다.");if(await new Promise((t,e)=>{gapi.load("client",{callback:t,onerror:e})}),await gapi.client.init({apiKey:CONFIG.API.KEY,discoveryDocs:["https://sheets.googleapis.com/$discovery/rest?version=v4"]}),!gapi.client.sheets)throw new Error("Sheets API 초기화 실패");return await this.loadChannelCommissions(),!0}catch(t){throw console.error("Google API 초기화 실패:",t),t}}async loadChannelCommissions(){try{const t=await gapi.client.sheets.spreadsheets.values.get({spreadsheetId:this.spreadsheetId,range:CONFIG.SHEETS.RANGES.CHANNEL});if(!t.result||!t.result.values){console.warn("채널 수수료 데이터가 없습니다");return}const e=t.result.values;for(const a of e){if(!a||a.length<5)continue;const s=a[CONFIG.SHEETS.CHANNEL_COLUMNS.PRODUCT];if(!s)continue;const r=s;this.channelCommissions[r]={smartstore:this.parseCommissionRate(a[CONFIG.SHEETS.CHANNEL_COLUMNS.SMARTSTORE]),ohouse:this.parseCommissionRate(a[CONFIG.SHEETS.CHANNEL_COLUMNS.OHOUSE]),ytshopping:this.parseCommissionRate(a[CONFIG.SHEETS.CHANNEL_COLUMNS.YTSHOPPING])}}}catch(t){throw console.error("채널 수수료 정보 로드 실패:",t),this.channelCommissions={},t}}parseCommissionRate(t){if(!t)return CONFIG.SALES.DEFAULT_COMMISSION_RATE;const e=parseFloat(t);return isNaN(e)?CONFIG.SALES.DEFAULT_COMMISSION_RATE:e}calculateChannelCommission(t,e){const a=this.channelCommissions[t];return a?e*a.rate/100:(console.warn(`채널 ${t}의 수수료 정보가 없습니다.`),0)}async loadData(t="dashboard"){var e,a,s,r,o;try{if(!((e=gapi.client)!=null&&e.sheets))throw new Error("Sheets API가 초기화되지 않았습니다.");console.log("데이터 로딩 시작:",t);const[n,i,l,c]=await Promise.all([gapi.client.sheets.spreadsheets.values.get({spreadsheetId:this.spreadsheetId,range:CONFIG.SHEETS.RANGES.SMARTSTORE}),gapi.client.sheets.spreadsheets.values.get({spreadsheetId:this.spreadsheetId,range:CONFIG.SHEETS.RANGES.OHOUSE}),gapi.client.sheets.spreadsheets.values.get({spreadsheetId:this.spreadsheetId,range:CONFIG.SHEETS.RANGES.OHOUSE2}),gapi.client.sheets.spreadsheets.values.get({spreadsheetId:this.spreadsheetId,range:CONFIG.SHEETS.RANGES.YTSHOPPING})]),u=(m,D)=>Array.isArray(m)?m.filter(S=>S&&S.length>=5):(console.warn(`${D} 데이터가 배열이 아닙니다`),[]),d=u((a=n.result)==null?void 0:a.values,"스마트스토어").map(m=>({row:m,seller:"스마트스토어"})),h=u((s=i.result)==null?void 0:s.values,"오늘의집").map(m=>({row:m,seller:"오늘의집"})),p=u((r=l.result)==null?void 0:r.values,"오늘의집").map(m=>({row:m,seller:"오늘의집"})),g=u((o=c.result)==null?void 0:o.values,"유튜브쇼핑").map(m=>({row:m,seller:"유튜브쇼핑"}));return[...d,...h,...p,...g]}catch(n){throw console.error("데이터 로드 실패:",n),n}}async loadDetailData(){return this.loadData("detail")}async processData(t,e="full"){try{if(!Array.isArray(t))return console.warn("유효하지 않은 데이터 형식"),[];const s=(await Promise.all(t.map(async r=>{try{let o,n,i,l,c,u,d,h,p;switch(r.seller){case"스마트스토어":o=r.row[8],n=r.row[9],i=parseInt(r.row[10])||0,l=r.row[1],c=r.row[2],u=r.row[11],d=r.row[12],h=r.row[3],p=parseFloat(r.row[9])||0;break;case"오늘의집":r.row.length>=40?(o=r.row[5],n=r.row[8],i=parseInt(r.row[9])||0,l=r.row[0],c=r.row[13],u=r.row[26],d=r.row[27],h=r.row[40],p=parseFloat(r.row[21])||0):(o=r.row[3],n=r.row[6],i=parseInt(r.row[8])||0,l=r.row[0],c=r.row[22],u=r.row[27],d=r.row[29],h=r.row[40],p=parseFloat(r.row[21])||0);break;case"유튜브쇼핑":o=r.row[6],n=r.row[7],i=parseInt(r.row[8])||0,l=r.row[0],c=r.row[17],u=r.row[10],d=r.row[11],h="",p=parseFloat(r.row[9])||0;break;default:return console.warn("알 수 없는 판매처:",r.seller),null}const g=this.mappingService.getMappedProductInfo(o,n,r.seller);return{date:this.formatDate(c),seller:r.seller,orderNumber:l,originalProduct:o,originalOption:n,mappedProduct:(g==null?void 0:g.product)||null,mappedOption:(g==null?void 0:g.option)||null,quantity:i,price:(g==null?void 0:g.price)||p/i,sales:g?g.price*i:p,cost:(g==null?void 0:g.cost)||0,orderStatus:h,customerName:u,customerContact:d,mappingStatus:g!=null&&g.product?"mapped":"unmapped"}}catch(o){return console.error("데이터 처리 중 오류:",o,r),null}}))).filter(r=>r!==null&&r.date);return this.processedData=s,s}catch(a){throw console.error("데이터 처리 중 오류:",a),a}}formatDate(t){if(!t)return"";try{if(typeof t=="string"&&t.length===8){const e=t.substring(0,4),a=t.substring(4,6),s=t.substring(6,8);return`${e}-${a}-${s}`}return t}catch(e){return console.error("날짜 형식 변환 오류:",e),t}}getProcessedData(){return this.processedData||[]}filterDataByDateRange(t,e){if(!Array.isArray(this.processedData))return[];if(!t||!e)return[];const a=new Date(t),s=new Date(e);return this.processedData.filter(r=>{if(!r.date)return!1;const o=new Date(r.date);return o>=a&&o<=s})}calculateChannelFee(t,e){if(!t||!e)return 0;const a=this.channelFees[t]||this.defaultCommission;return e*(a/100)}getDefaultCommission(){return this.defaultCommission}async loadChannelFees(){try{const t=await this.gapiClient.sheets.spreadsheets.values.get({spreadsheetId:this.spreadsheetId,range:"fees!A2:B"}),e={};t.result.values.forEach(([a,s])=>{e[a]=parseFloat(s)||0}),this.channelFees=e,this.defaultCommission=e.default||0}catch(t){console.error("수수료 정보 로드 중 오류:",t),this.channelFees={},this.defaultCommission=0}}setCurrentData(t){this.currentData=t}getCurrentData(){return this.currentData||[]}async processDetailData(t){try{return Array.isArray(t)?t.map(e=>({date:this.formatDate(e.orderDate||e.orderPaymentDate),seller:e.seller||e.channel||"",orderNumber:e.orderNumber||"",productName:e.productName||e.originalProduct||"",option:e.option||e.optionInfo||e.optionName||"",quantity:parseInt(e.quantity)||0,price:parseFloat(e.price)||0,orderStatus:e.orderStatus||e.deliveryStatus||"",buyerName:e.buyerName||e.customerName||e.orderName||"",buyerContact:e.buyerContact||e.customerContact||e.orderContact||""})):[]}catch(e){return console.error("상세 데이터 처리 중 오류:",e),[]}}async filterDataByPeriod(t){try{const e=this.getCurrentData();if(!e||!Array.isArray(e))return[];const a=new Date;let s,r;switch(t){case"today":s=new Date(a.setHours(0,0,0,0)),r=new Date(a.setHours(23,59,59,999));break;case"yesterday":s=new Date(a.setDate(a.getDate()-1)),s.setHours(0,0,0,0),r=new Date(s),r.setHours(23,59,59,999);break;case"this-week":s=new Date(a),s.setDate(a.getDate()-(a.getDay()===0?6:a.getDay()-1)),s.setHours(0,0,0,0),r=new Date(s),r.setDate(s.getDate()+6),r.setHours(23,59,59,999);break;case"last-week":s=new Date(a),s.setDate(a.getDate()-(a.getDay()===0?6:a.getDay()-1)-7),s.setHours(0,0,0,0),r=new Date(s),r.setDate(s.getDate()+6),r.setHours(23,59,59,999);break;case"this-month":s=new Date(a.getFullYear(),a.getMonth(),1),r=new Date(a.getFullYear(),a.getMonth()+1,0,23,59,59,999);break;case"last-month":s=new Date(a.getFullYear(),a.getMonth()-1,1),r=new Date(a.getFullYear(),a.getMonth(),0,23,59,59,999);break;case"last-3-months":s=new Date(a.getFullYear(),a.getMonth()-2,1),r=new Date(a.setHours(23,59,59,999));break;case"last-6-months":s=new Date(a.getFullYear(),a.getMonth()-5,1),r=new Date(a.setHours(23,59,59,999));break;case"all":return e;default:return e}return e.filter(o=>{const n=new Date(o.date);return n>=s&&n<=r})}catch(e){return console.error("데이터 필터링 중 오류:",e),[]}}async filterDataByCustomDate(t){try{const e=this.getCurrentData();if(!e||!Array.isArray(e))return[];const a=new Date(t),s=new Date(a.setHours(0,0,0,0)),r=new Date(a.setHours(23,59,59,999));return e.filter(o=>{const n=new Date(o.date);return n>=s&&n<=r})}catch(e){return console.error("커스텀 날짜 필터링 중 오류:",e),[]}}async getNotionData(t){try{const e=window.location.hostname==="localhost"?"http://localhost:3000":"https://us-central1-hejdoohome-dashboard.cloudfunctions.net/api",a=await fetch(`${e}/notion/query`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({databaseId:t})});if(!a.ok)throw new Error(`서버 요청 실패: ${a.status}`);return(await a.json()).results||[]}catch(e){throw console.error("Notion 데이터 가져오기 실패:",e),e}}}class A{constructor(t){if(!t)throw new Error("Database ID가 필요합니다");this.databaseId=t;const e=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1";console.log("현재 호스트:",window.location.hostname),console.log("로컬 환경?:",e),this.baseUrl=e?"http://localhost:5001/hejdoohome-dashboard/us-central1/api":"https://us-central1-hejdoohome-dashboard.cloudfunctions.net/api",console.log("사용할 API URL:",this.baseUrl)}async fetchDatabase(){try{console.log(`${this.databaseId} 데이터베이스 조회 시작`),console.log("요청 URL:",`${this.baseUrl}/notion/query`);const t=await fetch(`${this.baseUrl}/notion/query`,{method:"POST",headers:{"Content-Type":"application/json"},mode:"cors",body:JSON.stringify({databaseId:this.databaseId})});if(!t.ok)throw new Error(`서버 요청 실패: ${t.status}`);return(await t.json()).results||[]}catch(t){throw console.error("Notion API 호출 중 오류:",t),t}}}class Tt{constructor(t){if(this.dataService=t,this.detailTableContainer=document.querySelector(".data-table-container"),!this.detailTableContainer){console.error("상세 테이블 컨테이너를 찾을 수 없습니다.");return}this.initializeTable(),this.initializeSearchField()}initializeTable(){const t=document.querySelector(".detail-data-table");t&&t.remove();const e=document.createElement("table");e.className="detail-data-table",e.classList.add("table","table-striped","table-bordered");const a=document.createElement("thead");a.innerHTML=`
            <tr>
                <th>날짜</th>
                <th>판매처</th>
                <th>주문번호</th>
                <th>상품명</th>
                <th>옵션</th>
                <th class="text-right">수량</th>
                <th class="text-right">매출</th>
                <th>주문상태</th>
                <th>구매자명</th>
                <th>연락처</th>
            </tr>
        `,e.appendChild(a);const s=document.createElement("tbody");e.appendChild(s),this.detailTableContainer.appendChild(e),this.detailTable=e}initializeSearchField(){const t=document.createElement("div");t.className="search-container mb-3";const e=document.createElement("input");e.type="text",e.id="tableSearch",e.className="form-control",e.placeholder="검색어를 입력하세요...",t.appendChild(e),this.detailTableContainer.insertBefore(t,this.detailTable),e.addEventListener("input",a=>this.handleSearch(a.target.value))}updateTable(t){if(!this.detailTable){console.error("테이블이 초기화되지 않았습니다.");return}const e=this.detailTable.querySelector("tbody");if(!e){console.error("테이블 tbody를 찾을 수 없습니다.");return}e.innerHTML="",t.forEach(a=>{const s=document.createElement("tr");s.innerHTML=`
                <td>${a.date||""}</td>
                <td>${a.seller||""}</td>
                <td>${a.orderNumber||""}</td>
                <td>${a.mappingStatus==="unmapped"?a.mappedProduct:a.originalProduct||""}</td>
                <td>${a.mappingStatus==="unmapped"?a.mappedOption:a.originalOption||""}</td>
                <td class="text-right">${this.formatNumber(a.quantity)}</td>
                <td class="text-right">${this.formatCurrency(a.sales)}</td>
                <td>${a.orderStatus||""}</td>
                <td>${a.customerName||""}</td>
                <td>${a.customerContact||""}</td>
            `,e.appendChild(s)})}handleSearch(t){if(!this.detailTable)return;const e=this.detailTable.querySelector("tbody");if(!e)return;const a=e.getElementsByTagName("tr"),s=t.toLowerCase();for(const r of a){const o=r.textContent.toLowerCase();r.style.display=o.includes(s)?"":"none"}}formatNumber(t){return t==null?"":new Intl.NumberFormat("ko-KR").format(t)}formatCurrency(t){return t==null?"":new Intl.NumberFormat("ko-KR",{style:"currency",currency:"KRW"}).format(t)}async updateTables(t){if(!Array.isArray(t)){console.error("데이터가 배열 형식이 아닙니다:",t);return}this.updateTable(t)}}class Ot{constructor(t){this.dataService=t,this.currentPeriod="this-month",this.startDate=null,this.endDate=null,this.tableManager=null,this.initializeDateListeners();const e=new Date;this.startDate=new Date(e.getFullYear(),e.getMonth(),1),this.endDate=new Date(e.getFullYear(),e.getMonth()+1,0),document.dispatchEvent(new CustomEvent("dateFilterChanged",{detail:{data:this.dataService.getCurrentData().filter(a=>{const s=new Date(a.date||a.orderDate);return s>=this.startDate&&s<=this.endDate}),period:"this-month",startDate:this.startDate,endDate:this.endDate}})),this.currentChartPeriod="day",this.periodSalesChart=null,this.dayOfWeekSalesChart=null,this.initializeChartListeners(),this.CHANNEL_COLORS={스마트스토어:"rgba(169, 186, 147, 0.7)",오늘의집:"rgba(147, 165, 186, 0.7)",유튜브쇼핑:"rgba(195, 177, 171, 0.7)"},this.initializeCharts(),this.initializeChartPeriodButtons(),document.querySelectorAll(".sidebar-menu-item").forEach(a=>{a.addEventListener("click",s=>{const r=s.currentTarget.dataset.tab;this.switchTab(r),r==="channelCommissionTab"&&this.initializeCommissionTab()})})}initializeDateListeners(){document.addEventListener("dateFilterChanged",async t=>{const{data:e,period:a,startDate:s,endDate:r}=t.detail;this.currentPeriod=a,this.startDate=new Date(s),this.startDate.setHours(0,0,0,0),this.endDate=new Date(r),this.endDate.setHours(23,59,59,999);const o=document.getElementById("dateRangePicker");if(o){const i=this.formatDateForInput(this.startDate),l=this.formatDateForInput(this.endDate);o.value=`${i} ~ ${l}`}await this.updateDashboard(e,a,this.startDate,this.endDate);const n=document.querySelector(".tab-content.active");n&&n.id==="detailDataTab"&&this.tableManager&&await this.tableManager.updateTables(e)})}async updateDashboard(t,e,a,s){try{if(!Array.isArray(t)){console.error("대시보드 업데이트 실패: 잘못된 데이터 형식");return}const r=this.calculateSalesData(t),o=await this.getPreviousPeriodData(e,a,s),n=this.calculateGrowthRates({totalSales:r.총매출,orderCount:r.구매건수,uniqueCustomers:r.구매자수},{totalSales:o.총매출,orderCount:o.구매건수,uniqueCustomers:o.구매자수});this.updateDashboardUI(r,n,e),await Promise.all([this.updateDayOfWeekSalesChart(t),this.updatePeriodSalesChart(t)]),this.updateDetailedSalesInfo(t),this.updateChannelSales(t),this.updateRepurchaseStats(t)}catch(r){console.error("매출 데이터 계산 중 오류:",r)}}async getPreviousPeriodData(t,e,a){try{if(!t)return[];let s,r;const o=new Date;if(t==="all"||t==="all-time"){const c=this.dataService.getCurrentData();s=new Date(Math.min(...c.map(d=>new Date(d.date)))),r=o,r.setHours(23,59,59,999)}else if(t==="custom"){if(!e||!a)return[];const c=new Date(e),u=new Date(a),d=Math.ceil((u-c)/(1e3*60*60*24));s=new Date(c),s.setDate(c.getDate()-d),r=new Date(u),r.setDate(u.getDate()-d)}else switch(t){case"today":s=new Date(o),s.setDate(o.getDate()-1),s.setHours(0,0,0,0),r=new Date(s),r.setHours(23,59,59,999);break;case"yesterday":s=new Date(o),s.setDate(o.getDate()-2),s.setHours(0,0,0,0),r=new Date(s),r.setHours(23,59,59,999);break;case"this-week":s=new Date(o),s.setDate(o.getDate()-(o.getDay()===0?6:o.getDay()-1)-7),s.setHours(0,0,0,0),r=new Date(s),r.setDate(s.getDate()+6),r.setHours(23,59,59,999);break;case"last-week":s=new Date(o),s.setDate(o.getDate()-(o.getDay()===0?6:o.getDay()-1)-14),s.setHours(0,0,0,0),r=new Date(s),r.setDate(s.getDate()+6),r.setHours(23,59,59,999);break;case"this-month":s=new Date(o.getFullYear(),o.getMonth()-1,1),s.setHours(0,0,0,0),r=new Date(o.getFullYear(),o.getMonth(),0),r.setHours(23,59,59,999);break;case"last-month":s=new Date(o.getFullYear(),o.getMonth()-2,1),s.setHours(0,0,0,0),r=new Date(o.getFullYear(),o.getMonth()-1,0),r.setHours(23,59,59,999);break;case"last-3-months":s=new Date(o.getFullYear(),o.getMonth()-6,1),s.setHours(0,0,0,0),r=new Date(o.getFullYear(),o.getMonth()-3,0),r.setHours(23,59,59,999);break;case"last-6-months":s=new Date(o.getFullYear(),o.getMonth()-12,1),s.setHours(0,0,0,0),r=new Date(o.getFullYear(),o.getMonth()-6,0),r.setHours(23,59,59,999);break}const i=this.dataService.getCurrentData().filter(c=>{const u=new Date(c.date);return u>=s&&u<=r});return this.calculateSalesData(i)}catch(s){return console.error("이전 기간 데이터 조회 중 오류:",s),{총매출:0,구매건수:0,구매자수:0}}}calculateGrowthRates(t,e){const a=(r,o)=>o===0?r>0?100:0:(r-o)/o*100;return{totalSales:a(t.totalSales,e.totalSales),orderCount:a(t.orderCount,e.orderCount),uniqueCustomers:a(t.uniqueCustomers,e.uniqueCustomers)}}updateDashboardUI(t,e,a){try{this.updateMetric("total-sales",t.총매출,e.totalSales,this.formatCurrency),this.updateMetric("order-count",t.구매건수,e.orderCount,this.formatNumber),this.updateMetric("customer-count",t.구매자수,e.uniqueCustomers,this.formatNumber);const s=document.querySelectorAll(".growth"),r=document.querySelectorAll(".amount"),o=document.querySelectorAll(".compare-period");s.forEach(i=>{i&&(i.style.display=a==="all"?"none":"block")}),r.forEach(i=>{i&&(i.style.display=a==="all"?"none":"block")});const n=this.getComparisonPeriodText(a,this.startDate,this.endDate);o.forEach(i=>{i&&(i.style.display=a==="all"?"none":"block",i.textContent=n)})}catch(s){console.error("대시보드 UI 업데이트 중 오류:",s)}}updateMetric(t,e,a,s){const r=document.getElementById(t),o=t==="total-sales"?"sales-growth":t==="order-count"?"order-growth":t==="customer-count"?"customer-growth":`${t}-growth`;if(r){let c=s(e);t==="order-count"&&(c+="건"),t==="customer-count"&&(c+="명"),r.textContent=c}const n=document.getElementById(o),i=o.replace("growth","amount"),l=document.getElementById(i);if(n&&l){const c=e/(1+a/100),u=e-c,d=a>0?`+${a.toFixed(1)}%`:a<0?`${a.toFixed(1)}%`:"0%";let h=s(Math.abs(u));u<0&&(h="-"+h),t==="order-count"&&(h+="건"),t==="customer-count"&&(h+="명");const p=a>0?"positive":a<0?"negative":"";n.className=`growth ${p}`,n.textContent=d,l.textContent=h}}calculateDifference(t,e){return t-t/(1+e/100)}getComparisonPeriodText(t,e,a){const s=n=>`${n.getMonth()+1}월 ${n.getDate()}일`,r=n=>`${n.getFullYear()}년 ${n.getMonth()+1}월`,o=new Date;switch(t){case"today":const n=new Date(o);return n.setDate(o.getDate()-1),`${s(n)} 대비`;case"yesterday":{const i=new Date(o);return i.setDate(o.getDate()-2),`${s(i)} 대비`}case"this-week":{const i=new Date(e);i.setDate(i.getDate()-1);const l=new Date(i);return l.setDate(i.getDate()-6),`${s(l)} ~ ${s(i)} 대비`}case"last-week":{const i=new Date(e);i.setDate(i.getDate()-1);const l=new Date(i);return l.setDate(i.getDate()-6),`${s(l)} ~ ${s(i)} 대비`}case"this-month":{const i=new Date(e);return i.setMonth(i.getMonth()-1),`${r(i)} 대비`}case"last-month":{const i=new Date(e);return i.setMonth(i.getMonth()-1),`${r(i)} 대비`}case"last-3-months":{const i=new Date(e);i.setMonth(i.getMonth()-3);const l=new Date(e);l.setDate(l.getDate()-1);const c=new Date(i);return`${s(c)} ~ ${s(l)} 대비`}case"last-6-months":{const i=new Date(e);i.setMonth(i.getMonth()-6);const l=new Date(e);l.setDate(l.getDate()-1);const c=new Date(i);return`${s(c)} ~ ${s(l)} 대비`}case"custom":{const i=new Date(e);i.setDate(i.getDate()-1);const l=new Date(i),c=Math.ceil((a-e)/(1e3*60*60*24));return l.setDate(i.getDate()-c+1),`${s(l)} ~ ${s(i)} 대비`}default:return""}}formatGrowthRate(t){return`${t>0?"+":""}${t.toFixed(1)}%`}getGrowthClass(t){return typeof t!="number"?"growth-neutral":t>0?"growth-positive":t<0?"growth-negative":"growth-neutral"}calculateSalesData(t){new Set(t.map(n=>n.seller)),t.filter(n=>n.seller&&["오늘의집","오늘의집2","ohouse","Ohouse"].includes(n.seller));const e=t.reduce((n,i)=>i.seller&&["오늘의집","오늘의집2","ohouse","Ohouse"].includes(i.seller)||!["취소","미결제취소","반품"].includes(i.orderStatus)?n+(parseFloat(i.sales)||0):n,0),a=t.filter(n=>n.seller&&["오늘의집","오늘의집2","ohouse","Ohouse"].includes(n.seller)||!["취소","미결제취소","반품"].includes(n.orderStatus)),s=a.length,r=new Set(a.filter(n=>n.customerName||n.customerContact).map(n=>{const i=n.customerName||"",l=n.customerContact||"";return`${i}-${l}`})).size,o=t.reduce((n,i)=>{if(i.seller&&["오늘의집","오늘의집2","ohouse","Ohouse"].includes(i.seller)||!["취소","미결제취소","반품"].includes(i.orderStatus)){const u=i.seller||"기타";n[u]=(n[u]||0)+(parseFloat(i.sales)||0)}return n},{});return{총매출:e,구매건수:s,구매자수:r,채널별매출:o}}async updateProductSalesTable(t){const e={totalSales:0,orderCount:0,uniqueCustomers:new Set};return t.forEach(a=>{if(a.seller==="스마트스토어"&&CONFIG.SALES.ZERO_SALES_STATUSES.includes(a.orderStatus))return;const s=a.optionName||a.optionInfo||a.option||"",o=(this.dataService.mappingService.getMappedProductInfo(a.productName,s)||{product:a.productName,option:s,price:a.originalSales/a.quantity}).price*a.quantity;e.totalSales+=o,e.orderCount++;const n=a.buyerId||a.buyerEmail||a.buyerContact;n&&e.uniqueCustomers.add(n)}),{totalSales:e.totalSales,orderCount:e.orderCount,uniqueCustomers:e.uniqueCustomers.size}}formatCurrency(t){return new Intl.NumberFormat("ko-KR",{style:"currency",currency:"KRW"}).format(t)}formatNumber(t){return new Intl.NumberFormat("ko-KR").format(t)}formatDateForInput(t){if(!t)return console.warn("Null date provided to formatDateForInput"),"";try{const e=new Date(t);if(isNaN(e.getTime()))return console.warn("Invalid date provided to formatDateForInput:",t),"";const a=e.getFullYear(),s=String(e.getMonth()+1).padStart(2,"0"),r=String(e.getDate()).padStart(2,"0");return`${a}. ${s}. ${r}`}catch(e){return console.error("Error formatting date:",e),""}}initializeChartListeners(){document.querySelectorAll(".period-btn").forEach(t=>{t.addEventListener("click",e=>{const a=e.target.dataset.period;switch(document.querySelectorAll(".period-btn").forEach(s=>{s.classList.remove("active")}),e.target.classList.add("active"),a){case"daily":this.currentChartPeriod="daily";break;case"weekly":this.currentChartPeriod="weekly";break;case"monthly":this.currentChartPeriod="monthly";break}this.updatePeriodSalesChart(this.dataService.getCurrentData())})})}updateCharts(t){this.updatePeriodSalesChart(t),this.updateDailyChart(t)}async updatePeriodSalesChart(t){try{const e=document.getElementById("periodSalesChart");if(!e||!t){console.error("기간별 매출 차트 업데이트 실패: 캔버스 또는 데이터 없음");return}this.periodSalesChart&&this.periodSalesChart.destroy();const a={};let s;if(this.currentPeriod==="all"){const n=new Date("2023-06-26");n.setHours(0,0,0,0);const i=new Date;i.setHours(23,59,59,999),s=t.filter(l=>{const c=new Date(l.date);return c>=n&&c<=i})}else s=t.filter(n=>{const i=new Date(n.date);return i>=this.startDate&&i<=this.endDate});s.forEach(n=>{const i=new Date(n.date);let l;switch(this.currentChartPeriod){case"weekly":const u=new Date(i);u.setDate(i.getDate()-(i.getDay()===0?6:i.getDay()-1)),l=this.formatDateKey(u);break;case"monthly":l=`${i.getFullYear()}-${String(i.getMonth()+1).padStart(2,"0")}-01`;break;default:l=this.formatDateKey(i)}a[l]||(a[l]={date:l,sales:{스마트스토어:0,오늘의집:0,유튜브쇼핑:0},orders:0});const c=n.seller||n.channel;if(c&&["스마트스토어","오늘의집","유튜브쇼핑"].includes(c)){const u=parseInt(n.quantity)||0,d=n.originalProduct||n.productName||"",h=n.originalOption||"",p=this.dataService.mappingService.getMappedProductInfo(d,h,c);let g=0;p&&(g=["취소","미결제취소","반품"].includes(n.orderStatus)?0:p.price);const y=u*g;["취소","미결제취소","반품"].includes(n.orderStatus)||(a[l].sales[c]+=y,a[l].orders++)}});const r=Object.keys(a).sort(),o=[{label:"스마트스토어",data:r.map(n=>a[n].sales.스마트스토어),backgroundColor:this.CHANNEL_COLORS.스마트스토어,stack:"stack1"},{label:"오늘의집",data:r.map(n=>a[n].sales.오늘의집),backgroundColor:this.CHANNEL_COLORS.오늘의집,stack:"stack1"},{label:"유튜브쇼핑",data:r.map(n=>a[n].sales.유튜브쇼핑),backgroundColor:this.CHANNEL_COLORS.유튜브쇼핑,stack:"stack1"},{label:"구매건수",type:"line",data:r.map(n=>a[n].orders),borderColor:"#666",borderWidth:2,pointRadius:4,fill:!1,yAxisID:"y1"}];this.periodSalesChart=new Chart(e,{type:"bar",data:{labels:this.formatPeriodLabels(r,this.currentChartPeriod),datasets:o},options:{responsive:!0,maintainAspectRatio:!1,scales:{y:{type:"linear",position:"left"},y1:{type:"linear",position:"right",grid:{drawOnChartArea:!1}}},plugins:{legend:{position:"top",align:"center",labels:{usePointStyle:!0,padding:20}},tooltip:{mode:"index",intersect:!1,callbacks:{title:function(n){return n[0].label},afterBody:function(n){const i=[],l=n.filter(d=>d.dataset.type!=="line");l.forEach(d=>{i.push(`${d.dataset.label}: ₩${(d.raw/1e4).toFixed(0)}만`)});const c=l.reduce((d,h)=>d+h.raw,0);i.push(`총 매출: ₩${(c/1e4).toFixed(0)}만`);const u=n.find(d=>d.dataset.type==="line");return u&&i.push(`구매건수: ${u.raw}건`),i},label:function(n){return null}}}}}})}catch(e){console.error("기간별 매출 차트 업데이트 중 오류:",e)}}async updateDayOfWeekSalesChart(t){try{const e=document.getElementById("dayOfWeekSalesChart");if(!e||!t||!t.length)return;const a={sales:Array(7).fill(0),orders:Array(7).fill(0),channels:{스마트스토어:Array(7).fill(0),오늘의집:Array(7).fill(0),유튜브쇼핑:Array(7).fill(0)}};if(t.forEach(d=>{let p=new Date(d.date).getDay();p=p===0?6:p-1;const g=d.seller,y=parseInt(d.quantity)||0,m=d.originalProduct||d.productName||"",D=d.originalOption||"",S=this.dataService.mappingService.getMappedProductInfo(m,D,g);let b=0;S&&!["취소","미결제취소","반품"].includes(d.orderStatus)&&(b=S.price);const v=y*b;g&&["스마트스토어","오늘의집","유튜브쇼핑"].includes(g)&&(a.sales[p]+=v,a.orders[p]++,a.channels[g][p]+=v)}),!a.sales.some(d=>d>0))return;const r=["월","화","수","목","금","토","일"],n=["스마트스토어","오늘의집","유튜브쇼핑"].map(d=>({label:d,type:"bar",data:a.channels[d],backgroundColor:this.CHANNEL_COLORS[d],borderColor:this.CHANNEL_COLORS[d].replace("0.7","1"),borderWidth:1,stack:"sales"})),i={label:"구매건수",type:"line",data:a.orders,borderColor:"#666",borderWidth:2,pointRadius:4,fill:!1,yAxisID:"y1"},l=a.sales,c={type:"bar",data:{labels:r,datasets:[...n,i]},options:{responsive:!0,maintainAspectRatio:!1,scales:{y:{type:"linear",position:"left"},y1:{type:"linear",position:"right",grid:{drawOnChartArea:!1}}},plugins:{tooltip:{mode:"index",intersect:!1,callbacks:{title:function(d){return r[d[0].dataIndex]+"요일"},afterBody:function(d){const h=[],p=d.filter(m=>m.dataset.type!=="line");p.forEach(m=>{h.push(`${m.dataset.label}: ₩${(m.raw/1e4).toFixed(0)}만`)});const g=p.reduce((m,D)=>m+D.raw,0);h.push(`총 매출: ₩${(g/1e4).toFixed(0)}만`);const y=d.find(m=>m.dataset.type==="line");return y&&h.push(`구매건수: ${y.raw}건`),h},label:function(d){return null}}},legend:{position:"top",align:"center",labels:{usePointStyle:!0,padding:20}}}}};this.dayOfWeekSalesChart&&this.dayOfWeekSalesChart.destroy(),this.dayOfWeekSalesChart=new Chart(e,c);const u=l.reduce((d,h)=>d+h,0)/7}catch(e){console.error("요일별 매출 차트 업데이트 중 오류:",e)}}formatDateForChart(t){return`${t.getMonth()+1}/${t.getDate()}`}formatCurrency(t){return new Intl.NumberFormat("ko-KR",{style:"currency",currency:"KRW",maximumFractionDigits:0}).format(t)}groupDataByDay(t){const e=new Array(7).fill(0);return t.forEach(a=>{let r=this.getDateWithoutTime(a.date||a.orderDate).getDay();r=r===0?6:r-1;const o=parseFloat(a.매출||0);e[r]+=o}),e}groupDataByChannel(t){const e=new Map;t.forEach(s=>{const r=s.channel||s.seller||"기타",o=parseInt(s.quantity)||0,n=s.originalProduct||s.productName||"",i=s.originalOption||"",l=this.dataService.mappingService.getMappedProductInfo(n,i,r);if(l&&!["취소","미결제취소","반품"].includes(s.orderStatus)){const c=o*l.price;e.has(r)||e.set(r,0),e.set(r,e.get(r)+c)}});const a=new Map([...e.entries()].sort((s,r)=>r[1]-s[1]));return{labels:Array.from(a.keys()),values:Array.from(a.values())}}groupDataByPeriod(t,e){const a={},s=this.getDateWithoutTime(this.startDate),r=this.getDateWithoutTime(this.endDate);t.forEach(n=>{const i=this.getDateWithoutTime(n.date||n.orderDate);if(i<s||i>r)return;let l;switch(e){case"day":l=this.formatDateForChart(i);break;case"week":{const u=i.getDay(),d=u===0?-6:1-u,h=new Date(i);h.setDate(i.getDate()+d);const p=new Date(h);p.setDate(h.getDate()+6),l=`${this.formatDateForChart(h)} ~ ${this.formatDateForChart(p)}`;break}case"month":l=`${i.getFullYear()}년 ${i.getMonth()+1}월`;break}a[l]||(a[l]=0);const c=parseFloat(n.매출||0);a[l]+=c});const o=new Map([...a.entries()].sort((n,i)=>{const l=this.getDateFromString(n[0].split("~")[0].trim()),c=this.getDateFromString(i[0].split("~")[0].trim());return l-c}));return{labels:Array.from(o.keys()),values:Array.from(o.values())}}formatDateForChart(t){return`${t.getMonth()+1}/${t.getDate()}`}getChartTitle(){switch(this.currentChartPeriod){case"day":return"일별 매출";case"week":return"주별 매출";case"month":return"월별 매출";default:return"기간별 매출"}}formatNumber(t){return new Intl.NumberFormat("ko-KR").format(t)}getDateWithoutTime(t){const e=new Date(t);return new Date(e.getFullYear(),e.getMonth(),e.getDate())}getDateFromString(t){const e=t.match(/(\d+)월 (\d+)일/);if(e){const a=new Date().getFullYear();return new Date(a,parseInt(e[1])-1,parseInt(e[2]))}return new Date(t)}updateTopChannels(t){const e={};let a=0;t.forEach(o=>{const n=o.판매처||"기타",i=parseFloat(o.매출||0);e[n]=(e[n]||0)+i,a+=i});const s=Object.entries(e).sort(([,o],[,n])=>n-o).map(([o,n])=>({channel:o,sales:n,ratio:(n/a*100).toFixed(2)})),r=document.getElementById("top-channels");r&&(r.innerHTML=s.map(({channel:o,sales:n,ratio:i})=>`
                <div class="stat-item">
                    <div class="stat-title">${o}</div>
                    <div class="stat-value">${this.formatCurrency(n)}</div>
                    <div class="stat-sub">${i}%</div>
                </div>
            `).join(""))}updateTopProducts(t){const e={};t.forEach(r=>{const o=parseInt(r.quantity)||0,n=r.originalProduct||r.productName||"",i=r.originalOption||"",l=this.dataService.mappingService.getMappedProductInfo(n,i,r.channel||r.seller);let c=n,u=0;l&&(c=l.productName,u=["취소","미결제취소","반품"].includes(r.orderStatus)?0:l.price);const d=o*u;["취소","미결제취소","반품"].includes(r.orderStatus)||(e[c]||(e[c]={sales:0,quantity:0}),e[c].sales+=d,e[c].quantity+=o)});const a=Object.values(e).sort((r,o)=>o.sales-r.sales).slice(0,5).map(({product:r,sales:o,quantity:n})=>({product:r,sales:o,quantity:n})),s=document.getElementById("top-products");s&&(s.innerHTML=a.map(({product:r,sales:o,quantity:n})=>`
                <div class="stat-item">
                    <div class="stat-title">${r}</div>
                    <div class="stat-value">${this.formatCurrency(o)}</div>
                    <div class="stat-sub">${n}개</div>
                </div>
            `).join(""))}getChannelColor(t){return{스마트스토어:"rgba(81, 194, 106, 0.8)",오늘의집:"rgba(83, 163, 194, 0.8)",유튜브쇼핑:"rgba(184, 59, 48, 0.8)"}[t]||"rgba(201, 203, 207, 0.8)"}formatComparePeriod(t,e){const a=new Date(t),s=new Date(e);return`${a.getMonth()+1}월 ${a.getDate()}일 ~ ${s.getMonth()+1}월 ${s.getDate()}일과 비교`}formatPeriodLabels(t,e){return t.map(a=>{const s=new Date(a),r=new Date(s.getTime()+9*60*60*1e3);switch(e){case"monthly":return`${r.getFullYear()}년 ${r.getMonth()+1}월`;case"weekly":return`${r.getMonth()+1}월 ${r.getDate()}일`;case"daily":default:return`${r.getMonth()+1}/${r.getDate()}`}})}initializeCharts(){const t=document.getElementById("periodSalesChart"),e=document.getElementById("dayOfWeekSalesChart");t&&!this.periodSalesChart&&(this.periodSalesChart=new Chart(t,{type:"bar",data:{labels:[],datasets:[]},options:{responsive:!0,maintainAspectRatio:!1}})),e&&!this.dayOfWeekSalesChart&&(this.dayOfWeekSalesChart=new Chart(e,{type:"bar",data:{labels:[],datasets:[]},options:{responsive:!0,maintainAspectRatio:!1}}))}formatDateKey(t){const e=t.getFullYear(),a=String(t.getMonth()+1).padStart(2,"0"),s=String(t.getDate()).padStart(2,"0");return`${e}-${a}-${s}`}initializeChartPeriodButtons(){document.querySelectorAll(".period-btn").forEach(t=>{t.addEventListener("click",e=>{document.querySelectorAll(".period-btn").forEach(s=>{s.classList.remove("active")}),e.target.classList.add("active"),this.currentChartPeriod=e.target.dataset.period;const a=this.dataService.getCurrentData();a&&this.updatePeriodSalesChart(a)})})}async handleDateSelection(t,e=null,a=null){try{if(t==="all"){this.startDate=new Date("2023-06-26"),this.startDate.setHours(0,0,0,0),this.endDate=new Date,this.endDate.setHours(23,59,59,999);const s=document.getElementById("dateRangePicker")._flatpickr;s&&s.setDate([this.startDate,this.endDate])}else{const s=this.calculateDateRange(t,e,a);this.startDate=s.startDate,this.endDate=s.endDate}this.currentPeriod=t,await this.updateDashboard()}catch(s){console.error("날짜 선택 처리 중 오류:",s)}}async updateDetailedSalesInfo(t){try{const e=document.querySelector(".show-more-container");e&&e.remove();const a={};let s=0,r=0,o=0;const n=await M(E(window.firebase.db,"channelCommissions")),i={};n.forEach(c=>{const u=c.data(),d=`${u.productName}|${u.option||""}`;i[d]=u.commissionRates}),t.forEach(c=>{const u=this.dataService.mappingService.getMappedProductInfo(c.originalProduct||c.productName,c.originalOption||"",c.channel||c.seller);if(!u||["취소","미결제취소","반품"].includes(c.orderStatus))return;const d=parseInt(c.quantity)||0,h=u.price*d,p=u.cost*d,g=h-p,y=`${u.productName}|${u.option||""}`,m=i[y];let D=0;if(m){const v=c.channel||c.seller;let w=0;v==="스마트스토어"?w=m.smartstore:v==="오늘의집"?w=m.ohouse:v==="유튜브쇼핑"&&(w=m.ytshopping),D=h*w/100}const S=g-D,b=`${u.productName}|${u.option||""}`;a[b]||(a[b]={product:u.productName,option:u.option||"",quantity:0,sales:0,profit:0,commission:0,operatingProfit:0}),a[b].quantity+=d,a[b].sales+=h,a[b].profit+=g,a[b].commission+=D,a[b].operatingProfit+=S,s+=h,r+=g,o+=S});const l=document.getElementById("productSalesBody");if(l){const c=l.closest("table");c.classList.contains("sales-table")||(c.className="sales-table");const u=Object.values(a).sort((y,m)=>m.sales-y.sales),d=15;let h=!1;const p=u.map((y,m)=>{const D=(y.profit/y.sales*100).toFixed(1),S=(y.operatingProfit/y.sales*100).toFixed(1);return`
                        <tr class="product-row ${m>=d?"hidden":""}">
                            <td class="text-center">${m+1}</td>
                            <td>${y.product}</td>
                            <td>${y.option||"-"}</td>
                            <td class="text-right">${this.formatNumber(y.quantity)}개</td>
                            <td class="text-right">${this.formatCurrency(y.sales)}</td>
                            <td class="text-right">${this.formatCurrency(y.profit)} (${D}%)</td>
                            <td class="text-right">${this.formatCurrency(y.operatingProfit)} (${S}%)</td>
                        </tr>
                    `}),g=`
                    <tr class="total-row">
                        <td colspan="4"><strong>합계</strong></td>
                        <td class="text-right"><strong>${this.formatCurrency(s)}</strong></td>
                        <td class="text-right"><strong>${this.formatCurrency(r)} (${(r/s*100).toFixed(1)}%)</strong></td>
                        <td class="text-right"><strong>${this.formatCurrency(o)} (${(o/s*100).toFixed(1)}%)</strong></td>
                    </tr>
                `;if(l.innerHTML=p.join("")+g,u.length>d){const y=document.createElement("div");y.className="show-more-container",y.innerHTML=`
                        <button class="show-more-button" data-expanded="false">
                            더보기 (${d}/${u.length})
                        </button>
                    `;const m=c.parentNode.querySelector(".show-more-container");m&&m.remove(),c.parentNode.insertBefore(y,c.nextSibling);const D=y.querySelector(".show-more-button");D.addEventListener("click",()=>{const S=D.getAttribute("data-expanded")==="true";l.querySelectorAll(".product-row").forEach((v,w)=>{w>=d&&v.classList.toggle("hidden",S)}),D.setAttribute("data-expanded",(!S).toString()),D.textContent=S?`더보기 (${d}/${u.length})`:"접기"})}}}catch(e){console.error("상품별 매출 정보 업데이트 중 오류:",e)}}updateChannelSales(t){const e=this.groupDataByChannel(t),a=e.values.reduce((n,i)=>n+i,0),s=document.getElementById("channelSalesBody");if(!s)return;const r=e.labels.map((n,i)=>{const l=e.values[i],c=(l/a*100).toFixed(1);return`
                <tr>
                    <td>${n}</td>
                    <td class="text-right">${this.formatCurrency(l)}</td>
                    <td class="text-right">${c}%</td>
                </tr>
            `}),o=`
            <tr class="total-row">
                <td><strong>합계</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(a)}</strong></td>
                <td class="text-right"><strong>100%</strong></td>
            </tr>
        `;s.innerHTML=r.join("")+o}initializeCommissionTab(){const t=document.getElementById("channelCommissionTab");t.innerHTML=`
            <div class="commission-management">
                <div class="commission-controls" style="text-align: left;">
                    <button id="editCommissions" class="btn">수정</button>
                    <button id="saveCommissions" class="btn" style="display: none;">저장</button>
                    <button id="addCommissionRow" class="btn" style="display: none;">새 상품 추가</button>
                </div>
                <div class="commission-table-container">
                    <table id="commissionTable">
                        <thead>
                            <tr>
                                <th>상품명</th>
                                <th>옵션</th>
                                <th>스마트스토어 (%)</th>
                                <th>오늘의집 (%)</th>
                                <th>유튜브쇼핑 (%)</th>
                                <th class="action-column">작업</th>
                            </tr>
                        </thead>
                        <tbody id="commissionTableBody"></tbody>
                    </table>
                </div>
                <div class="commission-bottom-controls">
                    <button id="editCommissionsBottom" class="btn">수정</button>
                    <button id="saveCommissionsBottom" class="btn" style="display: none;">저장</button>
                    <button id="addCommissionRowBottom" class="btn" style="display: none;">새 상품 추가</button>
                </div>
            </div>
        `,this.initializeCommissionListeners(),this.loadCommissionData()}createCommissionRow(t=null,e=!1){var s,r,o,n,i,l;const a=document.createElement("tr");return e?a.innerHTML=`
                <td><input type="text" class="commission-input product-name" value="${(t==null?void 0:t.productName)||""}" required></td>
                <td><input type="text" class="commission-input option" value="${(t==null?void 0:t.option)||""}" ></td>
                <td><input type="number" class="commission-input smartstore" value="${((s=t==null?void 0:t.commissionRates)==null?void 0:s.smartstore)||"0"}" min="0" max="100" step="0.1"></td>
                <td><input type="number" class="commission-input ohouse" value="${((r=t==null?void 0:t.commissionRates)==null?void 0:r.ohouse)||"0"}" min="0" max="100" step="0.1"></td>
                <td><input type="number" class="commission-input ytshopping" value="${((o=t==null?void 0:t.commissionRates)==null?void 0:o.ytshopping)||"0"}" min="0" max="100" step="0.1"></td>
                <td class="action-column">
                    <button class="delete-row-btn">삭제</button>
                </td>
            `:a.innerHTML=`
                <td>${(t==null?void 0:t.productName)||""}</td>
                <td>${(t==null?void 0:t.option)||""}</td>
                <td>${((n=t==null?void 0:t.commissionRates)==null?void 0:n.smartstore)||"0"}%</td>
                <td>${((i=t==null?void 0:t.commissionRates)==null?void 0:i.ohouse)||"0"}%</td>
                <td>${((l=t==null?void 0:t.commissionRates)==null?void 0:l.ytshopping)||"0"}%</td>
                <td class="action-column"></td>
            `,a}async loadCommissionData(){try{const t=await M(E(window.firebase.db,"channelCommissions")),e=document.getElementById("commissionTableBody");e.innerHTML="",t.forEach(a=>{const s=a.data(),r=this.createCommissionRow(s,!1);r.dataset.id=a.id,e.appendChild(r)})}catch(t){console.error("수수료 데이터 로드 중 오류:",t)}}initializeCommissionListeners(){const t=document.getElementById("editCommissions"),e=document.getElementById("saveCommissions"),a=document.getElementById("addCommissionRow"),s=document.getElementById("editCommissionsBottom"),r=document.getElementById("saveCommissionsBottom"),o=document.getElementById("addCommissionRowBottom"),n=document.getElementById("commissionTableBody"),i=async c=>{if(!c)try{const u=n.getElementsByTagName("tr"),d=window.firebase.firestore.batch();Array.from(u).forEach(h=>{const p=h.querySelectorAll("input"),g={productName:p[0].value,option:p[1].value,commissionRates:{smartstore:parseFloat(p[2].value)||0,ohouse:parseFloat(p[3].value)||0,ytshopping:parseFloat(p[4].value)||0},updatedAt:ht()},y=h.dataset.id||$(E(window.firebase.db,"channelCommissions")).id,m=$(window.firebase.db,"channelCommissions",y);d.set(m,g)}),await d.commit(),alert("수수료 정보가 저장되었습니다."),await this.loadCommissionData()}catch(u){console.error("수수료 정보 저장 중 오류:",u),alert("저장 중 오류가 발생했습니다.");return}if(t.style.display=c?"none":"inline-block",e.style.display=c?"inline-block":"none",a.style.display=c?"inline-block":"none",s.style.display=c?"none":"inline-block",r.style.display=c?"inline-block":"none",o.style.display=c?"inline-block":"none",c){const u=n.getElementsByTagName("tr");Array.from(u).forEach(d=>{const h={productName:d.cells[0].textContent,option:d.cells[1].textContent,commissionRates:{smartstore:parseFloat(d.cells[2].textContent),ohouse:parseFloat(d.cells[3].textContent),ytshopping:parseFloat(d.cells[4].textContent)}},p=this.createCommissionRow(h,!0);p.dataset.id=d.dataset.id,d.replaceWith(p)})}};t.addEventListener("click",()=>i(!0)),s.addEventListener("click",()=>i(!0)),e.addEventListener("click",()=>i(!1)),r.addEventListener("click",()=>i(!1));const l=()=>{const c=this.createCommissionRow(null,!0);n.appendChild(c)};a.addEventListener("click",l),o.addEventListener("click",l),n.addEventListener("click",async c=>{var u;if(c.target.classList.contains("delete-row-btn")){const d=c.target.closest("tr"),h=((u=d.querySelector(".product-name"))==null?void 0:u.value)||d.cells[0].textContent;if(confirm(`"${h}" 상품의 수수료 정보를 삭제하시겠습니까?`)){if(d.dataset.id)try{await ut($(window.firebase.db,"channelCommissions",d.dataset.id)),alert("삭제되었습니다.")}catch(p){console.error("삭제 중 오류:",p),alert("삭제 중 오류가 발생했습니다.");return}d.remove()}}})}switchTab(t){var e,a;document.querySelectorAll(".tab-content, .sidebar-menu-item").forEach(s=>{s.classList.remove("active")}),(e=document.getElementById(t))==null||e.classList.add("active"),(a=document.querySelector(`.sidebar-menu-item[data-tab="${t}"]`))==null||a.classList.add("active")}updateMonthlySalesTable(t){const e=document.getElementById("monthlySalesBody");if(!e)return;const a=e.closest("table");a.className="monthly-sales-table";const s={};t.forEach(o=>{if(!["취소","미결제취소","반품"].includes(o.orderStatus)){const n=new Date(o.orderDate),i=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`;s[i]||(s[i]={storeSales:0,adRevenue:0,groupSales:0});const l=this.dataService.mappingService.getMappedProductInfo(o.originalProduct||o.productName,o.originalOption||"",o.channel||o.seller);if(l){const c=parseInt(o.quantity)*l.price;o.isGroupPurchase?s[i].groupSales+=c:s[i].storeSales+=c}}});const r=Object.entries(s).sort(([o],[n])=>n.localeCompare(o)).map(([o,n])=>{const i=n.storeSales+n.adRevenue+n.groupSales,[l,c]=o.split("-");return`
                    <tr>
                        <td>
                            <span class="expand-btn">+</span>
                            ${c}월
                        </td>
                        <td class="text-right">${this.formatCurrency(n.storeSales)}</td>
                        <td class="text-right">${this.formatCurrency(n.adRevenue)}</td>
                        <td class="text-right">${this.formatCurrency(n.groupSales)}</td>
                        <td class="text-right">${this.formatCurrency(i)}</td>
                    </tr>
                    <tr class="detail-row" style="display: none;">
                        <td colspan="5">
                            <div class="sales-detail">
                                <div class="store-sales-detail">
                                    <h4>스토어 매출 상세</h4>
                                    ${this.generateStoreSalesDetail(n.storeSales)}
                                </div>
                                ${n.groupSales>0?`
                                    <div class="group-sales-detail">
                                        <h4>공동구매 매출 상세</h4>
                                        ${this.generateGroupSalesDetail(n.groupSales)}
                                    </div>
                                `:""}
                            </div>
                        </td>
                    </tr>
                `});e.innerHTML=r.join(""),this.initializeExpandButtons()}initializeExpandButtons(){document.querySelectorAll(".expand-btn").forEach(t=>{t.addEventListener("click",e=>{const a=e.target.closest("tr").nextElementSibling,s=a.style.display!=="none";e.target.textContent=s?"+":"-",a.style.display=s?"none":"table-row"})})}generateStoreSalesDetail(t){return`
            <div class="monthly-sales-detail">
                <h4>스토어 매출 상세</h4>
                <div class="sales-detail-grid">
                    <div class="sales-detail-item">
                        <div class="store-name">스마트스토어</div>
                        <div class="store-amount">${this.formatCurrency(t*.7)}</div>
                    </div>
                    <div class="sales-detail-item">
                        <div class="store-name">오늘의집</div>
                        <div class="store-amount">${this.formatCurrency(t*.2)}</div>
                    </div>
                    <div class="sales-detail-item">
                        <div class="store-name">유튜브쇼핑</div>
                        <div class="store-amount">${this.formatCurrency(t*.1)}</div>
                    </div>
                </div>
            </div>
        `}generateGroupSalesDetail(t){return`
            <div class="monthly-sales-detail">
                <h4>공동구매 매출 상세</h4>
                <div class="sales-detail-grid">
                    <div class="sales-detail-item">
                        <div class="group-sales-title">총 매출액</div>
                        <div class="group-sales-amount">${this.formatCurrency(t)}</div>
                    </div>
                </div>
            </div>
        `}initializeChartControls(){const t=document.getElementById("periodSalesChart").parentElement,e=document.createElement("div");e.className="period-btn-container",e.innerHTML=`
            <button class="period-btn active" data-period="daily">일별</button>
            <button class="period-btn" data-period="weekly">주별</button>
            <button class="period-btn" data-period="monthly">월별</button>
        `,t.insertBefore(e,t.firstChild),document.querySelectorAll(".period-btn").forEach(a=>{a.addEventListener("click",s=>{document.querySelectorAll(".period-btn").forEach(o=>{o.classList.remove("active")}),s.target.classList.add("active");const r=s.target.dataset.period;this.currentChartPeriod=r,this.updatePeriodSalesChart(this.dataService.getCurrentData())})})}initializeOrderTab(){const t=document.querySelector("#orderTab .order-dashboard");t&&(t.innerHTML=`
            <div class="date-selector-container">
                <div class="button-container">
                    <button class="date-selector" data-period="today">오늘</button>
                    <button class="date-selector" data-period="this-week">이번 주</button>
                    <button class="date-selector" data-period="this-month">이번 달</button>
                    <button class="date-selector" data-period="custom">직접설정</button>
                </div>
                <input type="text" id="orderDateRangePicker" class="date-range-picker" style="display: none;" placeholder="날짜 선택" readonly>
            </div>
            <div class="order-summary">
                <div class="order-stats">
                    <div class="order-stat-box">
                        <h3>발주 현황</h3>
                        <div class="order-stat-value" id="order-status">0건</div>
                    </div>
                    <div class="order-stat-box">
                        <h3>발주액</h3>
                        <div class="order-stat-value" id="order-amount">0원</div>
                    </div>
                </div>
            </div>
            <div class="order-cards-container">
                <div id="orderTableContainer" class="order-table-container"></div>
            </div>
        `,document.querySelectorAll("#orderTab .date-selector").forEach(e=>{e.addEventListener("click",a=>{const s=a.target.dataset.period,r=document.getElementById("orderDateRangePicker");document.querySelectorAll("#orderTab .date-selector").forEach(o=>{o.classList.remove("active")}),a.target.classList.add("active"),r.style.display=s==="custom"?"block":"none",s!=="custom"&&this.handleOrderDateSelection(s)})}),this.initializeOrderDatePicker())}calculateRepurchaseStats(t){const e=new Map,a=t.filter(o=>!["취소","반품","미결제취소"].includes(o.orderStatus)),s=new Map;a.forEach(o=>{const n=o.orderNumber;s.has(n)||s.set(n,{customerName:o.customerName,customerContact:o.customerContact,date:o.date||o.orderDate,amount:0});const i=s.get(n),l=parseInt(o.quantity)||0,c=this.dataService.mappingService.getMappedProductInfo(o.originalProduct||o.productName,o.originalOption||"",o.channel||o.seller);c&&(i.amount+=l*c.price)}),s.forEach((o,n)=>{const{customerName:i,customerContact:l,date:c,amount:u}=o;if(!i||!l)return;const d=`${i}-${l}`;e.has(d)||e.set(d,{name:i,contact:l,orders:[],totalAmount:0});const h=e.get(d);h.orders.push({date:c,amount:u}),h.totalAmount+=u});const r={firstTime:{count:0,customers:[]},repeat:{count:0,customers:[]},threeOrMore:{count:0,customers:[]},fiveOrMore:{count:0,customers:[]}};return e.forEach(o=>{const n=o.orders.length;o.purchaseCount=n,n===1?(r.firstTime.count++,r.firstTime.customers.push(o)):n>=5?(r.fiveOrMore.count++,r.fiveOrMore.customers.push(o)):n>=3?(r.threeOrMore.count++,r.threeOrMore.customers.push(o)):n===2&&(r.repeat.count++,r.repeat.customers.push(o))}),r}updateRepurchaseStats(t){try{const e=this.calculateRepurchaseStats(t),a=document.getElementById("repurchaseStatsBody");if(!a)return;const s=e.firstTime.count+e.repeat.count+e.threeOrMore.count+e.fiveOrMore.count;a.innerHTML="",[{label:"첫 구매",count:e.firstTime.count,customers:e.firstTime.customers},{label:"재구매",count:e.repeat.count,customers:e.repeat.customers},{label:"3회~4회",count:e.threeOrMore.count,customers:e.threeOrMore.customers},{label:"5회 이상",count:e.fiveOrMore.count,customers:e.fiveOrMore.customers}].forEach(l=>{const c=s>0?(l.count/s*100).toFixed(1):"0.0",u=document.createElement("tr");u.className="main-row",u.innerHTML=`
                    <td>
                        <button type="button" class="toggle-details-btn" aria-label="상세 정보 토글">
                            <i class="fas fa-plus"></i>
                        </button>
                        <span>${l.label}</span>
                    </td>
                    <td class="text-right">${l.count}명</td>
                    <td class="text-right">${c}%</td>
                `;const d=document.createElement("tr");d.className="detail-row",d.style.display="none",d.innerHTML=`
                    <td colspan="3">
                        <div class="customer-details-container">
                            <div class="sort-controls">
                                <div class="sort-buttons">
                                    <button class="sort-btn" data-sort="amount">
                                        구매금액순
                                        <i class="fas fa-sort"></i>
                                    </button>
                                    <button class="sort-btn" data-sort="date">
                                        최근구매순
                                        <i class="fas fa-sort"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="customer-list"></div>
                        </div>
                    </td>
                `,a.appendChild(u),a.appendChild(d);const h=u.querySelector(".toggle-details-btn");h.addEventListener("click",p=>{p.stopPropagation();const g=h.querySelector("i"),y=d.style.display!=="none";if(a.querySelectorAll(".detail-row").forEach(m=>{if(m!==d){m.style.display="none";const D=m.previousElementSibling.querySelector(".toggle-details-btn i");D&&(D.className="fas fa-plus")}}),y)d.style.display="none",g.className="fas fa-plus";else{d.style.display="table-row",g.className="fas fa-minus";const m=d.querySelector(".customer-list");this.displayCustomerDetails(m,l.customers)}})});const o=document.createElement("tr");o.className="total-row";const n=e.repeat.count+e.threeOrMore.count+e.fiveOrMore.count,i=s>0?(n/s*100).toFixed(1):"0.0";o.innerHTML=`
                <td>전체</td>
                <td class="text-right">${s}명</td>
                <td class="text-right">재구매율: ${i}%</td>
            `,a.appendChild(o)}catch(e){console.error("재구매 통계 업데이트 중 오류:",e)}}displayCustomerDetails(t,e){if(!t||!e)return;const a=r=>{const o=new Date(r);return`${String(o.getFullYear()).slice(-2)}.${String(o.getMonth()+1).padStart(2,"0")}.${String(o.getDate()).padStart(2,"0")}`};t.innerHTML=e.map(r=>{const o=[...r.orders].sort((n,i)=>new Date(n.date)-new Date(i.date));return`
                <div class="customer-detail-item">
                    <div class="customer-info">
                        <div class="customer-header">
                            <span class="customer-name">${r.name}</span>
                            <span class="customer-contact">(${r.contact||""})</span>
                        </div>
                        <div class="customer-total">₩${this.formatNumber(r.totalAmount)}</div>
                    </div>
                    <div class="purchase-info">
                        <span class="purchase-count">${r.orders.length}회 구매</span>
                        <span class="purchase-dates">${o.map(n=>a(n.date)).join(", ")}</span>
                    </div>
                </div>
            `}).join("");const s=t.parentElement.querySelectorAll(".sort-btn");s.forEach(r=>{r.addEventListener("click",o=>{o.stopPropagation();const n=r.dataset.sort,i=r.dataset.currentSort||"none";let l="asc";i==="asc"&&(l="desc"),i==="desc"&&(l="asc"),s.forEach(u=>{u.dataset.currentSort="",u.querySelector("i").className="fas fa-sort"}),r.dataset.currentSort=l,r.querySelector("i").className=`fas fa-sort-${l==="asc"?"up":"down"}`;const c=[...e].sort((u,d)=>{if(n==="amount")return l==="asc"?u.totalAmount-d.totalAmount:d.totalAmount-u.totalAmount;if(n==="date"){const h=new Date(u.orders[0].date),p=new Date(d.orders[0].date);return l==="asc"?h-p:p-h}return 0});this.displayCustomerDetails(t,c)})})}async updateSalesData(t){console.log("상품별 매출 계산 시작");const e={};t.forEach(s=>{s.seller==="오늘의집"&&console.log("오늘의집 상품 처리:",{productName:s.productName,option:s.optionName||s.optionInfo||s.option||"",quantity:s.quantity,sales:s.sales,orderStatus:s.orderStatus});const r=parseInt(s.quantity)||0,o=s.optionName||s.optionInfo||s.option||"",n=this.dataService.mappingService.getMappedProductInfo(s.productName,o)||{product:s.productName,option:o,price:s.originalSales/r,cost:0},i=`${n.product}-${n.option}`;e[i]||(e[i]={quantity:0,sales:0,cost:n.cost||0});let l=n.price*r;s.seller==="스마트스토어"&&CONFIG.SALES.ZERO_SALES_STATUSES.includes(s.orderStatus)&&(l=0),e[i].quantity+=r,e[i].sales+=l}),console.log("최종 상품별 매출:",e);const a=document.querySelector("#sales-by-product tbody");a&&Object.entries(e).sort(([,s],[,r])=>r.sales-s.sales).forEach(([s,r])=>{const o=document.createElement("tr");o.innerHTML=`
                    <td>${s}</td>
                    <td class="text-right">${this.formatNumber(r.quantity)}</td>
                    <td class="text-right">${this.formatCurrency(r.sales)}</td>
                    <td class="text-right">${this.formatCurrency(r.cost*r.quantity)}</td>
                    <td class="text-right">${this.formatCurrency(r.sales-r.cost*r.quantity)}</td>
                `,a.appendChild(o)})}}class Nt{constructor(){this.notionService=new A("1541d84cc1ac80bc8696fe96b2cc86b8"),this.orderTableContainer=document.getElementById("orderTableContainer"),this.data=[],this.initialize(),this.setupDateFilter()}async initialize(){try{this.orderTableContainer.innerHTML='<div class="loading">데이터를 불러오는 중...</div>';const t=await this.notionService.fetchDatabase(),e=this.processNotionData(t);this.data=e,this.renderTable(this.data)}catch(t){console.error("발주 데이터 초기화 중 오류:",t),this.orderTableContainer.innerHTML=`
                <div class="error-message">
                    데이터를 불러오는데 실패했습니다.<br>
                    <small>${t.message}</small>
                </div>
            `}}processNotionData(t){try{const e=t.reduce((a,s)=>{var d,h,p,g,y,m,D,S,b,v,w,I,L,T,O,N,k,F,P,B,x,R,H,q,_,U,Y,G,z,j,W,K,V,Z,J,Q,X,tt,et,at,st,rt,ot;const r=s.properties;console.log(`
=== 주문 데이터 ===`),console.log({발주코드:(h=(d=r.발주코드)==null?void 0:d.select)==null?void 0:h.name,발주명:(y=(g=(p=r.발주명)==null?void 0:p.rich_text)==null?void 0:g[0])==null?void 0:y.plain_text,발주차수:(D=(m=r.발주차수)==null?void 0:m.select)==null?void 0:D.name,발주액:{수량:(S=r.발주수량)==null?void 0:S.number,단가:(b=r.단가)==null?void 0:b.number},송금:{선금:(v=r.선금송금액)==null?void 0:v.number,선금환율:(w=r.선금환율)==null?void 0:w.number,잔금:(I=r.잔금송금액)==null?void 0:I.number,잔금환율:(L=r.잔금환율)==null?void 0:L.number},입항후비용:(T=r.입항후비용)==null?void 0:T.number,상태:(N=(O=r.상태)==null?void 0:O.status)==null?void 0:N.name});const o=((F=(k=r.발주코드)==null?void 0:k.select)==null?void 0:F.name)||"";if(!o)return console.warn("발주코드 누락된 데이터 발견"),a;const n=((x=(B=(P=r.발주명)==null?void 0:P.rich_text)==null?void 0:B[0])==null?void 0:x.plain_text)||"제목 없음",i=((H=(R=r.발주차수)==null?void 0:R.select)==null?void 0:H.name)||"미지정";a[o]||(a[o]={발주코드:o,발주명:n,상태:((_=(q=r.상태)==null?void 0:q.status)==null?void 0:_.name)||"",총발주수량:0,총발주액:0,최초발주일:null,최종입고일:null,차수별발주:{}}),a[o].차수별발주[i]||(a[o].차수별발주[i]={발주차수:i,발주명:n,발주수량:0,발주액:0,items:[]});const l={id:s.id,발주명:n,발주일:((Y=(U=r.발주일)==null?void 0:U.date)==null?void 0:Y.start)||"",발주수량:((G=r.발주수량)==null?void 0:G.number)||0,단가:((z=r.단가)==null?void 0:z.number)||0,발주액:(((j=r.발주수량)==null?void 0:j.number)||0)*(((W=r.단가)==null?void 0:W.number)||0),선금환율:((K=r.선금환율)==null?void 0:K.number)||0,잔금환율:((V=r.잔금환율)==null?void 0:V.number)||0,선금송금액:((Z=r.선금송금액)==null?void 0:Z.number)||0,잔금송금액:((J=r.잔금송금액)==null?void 0:J.number)||0,입항후비용:((Q=r.입항후비용)==null?void 0:Q.number)||0,원화발주액:((X=r.원화발주액)==null?void 0:X.number)||0,상태:((et=(tt=r.상태)==null?void 0:tt.status)==null?void 0:et.name)||"",입항예정일:((st=(at=r.입항예정일)==null?void 0:at.date)==null?void 0:st.start)||"",최종입고일:((ot=(rt=r.최종입고일)==null?void 0:rt.date)==null?void 0:ot.start)||""};l.원화환산=l.선금송금액*l.선금환율+l.잔금송금액*l.잔금환율+(l.원화발주액||0),l.잔금=l.잔금송금액?0:l.발주액-l.선금송금액,l.제품원가=(l.원화환산+(l.입항후비용||0))/l.발주수량,a[o].차수별발주[i].발주수량+=l.발주수량,a[o].차수별발주[i].발주액+=l.발주액,a[o].차수별발주[i].items.push(l),a[o].총발주수량+=l.발주수량,a[o].총발주액+=l.발주액,a[o].총잔액=(a[o].총잔액||0)+l.잔금,(!a[o].최초발주일||l.발주일<a[o].최초발주일)&&(a[o].최초발주일=l.발주일),l.최종입고일&&(!a[o].최종입고일||l.최종입고일>a[o].최종입고일)&&(a[o].최종입고일=l.최종입고일);const c=l.선금송금액*l.선금환율,u=l.잔금송금액*l.잔금환율;return console.log("원화환산:",{선금:`$${l.선금송금액} × ₩${l.선금환율} = ₩${c}`,잔금:`$${l.잔금송금액} × ₩${l.잔금환율} = ₩${u}`,총액:`₩${c+u}`}),a},{});return Object.values(e)}catch(e){throw console.error("데이터 처리 중 오류:",e),e}}renderTable(t){const e=this.calculateOrderStats(t),a=document.createElement("div");a.innerHTML=`
            <div class="stats-grid">
                <div class="stat-box">
                    <h3>발주 현황</h3>
                    <div class="stat-value">${Object.values(e.statusCount).reduce((s,r)=>s+r,0)}건</div>
                    <div class="stat-details">
                        ${Object.entries(e.statusCount).map(([s,r])=>`
                            <div class="stat-detail">
                                <span class="detail-label">${s}:</span>
                                <span class="detail-value">${r}건</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
                <div class="stat-box">
                    <h3>발주액</h3>
                    <div class="stat-details">
                        <div class="stat-detail usd-amount">
                            <span class="detail-label">USD 총 발주액:</span>
                            <span class="detail-value">$${Math.round(e.totalAmountUSD).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail krw-amount">
                            <span class="detail-label">원화 총 발주액:</span>
                            <span class="detail-value">₩${Math.round(e.totalWonAmount).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail section-divider usd-amount">
                            <span class="detail-label">송금 총액 (USD):</span>
                            <span class="detail-value">$${Math.round(e.totalPaidUSD).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail remaining">
                            <span class="detail-label">잔금 총액 (USD):</span>
                            <span class="detail-value">$${Math.round(e.totalRemainingUSD).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail section-divider usd-amount">
                            <span class="detail-label">USD 송금 원화환산:</span>
                            <span class="detail-value">₩${Math.round(e.totalUSDtoKRW).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail krw-amount">
                            <span class="detail-label">원화 발주 송금액:</span>
                            <span class="detail-value">₩${Math.round(e.totalWonAmount).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail section-divider">
                            <span class="detail-label">제품발주비용:</span>
                            <span class="detail-value">₩${Math.round(e.totalProductCost).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail post-arrival">
                            <span class="detail-label">입항후비용:</span>
                            <span class="detail-value">₩${Math.round(e.totalPostArrivalCost).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail total">
                            <span class="detail-label">발주관련 총액:</span>
                            <span class="detail-value">₩${Math.round(e.totalOrderAmount).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="order-cards-container">
                ${this.generateOrderCardsHTML(t)}
            </div>
        `,this.orderTableContainer.innerHTML="",this.orderTableContainer.appendChild(a),this.setupCardEventListeners(a.querySelector(".order-cards-container"))}calculateOrderStats(t){const e={statusCount:{},totalAmountUSD:0,totalPaidUSD:0,totalRemainingUSD:0,totalUSDtoKRW:0,totalWonAmount:0,totalProductCost:0,totalPostArrivalCost:0,totalOrderAmount:0};return t.forEach(a=>{const s=a.상태||"상태없음";e.statusCount[s]=(e.statusCount[s]||0)+1,e.totalAmountUSD+=Number(a.총발주액)||0,e.totalPaidUSD+=Number(a.송금총액)||0,e.totalRemainingUSD+=Number(a.총잔액)||0,Object.values(a.차수별발주||{}).forEach(r=>{r.items.forEach(o=>{const n=(Number(o.선금송금액)||0)*(Number(o.선금환율)||0),i=(Number(o.잔금송금액)||0)*(Number(o.잔금환율)||0);e.totalUSDtoKRW+=n+i,e.totalWonAmount+=Number(o.원화발주액)||0,e.totalPostArrivalCost+=Number(o.입항후비용)||0})}),e.totalProductCost=e.totalUSDtoKRW+e.totalWonAmount,e.totalOrderAmount=e.totalProductCost+e.totalPostArrivalCost}),e}filterOrdersByDate(t,e){if(!this.data||!Array.isArray(this.data))return;const a=t&&e?this.data.filter(s=>{const r=new Date(s.최초발주일);return r>=t&&r<=e}):this.data;this.renderTable(a)}generateOrderCardsHTML(t){if(!t||!Array.isArray(t))return"";let e="";return t.forEach((a,s)=>{var r;if(e+=`
                <div class="order-card" data-order="${a.발주코드}">
                    <div class="order-card-header">
                        <div class="order-info">
                            <div class="order-title">
                                <span class="status-badge ${((r=a.상태)==null?void 0:r.toLowerCase())||"default"}">${a.상태||"상태없음"}</span>
                                <h3>${a.발주코드||"-"}</h3>
                            </div>
                            <div class="order-meta">
                                <span class="order-dates">
                                    <i class="fas fa-calendar"></i>
                                    ${a.최초발주일||"날짜없음"} ~ ${a.최종입고일||"진행중"}
                                </span>
                                <span class="order-amount">
                                    ${Object.values(a.차수별발주).some(o=>o.items.some(n=>n.원화발주액))?`<i class="fas fa-won-sign"></i>
                                         ${Object.values(a.차수별발주).flatMap(o=>o.items).reduce((o,n)=>o+(n.원화발주액||0),0).toLocaleString()}`:`<i class="fas fa-dollar-sign"></i>
                                         ${a.총발주액.toLocaleString()}`}
                                    ${a.총잔액>0?`<span class="remaining-amount">(잔금: $${a.총잔액.toLocaleString()})</span>`:""}
                                </span>
                            </div>
                        </div>
                        <button class="toggle-details">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>`,(s+1)%3===0||s===t.length-1){const o=Math.floor(s/3)*3,n=Math.min(o+3,t.length),i=Math.floor(s/3);e+=`<div class="details-container" data-row="${i}">`;for(let l=o;l<n;l++)if(l<t.length){const c=t[l];e+=`
                            <div class="order-card-details" data-order="${c.발주코드}">
                                ${this.generateOrderCardDetails(c)}
                            </div>`}e+="</div>"}}),e}setupCardEventListeners(t){if(!t)return;const e=t.querySelectorAll(".order-card");e.forEach((a,s)=>{const r=a.querySelector(".toggle-details"),o=r==null?void 0:r.querySelector("i"),n=Math.floor(s/3),i=t.querySelector(`.details-container[data-row="${n}"]`),l=i==null?void 0:i.querySelector(`.order-card-details[data-order="${a.dataset.order}"]`);r&&o&&i&&l&&r.addEventListener("click",c=>{if(c.stopPropagation(),e.forEach(d=>{if(d!==a){d.classList.remove("expanded");const h=d.querySelector(".toggle-details i");h&&(h.classList.remove("fa-chevron-up"),h.classList.add("fa-chevron-down"))}}),!a.classList.contains("expanded")){t.querySelectorAll(".details-container").forEach(p=>{p!==i&&(p.style.display="none")}),t.querySelectorAll(".order-card-details").forEach(p=>{p!==l&&(p.style.display="none")}),a.classList.add("expanded"),o.classList.remove("fa-chevron-down"),o.classList.add("fa-chevron-up"),i.style.display="block",l.style.display="block";const d=a.getBoundingClientRect(),h=window.scrollY+d.top-20;window.scrollTo({top:h,behavior:"smooth"})}else a.classList.remove("expanded"),o.classList.remove("fa-chevron-up"),o.classList.add("fa-chevron-down"),i.style.display="none",l.style.display="none"})})}generateOrderCardDetails(t){return Object.values(t.차수별발주||{}).map(e=>`
                <div class="order-phase">
                    <div class="phase-items">
                        ${e.items.map(a=>{const s=a.선금송금액*a.선금환율+a.잔금송금액*a.잔금환율+(a.원화발주액||0),r=Number(a.입항후비용||0),o=a.발주수량>0?(s+r)/a.발주수량:0;return`
                                <div class="order-item">
                                    <div class="item-header">
                                        <div class="item-title">
                                            <div class="item-badges">
                                                <span class="status-badge ${a.상태.toLowerCase()}">${a.상태}</span>
                                                <span class="phase-badge">${e.발주차수}</span>
                                            </div>
                                            <h5>${a.발주명}</h5>
                                        </div>
                                    </div>
                                    <div class="item-details">
                                        <div class="item-info">
                                            <p><strong>발주일:</strong> ${a.발주일||"-"}</p>
                                            <p><strong>입항예정일:</strong> ${a.입항예정일||"-"}</p>
                                            <p><strong>최종입고일:</strong> ${a.최종입고일||"-"}</p>
                                            <p><strong>수량:</strong> ${a.발주수량.toLocaleString()}개</p>
                                            <p><strong>단가:</strong> ${a.원화발주액?`₩${a.원화발주액.toLocaleString()}`:`$${a.단가.toLocaleString()}`}</p>
                                            <p><strong>발주액:</strong> ${a.원화발주액?`₩${a.원화발주액.toLocaleString()}`:`$${a.발주액.toLocaleString()}`}</p>
                                        </div>
                                        <div class="item-status">
                                            <p><strong>선금송금액:</strong> ${a.선금송금액?`$${a.선금송금액.toLocaleString()}`:"-"}</p>
                                            <p><strong>잔금송금액:</strong> ${a.잔금송금액?`$${a.잔금송금액.toLocaleString()}`:"-"}</p>
                                            <p><strong>원화환산:</strong> ₩${Math.round(s).toLocaleString()}</p>
                                            <p><strong>입항후비용:</strong> ₩${Math.round(r).toLocaleString()}</p>
                                            <p><strong>제품원가:</strong> ₩${Math.round(o).toLocaleString()}/개</p>
                                        </div>
                                    </div>
                                </div>
                            `}).join("")}
                    </div>
                </div>
            `).join("")}generateOrderItemHTML(t){const e=t.선금송금액*t.선금환율+t.잔금송금액*t.잔금환율+(t.원화발주액||0),a=Number(t.입항후비용||0),s=t.발주수량>0?(e+a)/t.발주수량:0;return`
            <div class="order-item">
                <div class="item-header">
                    <h5>${t.발주명}</h5>
                    <span class="status-badge ${t.상태.toLowerCase()}">${t.상태}</span>
                </div>
                <div class="item-details">
                    <div class="item-info">
                        <p><strong>발주일:</strong> ${t.발주일||"-"}</p>
                        <p><strong>입항예정일:</strong> ${t.입항예정일||"-"}</p>
                        <p><strong>최종입고일:</strong> ${t.최종입고일||"-"}</p>
                        <p><strong>수량:</strong> ${t.발주수량.toLocaleString()}개</p>
                        <p><strong>단가:</strong> ${t.원화발주액?`₩${t.원화발주액.toLocaleString()}`:`$${t.단가.toLocaleString()}`}</p>
                        <p><strong>발주액:</strong> ${t.원화발주액?`₩${t.원화발주액.toLocaleString()}`:`$${t.발주액.toLocaleString()}`}</p>
                    </div>
                    <div class="item-status">
                        <p><strong>선금송금액:</strong> ${t.선금송금액?`$${t.선금송금액.toLocaleString()} (₩${Math.round(t.선금송금액*t.선금환율).toLocaleString()})`:"-"}</p>
                        <p><strong>잔금송금액:</strong> ${t.잔금송금액?`$${t.잔금송금액.toLocaleString()} (₩${Math.round(t.잔금송금액*t.잔금환율).toLocaleString()})`:"-"}</p>
                        <p><strong>원화환산:</strong> ₩${Math.round(e).toLocaleString()}</p>
                        <p><strong>입항후비용:</strong> ₩${Math.round(a).toLocaleString()}</p>
                        <p><strong>제품원가:</strong> ₩${Math.round(s).toLocaleString()}/개</p>
                    </div>
                </div>
            </div>
        `}updateStats(t){const e=document.querySelector(".order-stats");e&&(e.innerHTML=`
            <div class="order-stat-box">
                <h3>발주 현황</h3>
                <div class="order-stat-value">${Object.values(t.statusCount).reduce((a,s)=>a+s,0)}건</div>
                <div class="order-stat-details">
                    ${Object.entries(t.statusCount).map(([a,s])=>`
                        <div class="order-stat-detail">
                            <span class="detail-label">${a}:</span>
                            <span class="detail-value">${s}건</span>
                        </div>
                    `).join("")}
                </div>
            </div>
                <div class="order-stat-box">
                <h3>발주액</h3>
                <div class="order-stat-details">
                    <div class="order-stat-detail usd-amount">
                        <span class="detail-label">USD 총 발주액:</span>
                        <span class="detail-value">$${Math.round(t.totalAmountUSD).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail krw-amount">
                        <span class="detail-label">원화 총 발주액:</span>
                        <span class="detail-value">₩${Math.round(t.totalWonAmount).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail section-divider usd-amount">
                        <span class="detail-label">송금 총액 (USD):</span>
                        <span class="detail-value">$${Math.round(t.totalPaidUSD).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail remaining">
                        <span class="detail-label">잔금 총액 (USD):</span>
                        <span class="detail-value">$${Math.round(t.totalRemainingUSD).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail section-divider usd-amount">
                        <span class="detail-label">USD 송금 원화환산:</span>
                        <span class="detail-value">₩${Math.round(t.totalUSDtoKRW).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail krw-amount">
                        <span class="detail-label">원화 발주 송금액:</span>
                        <span class="detail-value">₩${Math.round(t.totalWonAmount).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail section-divider">
                        <span class="detail-label">제품발주비용:</span>
                        <span class="detail-value">₩${Math.round(t.totalProductCost).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail post-arrival">
                        <span class="detail-label">입항후비용:</span>
                        <span class="detail-value">₩${Math.round(t.totalPostArrivalCost).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail total">
                        <span class="detail-label">발주관련 총액:</span>
                        <span class="detail-value">₩${Math.round(t.totalOrderAmount).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `)}setupDateFilter(){const t=document.getElementById("orderDateFilter"),e=document.getElementById("orderDateRange"),a=document.querySelector(".custom-date-range");t&&t.addEventListener("change",s=>{const r=s.target.value;if(r==="custom"){a==null||a.classList.remove("hidden");return}if(a==null||a.classList.add("hidden"),r==="all")this.renderTable(this.data);else{const o=this.getDateRangeFromFilter(r);o&&this.filterOrdersByDate(o.startDate,o.endDate)}}),e&&flatpickr(e,{mode:"range",dateFormat:"Y-m-d",locale:"ko",onChange:s=>{if(s.length===2){const[r,o]=s;this.filterOrdersByDate(r,o)}}})}getDateRangeFromFilter(t){const e=new Date,a=new Date(e);let s=new Date(e);switch(t){case"1month":s.setMonth(e.getMonth()-1);break;case"3months":s.setMonth(e.getMonth()-3);break;case"6months":s.setMonth(e.getMonth()-6);break;case"1year":s.setFullYear(e.getFullYear()-1);break;case"all":return null;default:return null}return{startDate:s,endDate:a}}}class kt{constructor(){this.notionService=new A("d04c779e1ee84e6d9dd062823ebb4ff8"),this.container=document.getElementById("cashFlowContainer"),this.charts={},this.initialize()}async initialize(){try{this.container.innerHTML='<div class="loading">데이터를 불러오는 중...</div>';const t=await this.notionService.fetchDatabase();if(console.log("Notion API 응답:",t),!t||!Array.isArray(t))throw new Error("유효하지 않은 데이터 형식");const e=this.processNotionData(t);this.renderDashboard(e)}catch(t){console.error("자금관리 데이터 초기화 중 오류:",t),this.container.innerHTML=`
                <div class="error-message">
                    데이터를 불러오는데 실패했습니다.<br>
                    <small>${t.message}</small>
                </div>
            `}}processNotionData(t){try{return Array.isArray(t)?t.map(e=>{var s,r,o,n,i,l,c,u,d,h,p,g,y,m,D,S,b,v,w;if(!e||!e.properties)return console.warn("유효하지 않은 페이지 데이터:",e),null;const a=e.properties;return{id:e.id,날짜:((r=(s=a.날짜)==null?void 0:s.date)==null?void 0:r.start)||"",항목:((i=(n=(o=a.항목)==null?void 0:o.title)==null?void 0:n[0])==null?void 0:i.plain_text)||"",금액:((l=a.금액)==null?void 0:l.number)||0,합계:((c=a.합계)==null?void 0:c.number)||0,구분:((d=(u=a.카테고리)==null?void 0:u.select)==null?void 0:d.name)||"",거래원천:((p=(h=a.거래원천)==null?void 0:h.select)==null?void 0:p.name)||"",수입비용:((y=(g=a["수입/비용"])==null?void 0:g.select)==null?void 0:y.name)||"",receipt:((m=a.Receipt)==null?void 0:m.files)||[],created_time:((D=a["Created time"])==null?void 0:D.created_time)||"",발주제품송금:((S=a.발주제품송금)==null?void 0:S.checkbox)||!1,비고:((w=(v=(b=a.비고)==null?void 0:b.rich_text)==null?void 0:v[0])==null?void 0:w.plain_text)||""}}).filter(e=>e!==null):(console.error("유효하지 않은 데이터 형식:",t),[])}catch(e){return console.error("데이터 처리 중 오류:",e),[]}}renderDashboard(t){const e=document.createElement("div");e.className="cash-flow-container";const a=this.calculateSummary(t),s=this.createSummarySection(a);e.appendChild(s);const r=this.createChartSection(t);e.appendChild(r);const o=this.createTransactionList(t);e.appendChild(o),this.container.innerHTML="",this.container.appendChild(e),this.renderCharts(t)}calculateSummary(t){const e=t.reduce((a,s)=>{const r=s.원화계산총금||0,o=s.수입비용||"기타",n=s.거래구분||"기타";o==="수입"?a.totalIncome+=r:o==="지출"&&(a.totalExpense+=r),a.categoryTotals[n]||(a.categoryTotals[n]=0),a.categoryTotals[n]+=r;const i=s.날짜.substring(0,7);return a.monthlyTotals[i]||(a.monthlyTotals[i]={income:0,expense:0}),o==="수입"?a.monthlyTotals[i].income+=r:a.monthlyTotals[i].expense+=r,a},{totalIncome:0,totalExpense:0,categoryTotals:{},monthlyTotals:{}});return e.balance=e.totalIncome-e.totalExpense,e}createSummarySection(t){const e=document.createElement("div");return e.className="cash-flow-summary",e.innerHTML=`
            <div class="cash-flow-box income">
                <h3>총 수입</h3>
                <div class="cash-flow-amount">₩${Math.round(t.totalIncome).toLocaleString()}</div>
            </div>
            <div class="cash-flow-box expense">
                <h3>총 지출</h3>
                <div class="cash-flow-amount">₩${Math.abs(Math.round(t.totalExpense)).toLocaleString()}</div>
            </div>
            <div class="cash-flow-box balance">
                <h3>잔액</h3>
                <div class="cash-flow-amount ${t.balance>=0?"positive":"negative"}">
                    ₩${Math.round(t.balance).toLocaleString()}
                </div>
            </div>
        `,e}createChartSection(t){const e=document.createElement("div");return e.className="cash-flow-charts",e.innerHTML=`
            <div class="cash-flow-chart-box">
                <h3>월별 수입/지출 추이</h3>
                <canvas id="monthlyTrendChart"></canvas>
            </div>
            <div class="cash-flow-chart-box">
                <h3>거래구분별 분포</h3>
                <canvas id="categoryPieChart"></canvas>
            </div>
        `,e}renderCharts(t){this.renderMonthlyTrendChart(t),this.renderCategoryPieChart(t)}renderMonthlyTrendChart(t){const e=document.getElementById("monthlyTrendChart");this.charts.monthlyTrend&&this.charts.monthlyTrend.destroy();const a=this.calculateMonthlyTotals(t);this.charts.monthlyTrend=new nt(e,{type:"line",data:{labels:a.labels,datasets:[{label:"수입",data:a.income,borderColor:"#4CAF50",backgroundColor:"rgba(76, 175, 80, 0.1)",fill:!0},{label:"지출",data:a.expense,borderColor:"#F44336",backgroundColor:"rgba(244, 67, 54, 0.1)",fill:!0}]},options:{responsive:!0,plugins:{title:{display:!0,text:"월별 현금흐름"}}}})}renderCategoryPieChart(t){const e=document.getElementById("categoryPieChart");this.charts.categoryPie&&this.charts.categoryPie.destroy();const a=this.calculateCategoryTotals(t);this.charts.categoryPie=new nt(e,{type:"doughnut",data:{labels:a.labels,datasets:[{data:a.values,backgroundColor:["#4CAF50","#2196F3","#F44336","#FFC107","#9C27B0","#FF5722","#795548","#607D8B"]}]},options:{responsive:!0,plugins:{legend:{position:"right"}}}})}calculateMonthlyTotals(t){const e={};t.forEach(s=>{const r=s.날짜.substring(0,7);e[r]||(e[r]={income:0,expense:0}),s.수입비용==="수입"?e[r].income+=s.원화계산총금:e[r].expense+=s.원화계산총금});const a=Object.keys(e).sort();return{labels:a,income:a.map(s=>e[s].income),expense:a.map(s=>e[s].expense)}}calculateCategoryTotals(t){const e={};return t.forEach(a=>{const s=a.거래구분||"기타";e[s]||(e[s]=0),e[s]+=Math.abs(a.원화계산총금)}),{labels:Object.keys(e),values:Object.values(e)}}createTransactionList(t){const e=document.createElement("div");e.className="cash-flow-transactions";const a=[...t].sort((s,r)=>new Date(r.날짜)-new Date(s.날짜));return e.innerHTML=`
            <h3>거래 내역</h3>
            <div class="cash-flow-table">
                <table>
                    <thead>
                        <tr>
                            <th>날짜</th>
                            <th>항목</th>
                            <th>금액</th>
                            <th>구분</th>
                            <th>비고</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${a.map(s=>`
                            <tr class="${s.수입비용==="수입"?"income-row":"expense-row"}">
                                <td>${s.날짜}</td>
                                <td>${s.항목}</td>
                                <td class="cash-flow-amount-cell">
                                    ₩${Math.abs(s.금액).toLocaleString()}
                                </td>
                                <td>${s.구분}</td>
                                <td>${s.비고}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `,e}}class Ft{constructor(t){this.dataService=t,this.currentYear="2025",this.monthlySalesChart=null,this.adNotionService=new A("d04c779e1ee84e6d9dd062823ebb4ff8"),this.groupNotionService=new A("e6121c39c37c4d349032829e5b796c2c"),this.initializeYearSelector(),this.initializeChart()}initializeYearSelector(){const t=document.querySelectorAll(".year-btn");t.forEach(e=>{e.addEventListener("click",async a=>{t.forEach(s=>s.classList.remove("active")),a.target.classList.add("active"),this.currentYear=a.target.dataset.year,await this.updateSalesData()})})}initializeChart(){const t=document.getElementById("monthlySalesChart").getContext("2d");this.monthlySalesChart=new Chart(t,{type:"bar",data:{labels:["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],datasets:[{label:"스토어 매출",backgroundColor:"rgba(169, 186, 147, 0.7)",data:[]},{label:"유료광고 수익",backgroundColor:"rgba(147, 165, 186, 0.7)",data:[]},{label:"공동구매 매출",backgroundColor:"rgba(195, 177, 171, 0.7)",data:[]}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{x:{stacked:!0},y:{stacked:!0,beginAtZero:!0,ticks:{callback:function(e){return e.toLocaleString()+"원"}}}},plugins:{tooltip:{callbacks:{label:function(e){return`${e.dataset.label}: ${e.raw.toLocaleString()}원`}}}}}})}async updateSalesData(){try{const t=await this.calculateMonthlySales();this.updateTable(t),this.updateChart(t)}catch(t){console.error("매출 데이터 업데이트 중 오류:",t)}}async calculateMonthlySales(){const t=Array(12).fill().map(()=>({storeSales:0,adSales:0,groupSales:0}));try{const e=this.dataService.getCurrentData();return e.forEach(r=>{const o=new Date(r.date);if(o.getFullYear().toString()===this.currentYear){const n=o.getMonth(),i=parseInt(r.quantity)||0,l=r.originalProduct||r.productName||"",c=r.originalOption||"",u=this.dataService.mappingService.getMappedProductInfo(l,c,r.channel||r.seller);let d=0;u&&(d=["취소","미결제취소","반품"].includes(r.orderStatus)?0:u.price);const h=i*d;["취소","미결제취소","반품"].includes(r.orderStatus)||(t[n].storeSales+=h)}}),(await this.adNotionService.fetchDatabase()).forEach(r=>{var o,n,i,l;if((i=(n=(o=r.properties)==null?void 0:o.정산입금일자)==null?void 0:n.date)!=null&&i.start){const c=new Date(r.properties.정산입금일자.date.start);c.getFullYear().toString()===this.currentYear&&(t[c.getMonth()].adSales+=((l=r.properties.정산금액)==null?void 0:l.number)||0)}}),(await this.groupNotionService.fetchDatabase()).forEach(r=>{var o,n,i,l;if((i=(n=(o=r.properties)==null?void 0:o.일정)==null?void 0:n.date)!=null&&i.end){const c=new Date(r.properties.일정.date.end);c.getFullYear().toString()===this.currentYear&&(t[c.getMonth()].groupSales+=((l=r.properties.매출액)==null?void 0:l.number)||0)}}),console.log("Monthly Sales Data:",{storeData:e.length,monthlySales:t,year:this.currentYear}),t}catch(e){throw console.error("월별 매출 계산 중 오류:",e),e}}updateTable(t){const e=document.getElementById("monthlySalesBody");e.innerHTML="";let a=0,s=0,r=0;t.forEach((o,n)=>{const i=document.createElement("tr");i.classList.add("main-row");const l=o.storeSales+o.adSales+o.groupSales;i.innerHTML=`
                <td class="month-cell">
                    <span class="expand-btn">+</span>
                    ${n+1}월
                </td>
                <td>${o.storeSales.toLocaleString()}원</td>
                <td>${o.adSales.toLocaleString()}원</td>
                <td>${o.groupSales.toLocaleString()}원</td>
                <td>${l.toLocaleString()}원</td>
            `;const c=document.createElement("tr");c.classList.add("detail-row"),c.style.display="none";const u=document.createElement("td");u.colSpan=5,u.innerHTML=`
                <div class="sales-details">
                    <div class="detail-section">
                        <h4>스토어 매출 상세</h4>
                        <div class="sales-detail-grid">
                            <div class="sales-detail-item">
                                <div class="store-name">스마트스토어</div>
                                <div class="store-amount">${this.formatCurrency(o.storeSales*.7)}</div>
                            </div>
                            <div class="sales-detail-item">
                                <div class="store-name">오늘의집</div>
                                <div class="store-amount">${this.formatCurrency(o.storeSales*.2)}</div>
                            </div>
                            <div class="sales-detail-item">
                                <div class="store-name">유튜브쇼핑</div>
                                <div class="store-amount">${this.formatCurrency(o.storeSales*.1)}</div>
                            </div>
                        </div>
                    </div>
                    
                    ${o.adSales>0?`
                        <div class="detail-section">
                            <h4>유료광고 수익 상세</h4>
                            <div class="sales-detail-grid">
                                <div class="sales-detail-item">
                                    <div class="store-name">유료광고 수익 상세</div>
                                    <div class="store-amount">${this.formatCurrency(o.adSales)}</div>
                                </div>
                            </div>
                        </div>
                    `:""}
                    
                    ${o.groupSales>0?`
                        <div class="detail-section">
                            <h4>공동구매 매출 상세</h4>
                            <div class="sales-detail-grid">
                                <div class="sales-detail-item">
                                    <div class="store-name">공동구매 매출 상세</div>
                                    <div class="store-amount">${this.formatCurrency(o.groupSales)}</div>
                                </div>
                            </div>
                        </div>
                    `:""}
                </div>
            `,c.appendChild(u),i.querySelector(".expand-btn").addEventListener("click",async d=>{const h=d.target,p=h.textContent==="-";h.textContent=p?"+":"-",c.style.display=p?"none":"table-row",!p&&!c.dataset.loaded&&(await this.loadDetailData(n+1,c),c.dataset.loaded="true")}),e.appendChild(i),e.appendChild(c),a+=o.storeSales,s+=o.adSales,r+=o.groupSales}),document.getElementById("totalStoreSales").textContent=`${a.toLocaleString()}원`,document.getElementById("totalAdSales").textContent=`${s.toLocaleString()}원`,document.getElementById("totalGroupSales").textContent=`${r.toLocaleString()}원`,document.getElementById("grandTotal").textContent=`${(a+s+r).toLocaleString()}원`}async fetchMonthlyDetail(t){try{const s=this.dataService.getCurrentData().filter(l=>{const c=new Date(l.date);return c.getFullYear().toString()===this.currentYear&&c.getMonth()===t-1}).reduce((l,c)=>{const u=parseInt(c.quantity)||0,d=this.dataService.mappingService.getMappedProductInfo(c.originalProduct||c.productName||"",c.originalOption||"",c.channel||c.seller),h=d?d.price:0;return l+u*h},0),r=await this.loadMonthlyAdData(t),o=await this.loadMonthlyGroupData(t),n=r.reduce((l,c)=>l+(c.정산금액||0),0),i=o.reduce((l,c)=>l+(c.매출액||0),0);return{storeSales:s,adSales:n,groupSales:i}}catch(e){throw console.error("월별 상세 데이터 조회 중 오류:",e),e}}async loadDetailData(t,e){const a=e.querySelector('td[colspan="5"]');if(a){a.innerHTML=`
            <div class="sales-details">
                <div class="loading-message">데이터 로딩 중...</div>
            </div>
        `;try{const[s,r,o]=await Promise.all([this.calculateChannelSales(t),this.loadMonthlyAdData(t),this.loadMonthlyGroupData(t)]);a.innerHTML=`
                <div class="sales-details">
                    <div class="detail-section">
                        <h4>스토어 매출 상세</h4>
                        <div class="detail-content">
                            <p>스마트스토어: ${this.formatCurrency(s.스마트스토어)}</p>
                            <p>오늘의집: ${this.formatCurrency(s.오늘의집)}</p>
                            <p>유튜브쇼핑: ${this.formatCurrency(s.유튜브쇼핑)}</p>
                        </div>
                    </div>
                    
                    ${r.length>0?`
                        <div class="detail-section">
                            <h4>유료광고 수익 상세</h4>
                            <div class="detail-content">
                                ${r.map(n=>`
                                    <p>${n.이름}: ${this.formatCurrency(n.정산금액)}</p>
                                `).join("")}
                            </div>
                        </div>
                    `:""}
                    
                    ${o.length>0?`
                        <div class="detail-section">
                            <h4>공동구매 매출 상세</h4>
                            <div class="detail-content">
                                ${o.map(n=>`
                                    <p>${n.이름}: ${this.formatCurrency(n.매출액)}</p>
                                `).join("")}
                            </div>
                        </div>
                    `:""}
                </div>
            `}catch(s){console.error("상세 데이터 로드 중 오류:",s),a.innerHTML=`
                <div class="sales-details">
                    <div class="error-message">데이터 로드 중 오류가 발생했습니다.</div>
                </div>
            `}}}calculateChannelSales(t){const e={스마트스토어:0,오늘의집:0,유튜브쇼핑:0};return this.dataService.getCurrentData().forEach(s=>{const r=new Date(s.date);if(r.getFullYear().toString()===this.currentYear&&r.getMonth()===t-1){const o=s.channel||s.seller,n=this.dataService.mappingService.getMappedProductInfo(s.originalProduct||s.productName,s.originalOption,o);if(n&&!["취소","미결제취소","반품"].includes(s.orderStatus)){const i=(parseInt(s.quantity)||0)*n.price;e.hasOwnProperty(o)&&(e[o]+=i)}}}),e}async loadMonthlyAdData(t){try{return(await this.adNotionService.fetchDatabase()).filter(a=>{var o,n,i;const s=(i=(n=(o=a.properties)==null?void 0:o.정산입금일자)==null?void 0:n.date)==null?void 0:i.start;if(!s)return!1;const r=new Date(s);return r.getFullYear().toString()===this.currentYear&&r.getMonth()===t-1}).map(a=>{var s,r,o,n,i,l,c,u,d;return{이름:((n=(o=(r=(s=a.properties)==null?void 0:s.이름)==null?void 0:r.title)==null?void 0:o[0])==null?void 0:n.plain_text)||"이름 없음",정산금액:((l=(i=a.properties)==null?void 0:i.정산금액)==null?void 0:l.number)||0,정산입금일자:((d=(u=(c=a.properties)==null?void 0:c.정산입금일자)==null?void 0:u.date)==null?void 0:d.start)||""}})}catch(e){return console.error("광고 수익 데이터 로드 중 오류:",e),[]}}async loadMonthlyGroupData(t){try{return(await this.groupNotionService.fetchDatabase()).filter(a=>{var o,n,i;const s=(i=(n=(o=a.properties)==null?void 0:o.일정)==null?void 0:n.date)==null?void 0:i.end;if(!s)return!1;const r=new Date(s);return r.getFullYear().toString()===this.currentYear&&r.getMonth()===t-1}).map(a=>{var s,r,o,n,i,l,c,u;return{이름:((n=(o=(r=(s=a.properties)==null?void 0:s.이름)==null?void 0:r.title)==null?void 0:o[0])==null?void 0:n.plain_text)||"이름 없음",매출액:((l=(i=a.properties)==null?void 0:i.매출액)==null?void 0:l.number)||0,정산금액:((u=(c=a.properties)==null?void 0:c.정산금액)==null?void 0:u.number)||0}})}catch(e){return console.error("공동구매 데이터 로드 중 오류:",e),[]}}updateChart(t){const e=t.map(r=>r.storeSales),a=t.map(r=>r.adSales),s=t.map(r=>r.groupSales);this.monthlySalesChart.data.datasets[0].data=e,this.monthlySalesChart.data.datasets[1].data=a,this.monthlySalesChart.data.datasets[2].data=s,this.monthlySalesChart.update()}formatCurrency(t){return typeof t=="number"?t.toLocaleString("ko-KR")+"원":"0원"}}class Dt{constructor(){this.TAB_IDS={DASHBOARD:"dashboardTab",DETAIL_DATA:"detailDataTab",MANDALA:"mandalaTab",ADDITIONAL_INFO:"additionalInfoTab",ORDER:"orderTab",CASH_FLOW:"cashFlowTab",TOTAL_SALES:"totalSalesTab"},this.TAB_MAPPING={dashboard:this.TAB_IDS.DASHBOARD,detailData:this.TAB_IDS.DETAIL_DATA,mandala:this.TAB_IDS.MANDALA,additionalInfo:this.TAB_IDS.ADDITIONAL_INFO,order:this.TAB_IDS.ORDER,cashFlow:this.TAB_IDS.CASH_FLOW,totalSales:this.TAB_IDS.TOTAL_SALES},window.app&&window.app.destroy(),this.dataService=null,this.authService=null,this.ice=null,this.dashboard=null,this.tableManager=null,this.waitForDependencies().then(()=>this.initialize()).catch(t=>{console.error("초기화 실패:",t)}),this.initializeDatePicker(),this.initializeDateButtons(),this.initializeSidebar()}async waitForDependencies(){await this.waitForFirebase(),await this.waitForGapi(),console.log("모든 의존성 로드 완료")}async waitForFirebase(){var t;for(let e=0;e<100;e++){if((t=window.firebase)!=null&&t.auth){console.log("Firebase 초기화 확인됨");return}await new Promise(a=>setTimeout(a,100))}throw new Error("Firebase 초기화 시간 초과")}async waitForGapi(){for(let t=0;t<100;t++){if(typeof gapi<"u"){console.log("GAPI 로드됨");return}await new Promise(e=>setTimeout(e,100))}throw new Error("GAPI 로드 시간 초과")}async initialize(){try{if(console.log("서비스 초기화 시작"),this.dataService=new Lt,await this.dataService.initialize(),this.tableManager=new Tt(this.dataService),this.dashboard=new Ot(this.dataService),this.dashboard.tableManager=this.tableManager,console.log("Dashboard 초기화됨:",!!this.dashboard),this.authService=new gt,this.orderManager=new Nt,!this.dataService||!this.authService||!this.dashboard||!this.tableManager)throw new Error("서비스 초기화 실패");this.setupEventListeners(),this.authService.onAuthStateChanged(async t=>{t?(document.getElementById("loginContainer").style.display="none",document.getElementById("contentContainer").style.display="block",document.getElementById("userEmail").textContent=t.email,await this.loadInitialData()):(document.getElementById("loginContainer").style.display="flex",document.getElementById("contentContainer").style.display="none",document.getElementById("userEmail").textContent="")}),this.totalSales=new Ft(this.dataService)}catch(t){throw console.error("초기화 중 오류:",t),t}}async loadInitialData(){try{await this.dataService.initializeMappings();const t=await this.dataService.loadData(),e=await this.dataService.processData(t);this.dataService.setCurrentData(e),await this.switchTab(this.TAB_IDS.DASHBOARD);const a=document.querySelector('[data-period="this-month"]');a&&(this.updateDateButtonStates(a),await this.handleDateSelection("this-month"))}catch(t){console.error("초기 데이터 로드 실패:",t)}}setupAuthStateListener(){this.authService.onAuthStateChanged(t=>{t?(document.getElementById("loginContainer").style.display="none",document.getElementById("contentContainer").style.display="block",this.loadInitialData()):(document.getElementById("loginContainer").style.display="flex",document.getElementById("contentContainer").style.display="none")})}destroy(){this.ice&&this.ice.destroyCharts(),this.dataService=null,this.authService=null,this.dashboard=null,this.tableManager=null,this.ice=null,window.ice=null}async onLogin(){try{document.getElementById("loginContainer").style.display="none",document.getElementById("contentContainer").style.display="block";const t=document.getElementById("loadingIndicator");t&&(t.style.display="block");const e=await this.dataService.loadData();if(!e||e.length===0){console.error("데이터를 불러오지 못했습니다.");return}const a=await this.dataService.processDetailData(e),s=document.querySelector('[data-period="this-month"]');s&&(document.querySelectorAll(".date-selector").forEach(r=>{r.classList.remove("active")}),s.classList.add("active"),await this.handleDateSelection("this-month")),this.activateTab("dashboard"),t&&(t.style.display="none")}catch(t){console.error("데이터 로드 중 오류:",t),alert("데이터를 불러오는 중 오류가 발생했습니다.")}}async handleDateSelection(t,e=null,a=null){try{localStorage.setItem("selectedPeriod",t),e&&localStorage.setItem("customStartDate",e),a&&localStorage.setItem("customEndDate",a);let s,r,o;if(t==="custom"&&e&&a)r=new Date(e),r.setHours(0,0,0,0),o=new Date(a),o.setHours(23,59,59,999),s=await this.dataService.filterDataByDateRange(r,o);else{const n=At.calculateDateRange(t);r=n.startDate,o=n.endDate,s=await this.dataService.filterDataByPeriod(t)}return document.dispatchEvent(new CustomEvent("dateFilterChanged",{detail:{data:s,period:t,startDate:r,endDate:o}})),s}catch(s){return console.error("날짜 선택 처리 중 오류:",s),[]}}async filterDataByPeriod(t,e,a){try{console.log("기간별 데이터 필터링 시작:",t);const s=this.dataService.getCurrentData();if(!s||s.length===0)return console.warn("처리된 데이터가 없습니다."),[];if(t==="all")return s;if(!e||!a){const i=new Date;e=new Date(i.getFullYear(),i.getMonth(),1),a=i}const r=new Date(e),o=new Date(a);return r.setHours(0,0,0,0),o.setHours(23,59,59,999),console.log("필터링 기간:",{시작일:r.toLocaleString("ko-KR"),종료일:o.toLocaleString("ko-KR")}),s.filter(i=>{const l=new Date(i.date||i.orderDate),c=new Date(l.getTime()+9*60*60*1e3);return c>=r&&c<=o})}catch(s){return console.error("데이터 필터링 중 오류:",s),[]}}calculateSalesData(t){try{let e=0,a=0;const s=new Set,r=[];return t.forEach(o=>{if(CONFIG.SALES.ZERO_SALES_STATUSES.includes(o.orderStatus))return;r.push(o);const n=parseInt(o.quantity)||0,i=o.originalProduct||o.productName||"",l=o.originalOption||o.option||o.optionInfo||"",c=this.dataService.mappingService.getMappedProductInfo(i,l,o.channel||o.seller),u=(c==null?void 0:c.price)||0,d=n*u;e+=d,a++,o.customerName&&s.add(o.customerName)}),{총매출:e,구매건수:a,구매자수:s.size,계산된행수:r.length,제외된행수:t.length-r.length}}catch(e){return console.error("매출 데이터 계산 중 오류:",e),{총매출:0,구매건수:0,구매자수:0,계산된행수:0,제외된행수:0}}}setupEventListeners(){try{document.querySelectorAll(".tab-button").forEach(a=>{a.addEventListener("click",async s=>{const r=s.target.dataset.tab;await this.switchTab(r)})});const e=document.getElementById("loginForm");e&&e.addEventListener("submit",async a=>{a.preventDefault(),await this.handleLogin()})}catch(t){console.error("이벤트 리스너 설정 중 오류:",t)}}initializeDatePicker(){const t=document.getElementById("dateRangePicker");if(!t){console.error("날짜 선택기를 찾을 수 없습니다");return}this.datePicker=flatpickr(t,{mode:"range",dateFormat:"Y. m. d.",locale:"ko",defaultDate:[new Date().setDate(1),new Date],onChange:async e=>{if(e.length===2){const[a,s]=e;await this.handleDateSelection("custom",a,s)}}})}initializeDateButtons(){const t={today:document.querySelector('[data-period="today"]'),yesterday:document.querySelector('[data-period="yesterday"]'),"this-week":document.querySelector('[data-period="this-week"]'),"last-week":document.querySelector('[data-period="last-week"]'),"this-month":document.querySelector('[data-period="this-month"]'),"last-month":document.querySelector('[data-period="last-month"]'),"last-3-months":document.querySelector('[data-period="last-3-months"]'),"last-6-months":document.querySelector('[data-period="last-6-months"]'),all:document.querySelector('[data-period="all"]')},e=localStorage.getItem("selectedPeriod")||"this-month";Object.entries(t).forEach(([a,s])=>{s&&(s.addEventListener("click",()=>{this.handleDateSelection(a),this.updateDateButtonStates(s)}),a===e&&this.updateDateButtonStates(s))})}updateDateButtonStates(t){document.querySelectorAll(".date-selector").forEach(a=>{a.classList.remove("active")}),t&&t.classList.add("active")}async activateTab(t,e=null){try{document.querySelectorAll(".tab-button").forEach(i=>{i.classList.remove("active")});const a=document.querySelector(`.tab-button[data-tab="${t}"]`);a&&a.classList.add("active"),document.querySelectorAll(".tab-content").forEach(i=>{i.style.display="none"});const r={dashboard:"dashboardTab",detailData:"detailDataTab"}[t]||`${t}Tab`,o=document.getElementById(r);if(o)o.style.display="block";else return;const n=e||this.dataService.getCurrentData();switch(t){case"dashboard":this.dashboard&&await this.dashboard.updateDashboard(n);break;case"detailData":this.tableManager&&await this.tableManager.updateTables(n);break}}catch(a){console.error("탭 활성화 중 오류:",a)}}async updateAdditionalInfo(){try{const t=document.getElementById("subscriber-number"),e=document.getElementById("update-time");if(t&&e){const s=await this.dataService.getSubscriberCount();t.textContent=Mt.formatNumber(s),e.textContent=new Date().toLocaleString()}if(document.getElementById("info-table")){const s=await this.dataService.getAdditionalInfo();this.updateInfoTable(s)}}catch(t){console.error("추가 정보 업데이트 중 오류:",t)}}async updateAllTabs(t){const e=document.querySelector(".tab-button.active");if(e){const a=e.dataset.tab;await this.activateTab(a,t)}}async updateTabContent(t,e){try{switch(this.TAB_MAPPING[t]||t){case this.TAB_IDS.DASHBOARD:this.dashboard&&await this.dashboard.updateDashboard(e);break;case this.TAB_IDS.DETAIL_DATA:this.tableManager&&await this.tableManager.updateTables(e);break;case this.TAB_IDS.ORDER:this.orderManager&&await this.orderManager.initialize();break}}catch(a){console.error("탭 컨텐츠 업데이트 중 오류:",a)}}initDetailDataSort(){const t=document.querySelector("#detailDataTable");t&&t.querySelectorAll("th").forEach(e=>{const a=e.querySelector(".sort-button");a&&a.addEventListener("click",()=>{const s=a.getAttribute("data-sort");this.sortDetailData(s)})})}sortDetailData(t){const a=[...this.dataService.getProcessedData()].sort((s,r)=>t==="date"?new Date(s.date)-new Date(r.date):t==="quantity"||t==="originalSales"?(s[t]||0)-(r[t]||0):(s[t]||"").localeCompare(r[t]||""));this.updateDetailDataTab(a)}initDetailDataFilters(){document.querySelectorAll(".detail-data-filter").forEach(e=>{e.addEventListener("input",()=>{this.filterDetailData()})})}filterDetailData(){const t=this.dataService.getProcessedData(),e={};document.querySelectorAll(".detail-data-filter").forEach(s=>{const r=s.getAttribute("data-filter"),o=s.value.toLowerCase();o&&(e[r]=o)});const a=t.filter(s=>Object.entries(e).every(([r,o])=>String(s[r]||"").toLowerCase().includes(o)));this.updateDetailDataTab(a)}initExportButton(){const t=document.getElementById("exportDetailData");t&&t.addEventListener("click",()=>{this.exportDetailData()})}exportDetailData(){const t=this.dataService.getProcessedData(),e=this.convertToCSV(t),a=new Blob(["\uFEFF"+e],{type:"text/csv;charset=utf-8;"}),s=document.createElement("a");s.href=URL.createObjectURL(a),s.download=`detail_data_${new Date().toISOString().split("T")[0]}.csv`,s.click()}convertToCSV(t){const e=["날짜","판매처","주문번호","상품명","옵션","수량","매출","주문상태","구매자명","연락처","배송지","택배사","운송장번호","메모"],a=t.map(s=>[s.date,s.seller||"",s.orderNumber||"",s.mappingStatus==="mapped"?s.productName:s.originalProduct,s.mappingStatus==="mapped"?s.option:s.optionInfo||s.optionName||"",s.quantity,s.price,s.orderStatus||"",s.customerName||"",s.customerContact||"",s.shippingAddress||"",s.deliveryCompany||"",s.trackingNumber||"",s.memo||""]);return[e,...a].map(s=>s.join(",")).join(`
`)}async activateThisMonth(){const t=document.querySelector('[data-period="this-month"]');t&&(document.querySelectorAll(".date-selector").forEach(e=>{e.classList.remove("active")}),t.classList.add("active"),await this.handleDateSelection("this-month"))}initializeTabs(){document.querySelectorAll(".tab-button").forEach(e=>{e.addEventListener("click",async a=>{const s=a.target.getAttribute("data-tab");await this.switchTab(s)})})}async switchTab(t){try{const e=this.TAB_MAPPING[t]||t;document.querySelectorAll(".tab-content").forEach(i=>{i.style.display="none"}),document.querySelectorAll(".sidebar-menu-item").forEach(i=>{i.classList.remove("active")});const a=document.querySelector(`[data-tab="${e}"]`);a&&a.classList.add("active");const s=document.getElementById(e);if(s){if(s.style.display="block",e===this.TAB_IDS.DETAIL_DATA){console.log("상세 데이터 탭 선택됨");const i=await this.dataService.loadDetailData(),l=await this.dataService.processData(i);this.dataService.setCurrentData(l),this.tableManager?(console.log("테이블 업데이트 시작"),await this.tableManager.updateTables(l)):console.error("TableManager가 초기화되지 않았습니다.")}e===this.TAB_IDS.ORDER&&this.orderManager&&await this.orderManager.initialize(),e===this.TAB_IDS.CASH_FLOW&&window.cashFlowManager&&await window.cashFlowManager.initialize(),e===this.TAB_IDS.TOTAL_SALES&&this.totalSales&&await this.totalSales.updateSalesData()}const r=localStorage.getItem("selectedPeriod")||"this-month",o=localStorage.getItem("customStartDate"),n=localStorage.getItem("customEndDate");this.updateDateButtonStates(document.querySelector(`[data-period="${r}"]`)),r==="custom"&&o&&n?await this.handleDateSelection(r,o,n):await this.handleDateSelection(r)}catch(e){console.error("탭 전환 중 오류 발생:",e)}}initializeSidebar(){const t=document.querySelectorAll(".sidebar-menu-item");t.forEach(s=>{s.addEventListener("click",()=>{t.forEach(o=>o.classList.remove("active")),s.classList.add("active");const r=s.getAttribute("data-tab");this.switchTab(r)})});const e=document.querySelector(".mobile-menu-toggle"),a=document.querySelector(".sidebar");e&&a&&e.addEventListener("click",()=>{a.classList.toggle("active")})}}let dt=!1;document.addEventListener("DOMContentLoaded",()=>{if(!dt)try{window.app&&window.app.destroy(),window.app=new Dt,dt=!0}catch(f){console.error("App 초기화 중 오류:",f)}});window.App=Dt;new kt;
//# sourceMappingURL=main-DDYu6jOc.js.map
