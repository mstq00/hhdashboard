/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const F=function(t){const e=[];let r=0;for(let a=0;a<t.length;a++){let n=t.charCodeAt(a);n<128?e[r++]=n:n<2048?(e[r++]=n>>6|192,e[r++]=n&63|128):(n&64512)===55296&&a+1<t.length&&(t.charCodeAt(a+1)&64512)===56320?(n=65536+((n&1023)<<10)+(t.charCodeAt(++a)&1023),e[r++]=n>>18|240,e[r++]=n>>12&63|128,e[r++]=n>>6&63|128,e[r++]=n&63|128):(e[r++]=n>>12|224,e[r++]=n>>6&63|128,e[r++]=n&63|128)}return e},Y=function(t){const e=[];let r=0,a=0;for(;r<t.length;){const n=t[r++];if(n<128)e[a++]=String.fromCharCode(n);else if(n>191&&n<224){const s=t[r++];e[a++]=String.fromCharCode((n&31)<<6|s&63)}else if(n>239&&n<365){const s=t[r++],o=t[r++],c=t[r++],h=((n&7)<<18|(s&63)<<12|(o&63)<<6|c&63)-65536;e[a++]=String.fromCharCode(55296+(h>>10)),e[a++]=String.fromCharCode(56320+(h&1023))}else{const s=t[r++],o=t[r++];e[a++]=String.fromCharCode((n&15)<<12|(s&63)<<6|o&63)}}return e.join("")},z={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(t,e){if(!Array.isArray(t))throw Error("encodeByteArray takes an array as a parameter");this.init_();const r=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,a=[];for(let n=0;n<t.length;n+=3){const s=t[n],o=n+1<t.length,c=o?t[n+1]:0,h=n+2<t.length,l=h?t[n+2]:0,M=s>>2,u=(s&3)<<4|c>>4;let g=(c&15)<<2|l>>6,m=l&63;h||(m=64,o||(g=64)),a.push(r[M],r[u],r[g],r[m])}return a.join("")},encodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(t):this.encodeByteArray(F(t),e)},decodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(t):Y(this.decodeStringToByteArray(t,e))},decodeStringToByteArray(t,e){this.init_();const r=e?this.charToByteMapWebSafe_:this.charToByteMap_,a=[];for(let n=0;n<t.length;){const s=r[t.charAt(n++)],c=n<t.length?r[t.charAt(n)]:0;++n;const l=n<t.length?r[t.charAt(n)]:64;++n;const u=n<t.length?r[t.charAt(n)]:64;if(++n,s==null||c==null||l==null||u==null)throw new X;const g=s<<2|c>>4;if(a.push(g),l!==64){const m=c<<4&240|l>>2;if(a.push(m),u!==64){const J=l<<6&192|u;a.push(J)}}}return a},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let t=0;t<this.ENCODED_VALS.length;t++)this.byteToCharMap_[t]=this.ENCODED_VALS.charAt(t),this.charToByteMap_[this.byteToCharMap_[t]]=t,this.byteToCharMapWebSafe_[t]=this.ENCODED_VALS_WEBSAFE.charAt(t),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[t]]=t,t>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(t)]=t,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(t)]=t)}}};class X extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const Z=function(t){const e=F(t);return z.encodeByteArray(e,!0)},W=function(t){return Z(t).replace(/\./g,"")};function Q(){try{return typeof indexedDB=="object"}catch{return!1}}function q(){return new Promise((t,e)=>{try{let r=!0;const a="validate-browser-context-for-indexeddb-analytics-module",n=self.indexedDB.open(a);n.onsuccess=()=>{n.result.close(),r||self.indexedDB.deleteDatabase(a),t(!0)},n.onupgradeneeded=()=>{r=!1},n.onerror=()=>{var s;e(((s=n.error)===null||s===void 0?void 0:s.message)||"")}}catch(r){e(r)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ee="FirebaseError";class b extends Error{constructor(e,r,a){super(r),this.code=e,this.customData=a,this.name=ee,Object.setPrototypeOf(this,b.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,j.prototype.create)}}class j{constructor(e,r,a){this.service=e,this.serviceName=r,this.errors=a}create(e,...r){const a=r[0]||{},n=`${this.service}/${e}`,s=this.errors[e],o=s?te(s,a):"Error",c=`${this.serviceName}: ${o} (${n}).`;return new b(n,c,a)}}function te(t,e){return t.replace(re,(r,a)=>{const n=e[a];return n!=null?String(n):`<${a}?>`})}const re=/\{\$([^}]+)}/g;class D{constructor(e,r,a){this.name=e,this.instanceFactory=r,this.type=a,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var i;(function(t){t[t.DEBUG=0]="DEBUG",t[t.VERBOSE=1]="VERBOSE",t[t.INFO=2]="INFO",t[t.WARN=3]="WARN",t[t.ERROR=4]="ERROR",t[t.SILENT=5]="SILENT"})(i||(i={}));const ne={debug:i.DEBUG,verbose:i.VERBOSE,info:i.INFO,warn:i.WARN,error:i.ERROR,silent:i.SILENT},ae=i.INFO,se={[i.DEBUG]:"log",[i.VERBOSE]:"log",[i.INFO]:"info",[i.WARN]:"warn",[i.ERROR]:"error"},oe=(t,e,...r)=>{if(e<t.logLevel)return;const a=new Date().toISOString(),n=se[e];if(n)console[n](`[${a}]  ${t.name}:`,...r);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class ie{constructor(e){this.name=e,this._logLevel=ae,this._logHandler=oe,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in i))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?ne[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,i.DEBUG,...e),this._logHandler(this,i.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,i.VERBOSE,...e),this._logHandler(this,i.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,i.INFO,...e),this._logHandler(this,i.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,i.WARN,...e),this._logHandler(this,i.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,i.ERROR,...e),this._logHandler(this,i.ERROR,...e)}}const ce=(t,e)=>e.some(r=>t instanceof r);let $,O;function he(){return $||($=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function le(){return O||(O=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const U=new WeakMap,w=new WeakMap,k=new WeakMap,_=new WeakMap,v=new WeakMap;function de(t){const e=new Promise((r,a)=>{const n=()=>{t.removeEventListener("success",s),t.removeEventListener("error",o)},s=()=>{r(f(t.result)),n()},o=()=>{a(t.error),n()};t.addEventListener("success",s),t.addEventListener("error",o)});return e.then(r=>{r instanceof IDBCursor&&U.set(r,t)}).catch(()=>{}),v.set(e,t),e}function fe(t){if(w.has(t))return;const e=new Promise((r,a)=>{const n=()=>{t.removeEventListener("complete",s),t.removeEventListener("error",o),t.removeEventListener("abort",o)},s=()=>{r(),n()},o=()=>{a(t.error||new DOMException("AbortError","AbortError")),n()};t.addEventListener("complete",s),t.addEventListener("error",o),t.addEventListener("abort",o)});w.set(t,e)}let C={get(t,e,r){if(t instanceof IDBTransaction){if(e==="done")return w.get(t);if(e==="objectStoreNames")return t.objectStoreNames||k.get(t);if(e==="store")return r.objectStoreNames[1]?void 0:r.objectStore(r.objectStoreNames[0])}return f(t[e])},set(t,e,r){return t[e]=r,!0},has(t,e){return t instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in t}};function ue(t){C=t(C)}function pe(t){return t===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...r){const a=t.call(y(this),e,...r);return k.set(a,e.sort?e.sort():[e]),f(a)}:le().includes(t)?function(...e){return t.apply(y(this),e),f(U.get(this))}:function(...e){return f(t.apply(y(this),e))}}function be(t){return typeof t=="function"?pe(t):(t instanceof IDBTransaction&&fe(t),ce(t,he())?new Proxy(t,C):t)}function f(t){if(t instanceof IDBRequest)return de(t);if(_.has(t))return _.get(t);const e=be(t);return e!==t&&(_.set(t,e),v.set(e,t)),e}const y=t=>v.get(t);function ge(t,e,{blocked:r,upgrade:a,blocking:n,terminated:s}={}){const o=indexedDB.open(t,e),c=f(o);return a&&o.addEventListener("upgradeneeded",h=>{a(f(o.result),h.oldVersion,h.newVersion,f(o.transaction),h)}),r&&o.addEventListener("blocked",h=>r(h.oldVersion,h.newVersion,h)),c.then(h=>{s&&h.addEventListener("close",()=>s()),n&&h.addEventListener("versionchange",l=>n(l.oldVersion,l.newVersion,l))}).catch(()=>{}),c}const me=["get","getKey","getAll","getAllKeys","count"],Ee=["put","add","delete","clear"],S=new Map;function R(t,e){if(!(t instanceof IDBDatabase&&!(e in t)&&typeof e=="string"))return;if(S.get(e))return S.get(e);const r=e.replace(/FromIndex$/,""),a=e!==r,n=Ee.includes(r);if(!(r in(a?IDBIndex:IDBObjectStore).prototype)||!(n||me.includes(r)))return;const s=async function(o,...c){const h=this.transaction(o,n?"readwrite":"readonly");let l=h.store;return a&&(l=l.index(c.shift())),(await Promise.all([l[r](...c),n&&h.done]))[0]};return S.set(e,s),s}ue(t=>({...t,get:(e,r,a)=>R(e,r)||t.get(e,r,a),has:(e,r)=>!!R(e,r)||t.has(e,r)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _e{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(r=>{if(ye(r)){const a=r.getImmediate();return`${a.library}/${a.version}`}else return null}).filter(r=>r).join(" ")}}function ye(t){const e=t.getComponent();return(e==null?void 0:e.type)==="VERSION"}const A="@firebase/app",H="0.11.1";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const d=new ie("@firebase/app"),Se="@firebase/app-compat",Be="@firebase/analytics-compat",De="@firebase/analytics",we="@firebase/app-check-compat",Ce="@firebase/app-check",Ae="@firebase/auth",Ie="@firebase/auth-compat",ve="@firebase/database",Te="@firebase/data-connect",Me="@firebase/database-compat",$e="@firebase/functions",Oe="@firebase/functions-compat",Re="@firebase/installations",He="@firebase/installations-compat",Ne="@firebase/messaging",Le="@firebase/messaging-compat",xe="@firebase/performance",Pe="@firebase/performance-compat",Ve="@firebase/remote-config",Fe="@firebase/remote-config-compat",We="@firebase/storage",je="@firebase/storage-compat",Ue="@firebase/firestore",ke="@firebase/vertexai",Ge="@firebase/firestore-compat",Ke="firebase",Je={[A]:"fire-core",[Se]:"fire-core-compat",[De]:"fire-analytics",[Be]:"fire-analytics-compat",[Ce]:"fire-app-check",[we]:"fire-app-check-compat",[Ae]:"fire-auth",[Ie]:"fire-auth-compat",[ve]:"fire-rtdb",[Te]:"fire-data-connect",[Me]:"fire-rtdb-compat",[$e]:"fire-fn",[Oe]:"fire-fn-compat",[Re]:"fire-iid",[He]:"fire-iid-compat",[Ne]:"fire-fcm",[Le]:"fire-fcm-compat",[xe]:"fire-perf",[Pe]:"fire-perf-compat",[Ve]:"fire-rc",[Fe]:"fire-rc-compat",[We]:"fire-gcs",[je]:"fire-gcs-compat",[Ue]:"fire-fst",[Ge]:"fire-fst-compat",[ke]:"fire-vertex","fire-js":"fire-js",[Ke]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ye=new Map,ze=new Map,N=new Map;function L(t,e){try{t.container.addComponent(e)}catch(r){d.debug(`Component ${e.name} failed to register with FirebaseApp ${t.name}`,r)}}function I(t){const e=t.name;if(N.has(e))return d.debug(`There were multiple attempts to register component ${e}.`),!1;N.set(e,t);for(const r of Ye.values())L(r,t);for(const r of ze.values())L(r,t);return!0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xe={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},T=new j("app","Firebase",Xe);function E(t,e,r){var a;let n=(a=Je[t])!==null&&a!==void 0?a:t;r&&(n+=`-${r}`);const s=n.match(/\s|\//),o=e.match(/\s|\//);if(s||o){const c=[`Unable to register library "${n}" with version "${e}":`];s&&c.push(`library name "${n}" contains illegal characters (whitespace or "/")`),s&&o&&c.push("and"),o&&c.push(`version name "${e}" contains illegal characters (whitespace or "/")`),d.warn(c.join(" "));return}I(new D(`${n}-version`,()=>({library:n,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ze="firebase-heartbeat-database",Qe=1,p="firebase-heartbeat-store";let B=null;function G(){return B||(B=ge(Ze,Qe,{upgrade:(t,e)=>{switch(e){case 0:try{t.createObjectStore(p)}catch(r){console.warn(r)}}}}).catch(t=>{throw T.create("idb-open",{originalErrorMessage:t.message})})),B}async function qe(t){try{const r=(await G()).transaction(p),a=await r.objectStore(p).get(K(t));return await r.done,a}catch(e){if(e instanceof b)d.warn(e.message);else{const r=T.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});d.warn(r.message)}}}async function x(t,e){try{const a=(await G()).transaction(p,"readwrite");await a.objectStore(p).put(e,K(t)),await a.done}catch(r){if(r instanceof b)d.warn(r.message);else{const a=T.create("idb-set",{originalErrorMessage:r==null?void 0:r.message});d.warn(a.message)}}}function K(t){return`${t.name}!${t.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const et=1024,tt=30;class rt{constructor(e){this.container=e,this._heartbeatsCache=null;const r=this.container.getProvider("app").getImmediate();this._storage=new at(r),this._heartbeatsCachePromise=this._storage.read().then(a=>(this._heartbeatsCache=a,a))}async triggerHeartbeat(){var e,r;try{const n=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=P();if(((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((r=this._heartbeatsCache)===null||r===void 0?void 0:r.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(o=>o.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:n}),this._heartbeatsCache.heartbeats.length>tt){const o=st(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(a){d.warn(a)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const r=P(),{heartbeatsToSend:a,unsentEntries:n}=nt(this._heartbeatsCache.heartbeats),s=W(JSON.stringify({version:2,heartbeats:a}));return this._heartbeatsCache.lastSentHeartbeatDate=r,n.length>0?(this._heartbeatsCache.heartbeats=n,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(r){return d.warn(r),""}}}function P(){return new Date().toISOString().substring(0,10)}function nt(t,e=et){const r=[];let a=t.slice();for(const n of t){const s=r.find(o=>o.agent===n.agent);if(s){if(s.dates.push(n.date),V(r)>e){s.dates.pop();break}}else if(r.push({agent:n.agent,dates:[n.date]}),V(r)>e){r.pop();break}a=a.slice(1)}return{heartbeatsToSend:r,unsentEntries:a}}class at{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Q()?q().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const r=await qe(this.app);return r!=null&&r.heartbeats?r:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var r;if(await this._canUseIndexedDBPromise){const n=await this.read();return x(this.app,{lastSentHeartbeatDate:(r=e.lastSentHeartbeatDate)!==null&&r!==void 0?r:n.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var r;if(await this._canUseIndexedDBPromise){const n=await this.read();return x(this.app,{lastSentHeartbeatDate:(r=e.lastSentHeartbeatDate)!==null&&r!==void 0?r:n.lastSentHeartbeatDate,heartbeats:[...n.heartbeats,...e.heartbeats]})}else return}}function V(t){return W(JSON.stringify({version:2,heartbeats:t})).length}function st(t){if(t.length===0)return-1;let e=0,r=t[0].date;for(let a=1;a<t.length;a++)t[a].date<r&&(r=t[a].date,e=a);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ot(t){I(new D("platform-logger",e=>new _e(e),"PRIVATE")),I(new D("heartbeat",e=>new rt(e),"PRIVATE")),E(A,H,t),E(A,H,"esm2017"),E("fire-js","")}ot("");var it="firebase",ct="11.3.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */E(it,ct,"app");
//# sourceMappingURL=firebase-Dr3GniDU.js.map
