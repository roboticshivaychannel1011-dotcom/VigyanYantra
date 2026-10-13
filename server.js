import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env without exposing it to the browser. Process environment variables win.
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const provider = String(process.env.AI_PROVIDER || 'gemini').toLowerCase();
const openaiKey = process.env.OPENAI_API_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const configured = provider === 'openai' ? !!openaiKey : provider === 'gemini' ? !!geminiKey : false;
const port = Number(process.env.PORT || 3000);

const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};

function json(res, status, body) { const out=JSON.stringify(body); res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}); res.end(out); }
function readBody(req) { return new Promise((resolve,reject)=>{let data='';req.on('data',c=>{data+=c;if(data.length>300000){req.destroy();reject(new Error('Request too large'))}});req.on('end',()=>{try{resolve(data?JSON.parse(data):{})}catch(e){reject(new Error('Invalid JSON'))}});req.on('error',reject)}) }
function cleanMessages(messages){return Array.isArray(messages)?messages.slice(-12).filter(m=>m&&(m.role==='user'||m.role==='assistant')&&typeof m.text==='string').map(m=>({role:m.role,text:m.text.slice(0,4000)})):[]}
const systemPrompt=`You are VigyanYantra AI Assistant, the helpful assistant inside the VigyanYantra learning portal.\n\nBe concise, friendly, and educational. Help users with course enrollment, course progress, lessons, uploaded PDFs, GitHub repositories, Google Forms quizzes, student portal navigation, teacher course management, and founder/admin navigation. Never reveal passwords, API keys, or private credentials. If the user asks for something you cannot access, say so clearly. Use the supplied page/course context when useful. Do not claim an action was completed unless the website context confirms it.`;

async function callOpenAI(messages, context){
  const model=process.env.OPENAI_MODEL||'gpt-5.6-luna';
  // Use the simple Responses API message shape. This avoids sending
  // Chat/Responses content-part objects that some API versions reject.
  const input=messages.map(m=>({role:m.role,content:m.text}));
  input.push({role:'user',content:`Current VigyanYantra page context:\n${context}\n\nAnswer the user's latest message using this context.`});
  const r=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},
    body:JSON.stringify({model,instructions:systemPrompt,input})
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data?.error?.message||`OpenAI request failed (${r.status})`);
  const text=(data.output_text || data.output?.flatMap(x=>x.content||[]).map(x=>x.text||'').join('')).trim();
  if(!text) throw new Error('OpenAI returned an empty response.');
  return text;
}
async function callGemini(messages, context){
  const model=process.env.GEMINI_MODEL||'gemini-3.5-flash';
  const contents=messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.text}]}));
  contents.push({role:'user',parts:[{text:`Current VigyanYantra page context:\n${context}\n\nAnswer the user's latest message using this context.`}]});
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},body:JSON.stringify({system_instruction:{parts:[{text:systemPrompt}]},contents,generationConfig:{temperature:0.4,maxOutputTokens:700}})});
  const data=await r.json();
  if(!r.ok) throw new Error(data?.error?.message||`Gemini request failed (${r.status})`);
  const text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
  if(!text) throw new Error('Gemini returned an empty response.');
  return text;
}

async function handle(req,res){
  if(req.method==='GET' && req.url==='/api/health') return json(res,200,{ok:true,name:'VigyanYantra'});
  if(req.method==='GET' && req.url==='/api/ai/status') return json(res,200,{configured,provider:configured?provider:null,model:configured?(provider==='openai'?(process.env.OPENAI_MODEL||'gpt-5.6-luna'):(process.env.GEMINI_MODEL||'gemini-3.5-flash')):null});
  if(req.method==='POST' && req.url==='/api/ai/chat'){
    try{
      const body=await readBody(req), messages=cleanMessages(body.messages), context=typeof body.context==='string'?body.context.slice(0,8000):'No additional page context.';
      if(!messages.length)return json(res,400,{ok:false,error:'No chat message was provided.'});
      if(!configured)return json(res,503,{ok:false,configured:false,error:'AI provider is not configured. Add an API key to the server .env file.'});
      const answer=provider==='openai'?await callOpenAI(messages,context):await callGemini(messages,context);
      return json(res,200,{ok:true,provider,answer});
    }catch(e){console.error('AI error:',e);return json(res,502,{ok:false,configured,provider:configured?provider:null,error:e.message||'AI request failed.'})}
  }
  if(req.method==='GET'){
    let urlPath=(req.url||'/').split('?')[0];
    if(urlPath==='/' ) urlPath='/index.html';
    const safe=path.normalize(urlPath).replace(/^([.][.][/\\])+/, '').replace(/^[/\\]+/,'');
    const rootDir=__dirname;
    const file=path.join(rootDir,safe);
    if(!file.startsWith(rootDir)) return json(res,403,{error:'Forbidden'});
    fs.readFile(file,(err,data)=>{if(err)return json(res,404,{error:'Not found'});res.writeHead(200,{'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream'});res.end(data)});
    return;
  }
  json(res,405,{error:'Method not allowed'});
}
http.createServer(handle).listen(port,()=>console.log(`VigyanYantra: http://localhost:${port}`));
