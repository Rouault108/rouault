import {
  CSP_IMPORTS_CONTRACT,
  CSP_IMPORTS_SOURCE,
  CSP_WASM_OBSERVER,
} from '../../../scripts/ci/csp-wasm-evidence.js';
import { PROVIDER_WASM_SHA256 } from '../../../shared/search/lexical-provider-config.js';

// HTTPで許可された通常scriptから呼ぶ。計測は元のAPIのPromise/例外をそのまま返す。
export const wasmInstrumentation = (selection: 'streaming' | 'bytes', measurementFault = false) =>
  `const cspSelection=${JSON.stringify(selection)}; const cspObserver=${JSON.stringify(CSP_WASM_OBSERVER)}; const cspImports=${JSON.stringify(CSP_IMPORTS_CONTRACT)}; const cspImportsSource=${JSON.stringify(CSP_IMPORTS_SOURCE)}; const cspExpectedDigest=${JSON.stringify(PROVIDER_WASM_SHA256)}; const cspMeasurementFault=${String(measurementFault)};` +
  String.raw`
const cspMeasure={schema:1,observer:cspObserver,ready:true,selection:cspSelection,plannedReason:cspSelection==='bytes'?'non-streaming-mime':'none',importsContract:cspImports,importsSource:cspImportsSource,calls:[],js:{eval:'rejected',function:'rejected',timer:'pending'}};
if(!cspMeasurementFault) Object.defineProperty(globalThis,'__cspWasmMeasure',{value:cspMeasure});
// Workerの通常の終了より先に、通知observerと独立した最小計測値を同originへ配送する。
const cspChannel=new BroadcastChannel('rouault-csp-wasm-measure-v1');
const cspPublish=()=>{if(!cspMeasurementFault)cspChannel.postMessage(cspMeasure);};
// 診断の照合材料はRAM内に限る。Aの計測schemaや保存artifactには混ぜない。
const cspConsoleErrors=[];Object.defineProperty(globalThis,'__cspWasmConsoleErrors',{value:cspConsoleErrors});
const cspConsoleChannel=new BroadcastChannel('rouault-csp-wasm-console-v2');
cspConsoleChannel.postMessage(cspConsoleErrors);
const cspConsoleError=(api,error)=>{if(cspConsoleErrors.length>=9)return;cspConsoleErrors.push({api,detail:String(error).slice(0,4097)});cspConsoleChannel.postMessage(cspConsoleErrors);};
const cspImportsValid=value=>value&&Object.keys(value).sort().join(',')==='a'&&value.a&&Object.keys(value.a).sort().join(',')==='a,b,c,d,e'&&Object.values(value.a).every(item=>typeof item==='function');
const cspDigest=async(value,row)=>{try{const bytes=ArrayBuffer.isView(value)?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):new Uint8Array(value);const hash=await crypto.subtle.digest('SHA-256',bytes);row.digest=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');row.digestOrigin='measured';}catch{if(row.digestOrigin!=='pre-fetch-control')row.digest='invalid';}cspPublish();};
const cspError=e=>['CompileError','TypeError'].includes(e?.name)?e.name:'other';
const cspTrack=(api,operation,input,imports)=>{
 const row={api,outcome:'pending',error:'none',digest:'pending',digestOrigin:'pending',importsValid:!!cspImportsValid(imports)};cspMeasure.calls.push(row);
 if(api==='bytes') void cspDigest(input,row);
 else Promise.resolve(input).then(response=>response.clone().arrayBuffer()).then(bytes=>cspDigest(bytes,row)).catch(()=>{if(row.digestOrigin!=='pre-fetch-control')row.digest='invalid';cspPublish();});
 let promise;try{promise=operation();}catch(error){row.outcome='rejected';row.error=cspError(error);throw error;}
 promise.then(()=>{row.outcome='fulfilled';cspPublish();},error=>{row.outcome='rejected';row.error=cspError(error);cspConsoleError(api,error);if(row.error==='CompileError'&&row.digest==='pending'){row.digest=cspExpectedDigest;row.digestOrigin='pre-fetch-control';}cspPublish();});
 return promise;
};
const cspNativeStreaming=WebAssembly.instantiateStreaming;
const cspNativeBytes=WebAssembly.instantiate;
WebAssembly.instantiateStreaming=function(source,imports,...rest){
 // 正常bytes/importsを維持したMIME対照で、glueの既存fallbackを選択する。
 const selected=cspSelection==='bytes'?Promise.resolve(source).then(response=>{const headers=new Headers(response.headers);headers.set('Content-Type','application/octet-stream');return new Response(response.body,{status:response.status,headers});}):source;
 return cspTrack('streaming',()=>cspNativeStreaming.call(WebAssembly,selected,imports,...rest),source,imports);
};
WebAssembly.instantiate=function(bytes,imports,...rest){return cspTrack('bytes',()=>cspNativeBytes.call(WebAssembly,bytes,imports,...rest),bytes,imports);};
try{cspMeasure.js.eval=globalThis.eval('6+1')===7?'allowed':'rejected';}catch(error){cspConsoleError('eval',error);}
try{cspMeasure.js.function=new Function('return 7')()===7?'allowed':'rejected';}catch(error){cspConsoleError('function',error);}
globalThis.__cspStringTimer=0;
try{setTimeout('globalThis.__cspStringTimer=1',0);}catch(error){cspConsoleError('timer',error);}
setTimeout(()=>{cspMeasure.js.timer=globalThis.__cspStringTimer===1?'allowed':'rejected';cspPublish();},50);
cspPublish();
`;
