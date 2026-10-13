
const F={id:"AD0001",name:"Shivay Singh",role:"Founder",password:"Founder@VigyanYantra1011"};
let S=JSON.parse(localStorage.getItem("vy_state")||'{"courses":[],"teachers":[],"students":[],"session":null}');
// Seed the two existing teacher accounts and keep them available across reloads.
S.teachers=S.teachers||[];
[{id:"TC0001",name:"Teacher TC0001",role:"Teacher",password:"JaiShiv@07"},{id:"TC0002",name:"Teacher TC0002",role:"Teacher",password:"aditi2k71019"}].forEach(t=>{
  const existing=S.teachers.find(x=>x.id===t.id);
  if(existing) Object.assign(existing,{password:t.password,name:existing.name||t.name,role:existing.role||t.role});
  else S.teachers.push(t);
});
let R="home";let aiMessages=[];const save=()=>localStorage.setItem("vy_state",JSON.stringify(S));
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const logged=()=>!!S.session?.id;
const isFounder=()=>S.session?.id===F.id;
const isTeacher=()=>!!S.session?.id && S.session.id!==F.id;
const currentStaffId=()=>S.session?.id||F.id;
const visibleCourses=()=>isFounder()?(S.courses||[]):(S.courses||[]).filter(c=>c.createdBy===currentStaffId());
const DB_NAME="vigyanyantra_files_v1", DB_STORE="files";
function openFileDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(DB_STORE))r.result.createObjectStore(DB_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function putFile(fileKey,file){const db=await openFileDB();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).put(file,fileKey);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function getFile(fileKey){if(!fileKey)return null;const db=await openFileDB();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,"readonly");const r=tx.objectStore(DB_STORE).get(fileKey);r.onsuccess=()=>{db.close();resolve(r.result||null)};r.onerror=()=>{db.close();reject(r.error)}})}
async function hydrateCourseFiles(c){if(!c?.content)return;let changed=false;for(const x of c.content){if(x.fileKey&&!x.dataUrl){const f=await getFile(x.fileKey);if(f){x.dataUrl=URL.createObjectURL(f);changed=true}}}return changed}
function toast(x){let e=document.getElementById("toast");e.textContent=x;e.className="toast show";setTimeout(()=>e.className="toast",2000)}
function nav(){return `<nav class="nav"><a class="brand" href="#" onclick="go('home')"><img src="assets/logo.png"><span><b>VigyanYantra</b><small>A GURUKUL OF TECH TITANS</small></span></a><div class="navlinks"><button onclick="go('home')">Home</button><button onclick="go('courses')">Courses</button>${logged()?`<button onclick="go('admin')">${isFounder()?"Admin":"Teacher Portal"}</button><span class="pill">${esc(S.session.id)} · ${esc(S.session.role)}</span><button onclick="logout()">Logout</button>`:`<button onclick="go('login')">Admin / Teacher Login</button>`}</div></nav>`}
function foot(){return `<footer class="footer"><div class="container">© 2026 VigyanYantra · Learn • Build • Innovate • Lead</div></footer>`}
function shell(x){document.getElementById("app").innerHTML=nav()+x+foot()+`<div id="toast" class="toast"></div>`+aiAssistant();initAIAssistant()}
function aiAssistant(){
  const messages=aiMessages.length?aiMessages:[{role:"assistant",text:"Hi! I’m VigyanYantra AI. I can help with courses, lessons, PDFs, quizzes, GitHub resources, enrollment, and course progress."}];
  return `<button class="ai-fab" id="vyAIFab" type="button" onclick="toggleAIAssistant()" aria-label="Open VigyanYantra AI">✦ AI</button>
  <aside class="ai-assistant collapsed" id="vyAIAssistant" aria-label="VigyanYantra AI Assistant">
    <div class="ai-head"><div><div class="ai-title">✦ VigyanYantra AI</div><div class="ai-status" id="vyAIStatus"><span></span> Connecting to AI…</div></div><button class="ai-back" type="button" onclick="toggleAIAssistant()" aria-label="Back and close AI">← Back</button></div>
    <div class="ai-context">${esc(aiContext())}</div>
    <div class="ai-messages" id="vyAIMessages">${messages.slice(-30).map(m=>`<div class="ai-msg ${m.role==="user"?"user":"assistant"}"><div class="ai-bubble">${esc(m.text)}</div></div>`).join("")}</div>
    <div class="ai-suggestions"><button onclick="aiAsk('How do I enroll in a course?')">Enroll</button><button onclick="aiAsk('How is course progress saved?')">Progress</button><button onclick="aiAsk('How do I use the course resources?')">Resources</button></div>
    <form class="ai-input" onsubmit="sendAIMessage(event)"><input id="vyAIInput" autocomplete="off" placeholder="Ask VigyanYantra AI..."/><button type="submit" aria-label="Send">➤</button></form>
  </aside>`
}
function aiContext(){
  const parts=[];
  if(S.session) parts.push(`Role: ${S.session.role} (${S.session.id})`);
  else parts.push("Role: visitor");
  if(R.startsWith("student-course:")){const id=R.slice(15),c=S.courses.find(x=>x.id===id);if(c){parts.push(`Student course: ${c.title}`);parts.push(`Category: ${c.category||"Course"}`);parts.push(`Content: ${(c.content||[]).map(x=>x.type+": "+(x.title||"Untitled")).join("; ")||"none"}`);try{const p=courseProgress(id);parts.push(`Student progress: ${p.percent}% (${p.completed.length}/${p.total})`)}catch(e){}}}
  else if(R==="student-enroll") parts.push("Student page: course enrollment catalog");
  else if(R==="admin") parts.push(isFounder()?"Page: Founder admin portal":"Page: Teacher portal");
  else if(R==="new") parts.push(isTeacher()?"Page: teacher create course":"Page: staff create course");
  else if(R.startsWith("edit:")){const c=S.courses.find(x=>x.id===R.slice(5));parts.push(`Page: editing course ${c?.title||"course"}`)}
  else if(R==="login") parts.push("Page: staff login");
  else parts.push(`Page: ${R}`);
  return parts.join("\n");
}
function aiReply(q){
  const t=q.toLowerCase();
  if(/enroll|join course/.test(t))return "Open Enroll Courses from the Student Portal, choose a published course, and select Enroll Course. Your enrollment is saved to your student record.";
  if(/progress|completed|completion/.test(t))return "Course progress is saved per student and per course. Mark lessons/resources complete, and the portal calculates your completed items and percentage.";
  if(/pdf|download/.test(t))return "PDF Resources can be viewed in the course page and downloaded with the Download File button. Lesson videos are view-only and are not downloadable.";
  if(/video|lesson/.test(t))return "Lessons contain uploaded videos that students can play in the course page. Videos are intentionally view-only; there is no download option.";
  if(/github|repository/.test(t))return "GitHub Repository resources open their saved repository link in a new tab.";
  if(/quiz|google form|form/.test(t))return "Quiz resources open the teacher's Google Forms link. Opening the quiz can also mark that content item complete.";
  if(/save|publish|course/.test(t) && (isFounder()||isTeacher()))return "Staff can create a course, add Lessons, PDF Resources, GitHub Repositories, and Quizzes, then use Publish Course or Save Changes. Each teacher sees only courses they created.";
  if(/teacher|portal/.test(t))return "Teacher accounts have their own portal and can manage only their own courses and see progress for students enrolled in those courses.";
  if(/founder|admin/.test(t))return "The Founder portal manages all courses, teachers, students, and enrollment progress.";
  if(/hello|hi|hey/.test(t))return "Hello! What would you like help with—courses, enrollment, progress, lessons, PDFs, GitHub, or quizzes?";
  return `I can help with ${logged()?"your portal, course creation, student enrollment, progress tracking, and course resources":"courses, enrollment, lessons, PDFs, GitHub resources, quizzes, and progress"}. Try asking a specific question.`;
}
function renderAIMessages(){const box=document.getElementById("vyAIMessages");if(!box)return;const msgs=aiMessages.length?aiMessages:[{role:"assistant",text:"Hi! I’m VigyanYantra AI. I can help with courses, lessons, PDFs, quizzes, GitHub resources, enrollment, and course progress."}];box.innerHTML=msgs.slice(-30).map(m=>`<div class="ai-msg ${m.role==="user"?"user":"assistant"}"><div class="ai-bubble">${esc(m.text)}</div></div>`).join("");box.scrollTop=box.scrollHeight}
function storeAI(role,text){aiMessages.push({role,text});aiMessages=aiMessages.slice(-60)}
function setAIStatus(text,ok=false){const el=document.getElementById("vyAIStatus");if(!el)return;el.innerHTML=`<span style="background:${ok?"#54d68a":"#d7ad55"}"></span> ${esc(text)}`}
async function getAIStatus(){try{const r=await fetch("/api/ai/status");const data=await r.json();if(data.configured){setAIStatus(`${data.provider} · ${data.model}`,true);return data}setAIStatus("API key not configured");return data}catch(e){setAIStatus("Backend not connected");return {configured:false}}}
async function sendAIMessage(e){e.preventDefault();const input=document.getElementById("vyAIInput");if(!input)return;const q=input.value.trim();if(!q)return;storeAI("user",q);input.value="";renderAIMessages();setAIStatus("Thinking…");const msgs=aiMessages;try{const r=await fetch("/api/ai/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:msgs.filter(m=>m.role==="user"||m.role==="assistant").slice(-12),context:aiContext()})});const data=await r.json().catch(()=>({}));if(!r.ok||!data.ok)throw new Error(data.error||"AI request failed");storeAI("assistant",data.answer);setAIStatus(`${data.provider} · connected`,true);renderAIMessages()}catch(err){console.error(err);storeAI("assistant",`I couldn't reach the AI service. ${err.message||"Please check the server configuration."}`);setAIStatus("AI connection error");renderAIMessages()}}
function aiAsk(q){const input=document.getElementById("vyAIInput");if(input){input.value=q;sendAIMessage({preventDefault(){}})}}
function initAIAssistant(){if(!aiMessages.length){storeAI("assistant","Hi! I’m VigyanYantra AI. I’m connected to the AI service and can help with courses, lessons, PDFs, quizzes, GitHub resources, enrollment, and course progress.")}const box=document.getElementById("vyAIMessages");if(box){renderAIMessages();box.scrollTop=box.scrollHeight}getAIStatus()}
function toggleAIAssistant(){const panel=document.getElementById("vyAIAssistant"),fab=document.getElementById("vyAIFab");if(!panel)return;const opening=panel.classList.toggle("collapsed")===false;if(fab)fab.classList.toggle("hidden",opening);if(opening){setTimeout(()=>document.getElementById("vyAIInput")?.focus(),80)}}
function home(){return `<main class="container hero"><div><span class="eyebrow">THE VIGYANYANTRA LEARNING PORTAL</span><h1>Science meets<br><span class="gold">robotics.</span></h1><p>A complete learning platform for Physics, Chemistry, Biology, Mathematics, Robotics and Coding. Courses will appear here once an authorized Founder, Admin or Teacher publishes them.</p><div class="actions" style="display:flex;flex-direction:column;align-items:flex-start;gap:10px"><button class="btn gold" onclick="go('courses')">Explore Courses</button><button class="btn ghost" onclick="window.openStudentPortal()">Student Signup / Login</button><button class="btn ghost" onclick="go('login')">Staff Login</button></div></div><div class="logo"><img src="assets/logo.png"></div></main>`}
function courses(){return `<main class="container page"><h2>Course Library</h2><p class="muted">Published courses available to students.</p>${S.courses.length?`<div class="grid" style="margin-top:25px">${S.courses.map(c=>`<article class="course"><div class="icon">🎓</div><div class="muted">${esc(c.category)}</div><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p><span class="price">${c.price?"₹"+Number(c.price).toLocaleString("en-IN"):"Free"}</span></article>`).join("")}</div>`:`<div class="empty" style="margin-top:25px"><div style="font-size:45px">📚</div><h3>No courses available yet</h3><p>The course library is currently empty.<br>Authorized staff can publish courses from the admin portal.</p>${logged()?`<button class="btn gold" onclick="go('admin')">Open Admin Portal</button>`:""}</div>`}</main>`}
function login(){return `<main class="loginwrap"><section class="login"><img src="assets/logo.png"><h2>Staff Portal</h2><p class="sub">Admin and Teacher access</p><div class="field"><label>Staff ID</label><input id="sid" placeholder="Your ID"></div><div class="field"><label>Password</label><input id="spass" type="password" placeholder="Password"></div><button class="btn gold" style="width:100%" onclick="signin()">Sign In</button><p style="font-size:11px;color:#6f8097;text-align:center;margin-top:18px">Authorized Founder and Teacher accounts only.</p></section></main>`}
function signin(){
  const id=document.getElementById("sid").value.trim().toUpperCase(), pass=document.getElementById("spass").value;
  if(id===F.id && pass===F.password){S.session={id:F.id,name:F.name,role:F.role};save();go("admin");return;}
  const t=S.teachers.find(x=>x.id===id && x.password===pass);
  if(t){S.session={id:t.id,name:t.name,role:t.role};save();go("admin");return;}
  toast("Invalid staff ID or password");
}
function logout(){S.session=null;save();go("home")}
function admin(){
  if(!logged())return login();
  if(isTeacher()) return teacherPortal();
  const courses=S.courses||[];
  return `<main class="container page"><span class="eyebrow">FOUNDER CONTROL CENTER</span><h2 style="margin-top:10px">Admin Portal</h2><p class="muted">Welcome, ${esc(F.name)} · ${esc(F.role)} · ${esc(F.id)}</p><div class="stats"><div class="stat"><strong>${courses.length}</strong><span>Published Courses</span></div><div class="stat"><strong>${S.teachers.length}</strong><span>Teachers</span></div><div class="stat"><strong>${S.students.length}</strong><span>Students</span></div><div class="stat"><strong>1</strong><span>Founder</span></div></div><div class="panel"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Course Management</h3><button class="btn gold" onclick="go('new')">+ Create Course</button></div>${courses.length?`<div class="tablewrap"><table class="table"><tr><th>Course</th><th>Category</th><th>Created By</th><th>Price</th><th>Status</th><th></th></tr>${courses.map(c=>`<tr><td>${esc(c.title)}</td><td>${esc(c.category)}</td><td>${esc(c.createdBy||F.id)}</td><td>${c.price?"₹"+Number(c.price).toLocaleString("en-IN"):"Free"}</td><td>Published</td><td style="white-space:nowrap"><button class="btn ghost" onclick="editCourse('${c.id}')" style="margin-right:8px">Edit</button><button class="btn red" onclick="del('${c.id}')">Delete</button></td></tr>`).join("")}</table></div>`:`<div class="empty">No courses yet. Create your first course.</div>`}</div><div class="panel" style="margin-top:18px"><h3>Student Enrollments & Progress</h3><p class="muted">Enrollment and course progress saved for each student.</p>${S.students?.length?`<div class="tablewrap"><table class="table"><tr><th>Student</th><th>Course</th><th>Enrolled</th><th>Progress</th><th>Last Activity</th></tr>${S.students.flatMap(st=>(st.enrollments||[]).map(cid=>{const c=S.courses.find(x=>x.id===cid), p=st.progress?.[cid]||{completed:[]}; const total=(c?.content||[]).length, done=(p.completed||[]).filter(x=>(c?.content||[]).some(y=>y.id===x)).length; const pct=total?Math.round(done/total*100):0; return `<tr><td>${esc(st.name)}<br><span class="muted">${esc(st.id)}</span></td><td>${esc(c?.title||"Deleted course")}</td><td>${p.startedAt?new Date(p.startedAt).toLocaleDateString("en-IN"):"—"}</td><td>${pct}% (${done}/${total})</td><td>${p.lastActivityAt?new Date(p.lastActivityAt).toLocaleString("en-IN"):"—"}</td></tr>`})).join("")}</table></div>`:`<div class="empty" style="padding:25px">No student enrollments recorded yet.</div>`}</div><div class="panel" style="margin-top:18px"><h3>Staff & Access</h3><p class="muted">Founder access and teacher accounts.</p><table class="table"><tr><th>ID</th><th>Name</th><th>Role</th></tr><tr><td>AD0001</td><td>Shivay Singh</td><td>Founder</td></tr>${S.teachers.map(t=>`<tr><td>${esc(t.id)}</td><td>${esc(t.name)}</td><td>${esc(t.role)}</td></tr>`).join("")}</table><button class="btn ghost" onclick="go('teacher')" style="margin-top:15px">+ Add Teacher</button></div></main>`
}
function teacherPortal(){
  const me=S.teachers.find(t=>t.id===S.session.id);
  const courses=visibleCourses();
  const ownCourseIds=new Set(courses.map(c=>c.id));
  const rows=[];
  (S.students||[]).forEach(st=>{
    (st.enrollments||[]).filter(cid=>ownCourseIds.has(cid)).forEach(cid=>{
      const c=courses.find(x=>x.id===cid), p=st.progress?.[cid]||{completed:[]};
      const total=(c?.content||[]).length, done=(p.completed||[]).filter(x=>(c?.content||[]).some(y=>y.id===x)).length, pct=total?Math.round(done/total*100):0;
      rows.push(`<tr><td>${esc(st.name)}<br><span class="muted">${esc(st.id)}</span></td><td>${esc(c?.title||"Deleted course")}</td><td>${p.startedAt?new Date(p.startedAt).toLocaleDateString("en-IN"):"—"}</td><td>${pct}% (${done}/${total})</td><td>${p.lastActivityAt?new Date(p.lastActivityAt).toLocaleString("en-IN"):"—"}</td></tr>`);
    });
  });
  return `<main class="container page"><span class="eyebrow">TEACHER CONTROL CENTER</span><h2 style="margin-top:10px">Teacher Portal</h2><p class="muted">Welcome, ${esc(me?.name||S.session.id)} · ${esc(S.session.role)} · ${esc(S.session.id)}</p><div class="stats"><div class="stat"><strong>${courses.length}</strong><span>My Courses</span></div><div class="stat"><strong>${rows.length}</strong><span>Active Enrollments</span></div><div class="stat"><strong>${courses.reduce((n,c)=>n+(c.content||[]).length,0)}</strong><span>Content Items</span></div><div class="stat"><strong>Teacher</strong><span>Portal Access</span></div></div><div class="panel"><div style="display:flex;justify-content:space-between;align-items:center"><div><h3>My Courses</h3><p class="muted" style="margin:5px 0 0">Only courses created by ${esc(me?.name||S.session.id)} are shown here.</p></div><button class="btn gold" onclick="go('new')">+ Create Course</button></div>${courses.length?`<div class="tablewrap"><table class="table"><tr><th>Course</th><th>Category</th><th>Price</th><th>Content</th><th>Status</th><th></th></tr>${courses.map(c=>`<tr><td>${esc(c.title)}</td><td>${esc(c.category)}</td><td>${c.price?"₹"+Number(c.price).toLocaleString("en-IN"):"Free"}</td><td>${(c.content||[]).length}</td><td>Published</td><td style="white-space:nowrap"><button class="btn ghost" onclick="editCourse('${c.id}')" style="margin-right:8px">Edit</button><button class="btn red" onclick="del('${c.id}')">Delete</button></td></tr>`).join("")}</table></div>`:`<div class="empty" style="margin-top:18px">You haven't created any courses yet. Create your first course.</div>`}</div><div class="panel" style="margin-top:18px"><h3>Student Progress in My Courses</h3><p class="muted">You can monitor progress only for courses you created.</p>${rows.length?`<div class="tablewrap"><table class="table"><tr><th>Student</th><th>Course</th><th>Enrolled</th><th>Progress</th><th>Last Activity</th></tr>${rows.join("")}</table></div>`:`<div class="empty" style="padding:25px">No student enrollments in your courses yet.</div>`}</div></main>`
}

function courseContentUI(items, prefix){
  items=items||[];
  return `<div class="panel" style="margin-top:18px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
      <div><h3 style="margin:0">Course Content</h3><div class="muted" style="margin-top:5px">Lessons, PDF resources, GitHub repositories, and quizzes.</div></div>
      <button class="btn gold" type="button" onclick="addContent('${prefix}')">＋ Add Content</button>
    </div>
    <div id="${prefix}ContentList" style="margin-top:14px">${items.length?items.map((x,i)=>contentRow(x,i,prefix)).join(""):`<div class="muted" style="padding:14px 0">No content added yet.</div>`}</div>
  </div>`
}
function contentRow(x,i,prefix){
  const labels={lesson:"Lesson",pdf:"PDF Resource",quiz:"Quiz",github:"GitHub Repository"};
  const extra=x.fileName?`<div class="muted" style="font-size:12px">📎 ${esc(x.fileName)}</div>`:(x.url?`<div class="muted" style="font-size:12px;word-break:break-all">${esc(x.url)}</div>`:"");
  return `<div class="panel" style="margin:10px 0;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:15px">
    <div><strong>${labels[x.type]||"Content"}</strong><div>${esc(x.title||"Untitled content")}</div>${extra}</div>
    <button class="btn red" type="button" onclick="removeContent('${prefix}',${i})">Remove</button>
  </div>`
}
function addContent(prefix){
  const modal=document.getElementById("vyContentModal");
  if(!modal){
    const m=document.createElement("div");
    m.id="vyContentModal";
    m.innerHTML=`<div class="panel" style="width:min(620px,92vw);max-height:90vh;overflow:auto;background:#fff">
      <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Add Content</h3><button class="btn ghost" type="button" onclick="closeContentModal()">×</button></div>
      <div class="field"><label>Content type</label><select id="vyContentType" onchange="refreshContentFields()">
        <option value="lesson">Lesson</option>
        <option value="pdf">PDF Resource</option>
        <option value="github">GitHub Repository</option>
        <option value="quiz">Quiz</option>
      </select></div>
      <div class="field"><label>Title</label><input id="vyContentTitle" placeholder="e.g. Introduction to Robotics"></div>
      <div id="vyContentFields"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn ghost" type="button" onclick="closeContentModal()">Cancel</button><button class="btn gold" type="button" onclick="saveAddedContent()">Add Content</button></div>
    </div>`;
    Object.assign(m.style,{position:"fixed",inset:"0",zIndex:"100001",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.6)",padding:"20px"});
    document.body.appendChild(m);
  }
  window._vyContentPrefix=prefix;
  document.getElementById("vyContentType").value="lesson";
  document.getElementById("vyContentTitle").value="";
  refreshContentFields();
  document.getElementById("vyContentModal").style.display="flex";
}
function closeContentModal(){const m=document.getElementById("vyContentModal");if(m)m.style.display="none"}
function refreshContentFields(){
  const type=document.getElementById("vyContentType").value;
  const box=document.getElementById("vyContentFields");
  if(type==="lesson"){
    box.innerHTML=`<div class="field"><label>Lesson video (optional)</label><input id="vyContentFile" type="file" accept="video/*"><div class="muted" style="font-size:12px;margin-top:5px">Upload the lesson video file here.</div></div>`;
  }else if(type==="pdf"){
    box.innerHTML=`<div class="field"><label>Upload PDF file</label><input id="vyContentFile" type="file" accept="application/pdf,.pdf"></div>`;
  }else if(type==="github"){
    box.innerHTML=`<div class="field"><label>GitHub Repository URL</label><input id="vyContentUrl" type="url" placeholder="https://github.com/owner/repository"></div>`;
  }else{
    box.innerHTML=`<div class="field"><label>Google Forms link (optional)</label><input id="vyContentUrl" type="url" placeholder="https://forms.google.com/..."></div>`;
  }
}
async function saveAddedContent(){
  const prefix=window._vyContentPrefix, type=document.getElementById("vyContentType").value;
  const title=document.getElementById("vyContentTitle").value.trim();
  if(!title)return toast("Enter a content title");
  const hidden=document.getElementById(prefix+"ContentData"); if(!hidden)return;
  let items=[];try{items=JSON.parse(hidden.value||"[]")}catch(e){}
  const item={id:"CNT"+Date.now()+Math.random().toString(36).slice(2,7),type,title};
  if(type==="github" || type==="quiz"){
    item.url=(document.getElementById("vyContentUrl")||{}).value?.trim()||"";
    if(type==="quiz" && !item.url) item.url="";
  }else{
    const file=document.getElementById("vyContentFile")?.files?.[0];
    if(type==="pdf" && !file)return toast("Choose a PDF file");
    if(type==="lesson" && !file)return toast("Choose a lesson video file");
    if(file){
      if(file.size > 100*1024*1024) return toast("Please keep uploaded video files under 100 MB");
      item.fileName=file.name; item.fileType=file.type; item.fileSize=file.size;
      item.fileKey="FILE"+Date.now()+Math.random().toString(36).slice(2,8);
      try{await putFile(item.fileKey,file)}catch(e){console.error(e);return toast("Could not store the uploaded file. Please try again.")}
    }
  }
  items.push(item); hidden.value=JSON.stringify(items);
  document.getElementById(prefix+"ContentList").innerHTML=items.map((x,i)=>contentRow(x,i,prefix)).join("");
  closeContentModal(); toast("Content added");
}
function removeContent(prefix,i){
  const hidden=document.getElementById(prefix+"ContentData");
  let items=[];try{items=JSON.parse(hidden.value||"[]")}catch(e){}
  items.splice(i,1);hidden.value=JSON.stringify(items);
  document.getElementById(prefix+"ContentList").innerHTML=items.length?items.map((x,j)=>contentRow(x,j,prefix)).join(""):`<div class="muted" style="padding:14px 0">No content added yet.</div>`;
}

function newCourse(){if(!logged())return login();return `<main class="container page"><div class="panel" style="max-width:760px;margin:auto"><button class="btn ghost" onclick="go('admin')">← ${isFounder()?"Admin":"Teacher Portal"}</button><h2 style="margin-top:20px">Create Course</h2><div class="field"><label>Course title</label><input id="ct" placeholder="e.g. Robotics Foundations"></div><div class="field"><label>Category</label><select id="cc"><option>Robotics</option><option>Coding</option><option>Physics</option><option>Chemistry</option><option>Biology</option><option>Mathematics</option><option>Integrated STEM</option></select></div><div class="field"><label>Price (₹)</label><input id="cp" type="number" min="0" placeholder="2499"></div><div class="field"><label>Description</label><textarea id="cd" placeholder="What will students learn?"></textarea></div><input type="hidden" id="newContentData" value="[]">${courseContentUI([],"new")}<button class="btn gold" onclick="create()">Publish Course</button></div></main>`}
function editCourse(id){if(!logged())return login();let c=S.courses.find(x=>x.id===id);if(!c)return toast("Course not found");if(isTeacher() && c.createdBy!==S.session.id)return toast("You can only edit your own courses");return go("edit:"+id)}
function editCoursePage(id){if(!logged())return login();let c=S.courses.find(x=>x.id===id);if(!c)return admin();if(isTeacher() && c.createdBy!==S.session.id)return admin();return `<main class="container page"><div class="panel" style="max-width:760px;margin:auto"><button class="btn ghost" onclick="go('admin')">← Admin</button><h2 style="margin-top:20px">Edit Course</h2><div class="field"><label>Course title</label><input id="ect" value="${esc(c.title)}"></div><div class="field"><label>Category</label><select id="ecc">${["Robotics","Coding","Physics","Chemistry","Biology","Mathematics","Integrated STEM"].map(x=>`<option ${x===c.category?"selected":""}>${x}</option>`).join("")}</select></div><div class="field"><label>Price (₹)</label><input id="ecp" type="number" min="0" value="${Number(c.price)||0}"></div><div class="field"><label>Description</label><textarea id="ecd">${esc(c.description||"")}</textarea></div><input type="hidden" id="editContentData" value="${esc(JSON.stringify(c.content||[]))}">${courseContentUI(c.content||[],"edit")}<div style="display:flex;gap:10px"><button class="btn gold" onclick="saveCourse('${id}')">Save Changes</button><button class="btn ghost" onclick="go('admin')">Cancel</button></div></div></main>`}
async function saveCourse(id){let c=S.courses.find(x=>x.id===id);if(!c)return toast("Course not found");if(isTeacher() && c.createdBy!==S.session.id)return toast("You can only save your own courses");let title=document.getElementById("ect").value.trim();if(!title)return toast("Enter a title");try{c.title=title;c.category=document.getElementById("ecc").value;c.price=+document.getElementById("ecp").value||0;c.description=document.getElementById("ecd").value.trim()||"VigyanYantra course.";c.content=JSON.parse(document.getElementById("editContentData").value||"[]");c.content.forEach((x,i)=>{x.id=x.id||`CNT${c.id}-${i}`;delete x.dataUrl});save();toast("Course updated");go("admin")}catch(e){console.error(e);toast("Could not save changes. Please try again.")}}
async function create(){if(!logged())return login();let title=document.getElementById("ct").value.trim();if(!title)return toast("Enter a title");try{const id="CRS"+Date.now();const content=JSON.parse(document.getElementById("newContentData").value||"[]").map((x,i)=>({...x,id:x.id||`CNT${id}-${i}`}));content.forEach(x=>delete x.dataUrl);S.courses.push({id,title,category:document.getElementById("cc").value,price:+document.getElementById("cp").value||0,description:document.getElementById("cd").value.trim()||"VigyanYantra course.",content,createdBy:currentStaffId(),createdByName:S.session.name||F.name});save();toast("Course published successfully");go("admin")}catch(e){console.error(e);toast("Could not publish course. Please try again.")}}
function del(id){const c=S.courses.find(x=>x.id===id);if(!c)return toast("Course not found");if(isTeacher() && c.createdBy!==S.session.id)return toast("You can only delete your own courses");if(confirm("Delete this course?")){S.courses=S.courses.filter(c=>c.id!==id);save();go("admin")}}
function teacher(){if(!logged() || !isFounder())return admin();return `<main class="container page"><div class="panel" style="max-width:650px;margin:auto"><button class="btn ghost" onclick="go('admin')">← Admin</button><h2 style="margin-top:20px">Create Teacher ID</h2><p class="muted">Example: TC0001. Production will require secure password/SSO authentication.</p><div class="field"><label>Teacher ID</label><input id="tid" placeholder="TC0001"></div><div class="field"><label>Teacher name</label><input id="tn" placeholder="Full name"></div><div class="field"><label>Role</label><select id="tr"><option>Teacher</option><option>Senior Teacher</option><option>Course Instructor</option></select></div><button class="btn gold" onclick="addTeacher()">Create Staff ID</button></div></main>`}
function addTeacher(){let id=document.getElementById("tid").value.trim().toUpperCase(),name=document.getElementById("tn").value.trim();if(!id||!name)return toast("Enter ID and name");if(id===F.id||S.teachers.some(x=>x.id===id))return toast("ID already exists");S.teachers.push({id,name,role:document.getElementById("tr").value,password:""});save();go("admin")}

function studentEnroll(){
  const courses=S.courses||[];
  return `<main class="container page">
    <div class="panel" style="max-width:1100px;margin:auto">
      <button class="btn ghost" onclick="go('student')">← Student Portal</button>
      <h2 style="margin-top:20px">Enroll Courses</h2>
      <p class="muted">Browse every course published on VigyanYantra and enroll to access its content.</p>
      <div class="course-grid" style="margin-top:20px">
        ${courses.length?courses.map(c=>{
          const enrolled=(S.currentStudent?.enrollments||[]).includes(c.id);
          return `<article class="panel" style="padding:18px">
            <h3>${esc(c.title)}</h3>
            <div class="muted">${esc(c.category||"Course")} · ₹${Number(c.price)||0}</div>
            <p>${esc(c.description||"VigyanYantra course.")}</p>
            <button class="btn ${enrolled?"ghost":"gold"}" onclick="${enrolled?`viewStudentCourse('${c.id}')`:`enrollCourse('${c.id}')`}">${enrolled?"View Course":"Enroll Course"}</button>
          </article>`
        }).join(""):`<div class="panel"><strong>No courses available yet.</strong><div class="muted">Courses created by the Founder/Staff will appear here.</div></div>`}
      </div>
    </div>
  </main>`
}
function studentRecord(){
  if(!S.currentStudent)return null;
  const id=S.currentStudent.id;
  let a=JSON.parse(localStorage.getItem("vigyanyantra_students_v1")||"[]");
  let st=a.find(x=>x.id===id);
  if(!st){st=S.currentStudent;a.push(st)}
  st.enrollments=st.enrollments||[];
  st.progress=st.progress||{};
  S.currentStudent=st;
  S.students=S.students||[];
  const si=S.students.findIndex(x=>x.id===st.id);
  if(si>=0) S.students[si]=st; else S.students.push(st);
  localStorage.setItem("vigyanyantra_students_v1",JSON.stringify(a));
  save();
  return st;
}
function courseProgress(id){
  const st=studentRecord(); if(!st)return {completed:[],percent:0};
  st.progress=st.progress||{};
  const c=S.courses.find(x=>x.id===id), total=(c?.content||[]).length;
  const completed=Array.isArray(st.progress[id]?.completed)?st.progress[id].completed:[];
  const valid=completed.filter(cid=>(c?.content||[]).some(x=>x.id===cid));
  return {completed:valid,total,percent:total?Math.round(valid.length/total*100):0};
}
async function downloadContent(courseId,contentId){
  const c=S.courses.find(x=>x.id===courseId), x=(c?.content||[]).find(y=>y.id===contentId);
  if(!x)return toast("File not found");
  if(x.dataUrl){const a=document.createElement("a");a.href=x.dataUrl;a.download=x.fileName||x.title||"download";document.body.appendChild(a);a.click();a.remove();return}
  if(x.fileKey){try{const f=await getFile(x.fileKey);if(!f)return downloadUnavailable(courseId,contentId);const u=URL.createObjectURL(f);const a=document.createElement("a");a.href=u;a.download=x.fileName||x.title||"download";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);return}catch(e){console.error(e)}}
  downloadUnavailable(courseId,contentId);
}
function downloadUnavailable(courseId,contentId){
  const c=S.courses.find(x=>x.id===courseId), x=(c?.content||[]).find(y=>y.id===contentId);
  if(x?.fileName) toast("Download unavailable: the uploaded file is not stored in this browser session. Re-upload it in the course editor.");
  else toast("No downloadable file is attached to this resource yet.");
}
function markContentComplete(courseId,contentId){
  const st=studentRecord(); if(!st)return toast("Please log in as a student first");
  st.progress=st.progress||{};
  st.progress[courseId]=st.progress[courseId]||{completed:[],startedAt:new Date().toISOString()};
  const arr=st.progress[courseId].completed||[];
  if(!arr.includes(contentId))arr.push(contentId);
  st.progress[courseId].completed=arr;
  st.progress[courseId].lastActivityAt=new Date().toISOString();
  const c=S.courses.find(x=>x.id===courseId);
  if(c && arr.length >= (c.content||[]).length && c.content?.length) st.progress[courseId].completedAt=new Date().toISOString();
  const a=JSON.parse(localStorage.getItem("vigyanyantra_students_v1")||"[]");
  const idx=a.findIndex(x=>x.id===st.id); if(idx>=0)a[idx]=st; else a.push(st);
  localStorage.setItem("vigyanyantra_students_v1",JSON.stringify(a));
  S.currentStudent=st;
  S.students=S.students||[];
  const si=S.students.findIndex(x=>x.id===st.id);
  if(si>=0)S.students[si]=st; else S.students.push(st);
  save();
  go("student-course:"+courseId);
}
function enrollCourse(id){
  const c=S.courses.find(x=>x.id===id);
  if(!c)return toast("Course not found");
  const st=studentRecord();
  if(!st)return toast("Please log in as a student first");
  if(!st.enrollments.includes(id)){
    st.enrollments.push(id);
    st.progress=st.progress||{};
    st.progress[id]=st.progress[id]||{completed:[],startedAt:new Date().toISOString()};
    const a=JSON.parse(localStorage.getItem("vigyanyantra_students_v1")||"[]");
    const idx=a.findIndex(x=>x.id===st.id); if(idx>=0)a[idx]=st; else a.push(st);
    localStorage.setItem("vigyanyantra_students_v1",JSON.stringify(a));
    S.currentStudent=st;
    S.students=S.students||[];
    const si=S.students.findIndex(x=>x.id===st.id);
    if(si>=0)S.students[si]=st; else S.students.push(st);
    save();
  }
  toast("Enrolled in "+c.title+" — progress will be saved automatically");
  viewStudentCourse(id);
}
function viewStudentCourse(id){
  const c=S.courses.find(x=>x.id===id);
  if(!c)return toast("Course not found");
  const st=studentRecord();
  if(!st)return login();
  if(!(st.enrollments||[]).includes(id))return toast("Enroll in this course first");
  return go("student-course:"+id);
}
function safeUrl(u){
  try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:""}catch(e){return ""}
}
function studentCoursePage(id){
  const c=S.courses.find(x=>x.id===id);
  const st=studentRecord();
  if(!c)return studentEnroll();
  if(!st || !(st.enrollments||[]).includes(id))return studentEnroll();
  const labels={lesson:"Lesson",pdf:"PDF Resource",github:"GitHub Repository",quiz:"Quiz"};
  const items=c.content||[];
  const pr=courseProgress(id);
  return `<main class="container page">
    <div class="panel" style="max-width:1100px;margin:auto">
      <button class="btn ghost" onclick="go('student-enroll')">← Enroll Courses</button>
      <h2 style="margin-top:20px">${esc(c.title)}</h2>
      <p>${esc(c.description||"")}</p>
      <div style="margin:20px 0 6px"><div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;font-weight:800"><span>Course Progress</span><span>${pr.percent}% (${pr.completed.length}/${pr.total})</span></div><div style="height:10px;background:#1c293a;border-radius:999px;overflow:hidden;margin-top:8px"><div style="height:100%;width:${pr.percent}%;background:#d7ad55;border-radius:999px;transition:width .2s"></div></div></div>
      <div style="display:grid;gap:16px;margin-top:20px">
        ${items.length?items.map((x,i)=>{
          x.id=x.id||`CNT${id}-${i}`;
          const url=safeUrl(x.url), done=pr.completed.includes(x.id);
          let body="";
          if(x.type==="lesson" && x.dataUrl){body=`<div style="margin-top:12px"><video controls preload="metadata" style="width:100%;max-height:520px;border-radius:12px;background:#111" src="${x.dataUrl}" onended="markContentComplete('${id}','${x.id}')"></video></div>`;}
          else if(x.type==="pdf" && x.dataUrl){body=`<div style="margin-top:12px"><iframe title="${esc(x.title)}" src="${x.dataUrl}" style="width:100%;height:650px;border:1px solid #ddd;border-radius:12px;background:#fff"></iframe><div style="margin-top:8px"><a class="btn ghost" href="${x.dataUrl}" target="_blank" rel="noopener">Open PDF in New Tab</a></div></div>`;}
          else if(x.type==="github" && url){body=`<div style="margin-top:10px"><a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener" onclick="markContentComplete('${id}','${x.id}')">🔗 Open GitHub Repository</a></div>`;}
          else if(x.type==="quiz" && url){body=`<div style="margin-top:10px"><a class="btn gold" href="${esc(url)}" target="_blank" rel="noopener" onclick="markContentComplete('${id}','${x.id}')">📝 Open Google Form Quiz</a></div>`;}
          else if(x.fileName){body=`<div class="muted" style="margin-top:8px">📎 ${esc(x.fileName)} — file is not available in this browser session.</div>`;}
          else if(x.type==="github" || x.type==="quiz"){body=`<div class="muted" style="margin-top:8px">No link has been added yet.</div>`;}
          // PDFs are downloadable; lesson videos are intentionally view-only.
          const downloadBtn=x.type==="pdf"?(x.dataUrl||x.fileKey
            ?`<button class="btn gold" type="button" onclick="downloadContent('${id}','${x.id}')">⬇ Download File</button>`
            :`<button class="btn gold" type="button" onclick="downloadUnavailable('${id}','${x.id}')">⬇ Download File</button>`):"";
          const completeBtn=`<button class="btn ${done?"ghost":"gold"}" type="button" onclick="markContentComplete('${id}','${x.id}')" ${done?"disabled":""}>${done?"✓ Completed":"Mark as Complete"}</button>`;
          return `<div class="panel" style="padding:16px"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px"><div style="min-width:0"><strong>${labels[x.type]||"Course Content"} ${i+1}</strong><div style="font-size:17px;margin-top:4px">${esc(x.title||"Untitled")}</div>${x.fileName?`<div class="muted" style="font-size:12px;margin-top:4px">📎 ${esc(x.fileName)}</div>`:""}</div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">${downloadBtn}${completeBtn}</div></div>${body}${x.fileName&&!x.dataUrl&&(x.type==="pdf"||x.type==="lesson")?`<div class="muted" style="margin-top:10px;font-size:12px">This uploaded file is not available in this browser session. Re-upload it from the course editor to enable downloading.</div>`:""}</div>`;
        }).join(""):`<div class="panel"><strong>Content coming soon.</strong><div class="muted">The instructor has not added content to this course yet.</div></div>`}
      </div>
    </div>
  </main>`
}

function go(r){R=r;render()}
async function render(){let id=R.startsWith("student-course:")?R.slice(15):null;if(id){const c=S.courses.find(x=>x.id===id);if(c)await hydrateCourseFiles(c)}let x=R==="home"?home():R==="courses"?courses():R==="login"?login():R==="admin"?admin():R==="new"?newCourse():R==="teacher"?teacher():R==="student-enroll"?studentEnroll():R.startsWith("student-course:")?studentCoursePage(R.slice(15)):R.startsWith("edit:")?editCoursePage(R.slice(5)):home();shell(x)}
render();
