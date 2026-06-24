/* ============================================
   MAPHAKE AUTOMATION — SHARED SCRIPT
   Handles: loader, cursor, background animation,
   scroll reveal, nav, FAQ, AI widget, form validation
   ============================================ */

/* ============================================
   >>> CONFIG: PASTE YOUR CLOUDFLARE WORKER URL HERE <<<
   ============================================
   After you deploy worker.js to Cloudflare (see SECURITY.md),
   replace the placeholder below with your live Worker URL.
   It will look like: https://maphake-ai.YOURNAME.workers.dev
   NO API KEY GOES HERE. The key lives inside the Worker only.
*/
const WORKER_URL = "https://maphake-ai.mphomosa2004.workers.dev";
/* ============================================ */

/* ---------- INPUT SANITIZATION HELPERS ---------- */
// Escape HTML so user text can never inject markup/script (XSS / HTML injection)
function escapeHTML(str){
  if(typeof str !== 'string') return '';
  return str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
// Strip control characters and trim; cap length to prevent abuse
function cleanInput(str,maxLen){
  if(typeof str !== 'string') return '';
  let s = str.replace(/[\u0000-\u001F\u007F]/g,'').trim();
  if(maxLen && s.length > maxLen) s = s.slice(0,maxLen);
  return s;
}
// Basic email shape validation
function isValidEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
// Phone: digits, spaces, +, -, (), 7-20 chars
function isValidPhone(phone){
  if(!phone) return true; // optional
  return /^[\d\s+\-()]{7,20}$/.test(phone);
}

/* ---------- PAGE LOADER ---------- */
window.addEventListener('load',()=>{
  const loader = document.getElementById('loader');
  if(!loader){ initEverything(); return; }
  setTimeout(()=>{
    loader.classList.add('hide');
    setTimeout(()=>{ loader.style.display='none'; },500);
    initEverything();
  },1500);
});

function initEverything(){
  initScrollReveal();
  initCounters();
}

/* ---------- CURSOR + TRAIL (desktop only) ---------- */
(function(){
  if(window.matchMedia('(pointer: coarse)').matches) return; // skip on touch
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  if(!cursor || !ring) return;
  document.addEventListener('mousemove',e=>{
    const x=e.clientX,y=e.clientY;
    cursor.style.left=x+'px';cursor.style.top=y+'px';
    ring.style.left=x+'px';ring.style.top=y+'px';
    const dot=document.createElement('div');
    dot.className='trail-dot';
    dot.style.left=x+'px';dot.style.top=y+'px';
    document.body.appendChild(dot);
    requestAnimationFrame(()=>{dot.style.transition='opacity .5s,transform .5s';dot.style.opacity='0';dot.style.transform='translate(-50%,-50%) scale(0.3)';});
    setTimeout(()=>{dot.remove();},520);
  });
  document.querySelectorAll('a,button,.ai-chip,input,textarea,select').forEach(el=>{
    el.addEventListener('mouseenter',()=>{cursor.style.width='18px';cursor.style.height='18px';});
    el.addEventListener('mouseleave',()=>{cursor.style.width='10px';cursor.style.height='10px';});
  });
})();

/* ---------- GLOBAL ANIMATED BACKGROUND ---------- */
(function(){
  const canvas = document.getElementById('bg-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles=[], w, h;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize(){ w=canvas.width=window.innerWidth; h=canvas.height=window.innerHeight; }
  resize();
  window.addEventListener('resize',resize);

  const COUNT = window.innerWidth < 768 ? 45 : 90;
  for(let i=0;i<COUNT;i++){
    particles.push({
      x:Math.random()*w, y:Math.random()*h,
      vx:(Math.random()-0.5)*0.5, vy:(Math.random()-0.5)*0.5,
      size:Math.random()*2.2+0.6,
      opacity:Math.random()*0.5+0.15,
      pulse:Math.random()*Math.PI*2
    });
  }

  function draw(){
    ctx.clearRect(0,0,w,h);
    for(let i=0;i<particles.length;i++){
      const p=particles[i];
      p.x+=p.vx; p.y+=p.vy; p.pulse+=0.02;
      if(p.x<0)p.x=w; if(p.x>w)p.x=0;
      if(p.y<0)p.y=h; if(p.y>h)p.y=0;
      const op = p.opacity*(0.6+0.4*Math.sin(p.pulse));
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
      ctx.fillStyle='rgba(201,168,76,'+op+')';
      ctx.fill();
    }
    // connecting lines
    for(let i=0;i<particles.length;i++){
      for(let j=i+1;j<particles.length;j++){
        const dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<140){
          ctx.beginPath();
          ctx.moveTo(particles[i].x,particles[i].y);
          ctx.lineTo(particles[j].x,particles[j].y);
          ctx.strokeStyle='rgba(201,168,76,'+(0.10*(1-dist/140))+')';
          ctx.lineWidth=0.6;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  if(!reduced) draw();
  else { // draw a single static frame
    particles.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fillStyle='rgba(201,168,76,'+p.opacity+')';ctx.fill();});
  }
})();

/* ---------- SCROLL REVEAL ---------- */
function initScrollReveal(){
  const els = document.querySelectorAll('.reveal,.reveal-left,.reveal-right');
  if(!els.length) return;
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  },{threshold:0.12});
  els.forEach(el=>obs.observe(el));
}

/* ---------- COUNTER ANIMATION ---------- */
function initCounters(){
  const nums = document.querySelectorAll('.num[data-count]');
  if(!nums.length) return;
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const el=e.target;
        const target=parseInt(el.dataset.count);
        const suffix=el.dataset.suffix||'';
        let cur=0;
        const step=Math.max(1,Math.ceil(target/30));
        const t=setInterval(()=>{
          cur=Math.min(cur+step,target);
          el.textContent=cur+suffix;
          if(cur>=target)clearInterval(t);
        },45);
        obs.unobserve(el);
      }
    });
  },{threshold:0.5});
  nums.forEach(n=>obs.observe(n));
}

/* ---------- NAV ---------- */
function toggleMenu(){
  const l=document.getElementById('navLinks');
  if(l) l.classList.toggle('open');
}
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.nav-links a').forEach(a=>{
    a.addEventListener('click',()=>{
      const l=document.getElementById('navLinks');
      if(l) l.classList.remove('open');
    });
  });
});
window.addEventListener('scroll',()=>{
  const nav=document.getElementById('mainNav');
  if(nav) nav.style.height = window.scrollY>60 ? '60px' : '70px';
});

/* ---------- FAQ ACCORDION ---------- */
function toggleFaq(btn){
  const a=btn.nextElementSibling;
  const isOpen=a.classList.contains('open');
  document.querySelectorAll('.faq-a.open').forEach(x=>x.classList.remove('open'));
  document.querySelectorAll('.faq-q.open').forEach(x=>x.classList.remove('open'));
  if(!isOpen){ a.classList.add('open'); btn.classList.add('open'); }
}

/* ============================================
   AI CHAT WIDGET
   ============================================ */
const AI_SUGGESTIONS = [
  "What packages do you offer?",
  "How much is a website?",
  "How does the AI chatbot work?",
  "How long does it take?",
  "Do you do WhatsApp automation?"
];

let chatHistory = [];
let aiSending = false;
let lastSendTime = 0;
const AI_COOLDOWN_MS = 2500;      // client-side cooldown between messages
const AI_MAX_INPUT = 500;          // max characters per message
const AI_MAX_MESSAGES = 25;        // max messages per session (client guard)
let aiMessageCount = 0;

function toggleAI(){
  const box=document.getElementById('ai-box');
  const toggle=document.getElementById('ai-toggle');
  const bubble=document.getElementById('ai-prompt-bubble');
  if(!box) return;
  box.classList.toggle('open');
  const open = box.classList.contains('open');
  if(toggle) toggle.classList.toggle('active',open);
  if(open){
    if(bubble) bubble.style.display='none';
    setTimeout(()=>{const i=document.getElementById('ai-input');if(i)i.focus();},100);
    renderSuggestions();
  }
}

function closePromptBubble(e){
  if(e) e.stopPropagation();
  const bubble=document.getElementById('ai-prompt-bubble');
  if(bubble) bubble.style.display='none';
}

function renderSuggestions(){
  const wrap=document.getElementById('ai-suggestions');
  if(!wrap) return;
  if(aiMessageCount>0){ wrap.innerHTML=''; return; }
  wrap.innerHTML='';
  AI_SUGGESTIONS.forEach(q=>{
    const chip=document.createElement('button');
    chip.className='ai-chip';
    chip.type='button';
    chip.textContent=q;
    chip.onclick=()=>{ document.getElementById('ai-input').value=q; sendAI(); };
    wrap.appendChild(chip);
  });
}

function appendMsg(text,type){
  const msgs=document.getElementById('ai-messages');
  const div=document.createElement('div');
  div.className='ai-msg '+type;
  // SECURITY: always set via textContent (never innerHTML) so model/user
  // output can never inject HTML or scripts into the page.
  div.textContent=text;
  msgs.appendChild(div);
  msgs.scrollTop=msgs.scrollHeight;
  return div;
}

async function sendAI(){
  const input=document.getElementById('ai-input');
  const sendBtn=document.getElementById('ai-send');
  if(!input || aiSending) return;

  // --- client-side validation + sanitization ---
  let msg = cleanInput(input.value, AI_MAX_INPUT);
  if(!msg) return;

  // cooldown guard (anti-spam)
  const now=Date.now();
  if(now - lastSendTime < AI_COOLDOWN_MS){
    return; // silently ignore rapid-fire
  }
  // session message cap
  if(aiMessageCount >= AI_MAX_MESSAGES){
    appendMsg("You've reached the message limit for this session. Please WhatsApp us at 066 451 2823 to continue.",'bot');
    return;
  }

  lastSendTime=now;
  aiMessageCount++;
  input.value='';

  // clear suggestion chips after first message
  const wrap=document.getElementById('ai-suggestions');
  if(wrap) wrap.innerHTML='';

  appendMsg(msg,'user');
  chatHistory.push({role:'user',content:msg});

  aiSending=true;
  if(sendBtn) sendBtn.disabled=true;
  const typing=appendMsg('Typing…','bot typing');

  // If worker URL not configured yet, fail gracefully
  if(WORKER_URL === "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE" || !WORKER_URL){
    typing.remove();
    appendMsg("The AI assistant isn't connected yet. Please WhatsApp us at 066 451 2823 or email info@maphakeautomation.co.za and we'll help you right away.",'bot');
    aiSending=false;
    if(sendBtn) sendBtn.disabled=false;
    return;
  }

  try{
    const res=await fetch(WORKER_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ messages: chatHistory })
    });

    if(res.status===429){
      typing.remove();
      appendMsg("You're sending messages a little fast. Please wait a moment and try again.",'bot');
      aiSending=false; if(sendBtn) sendBtn.disabled=false;
      return;
    }
    if(!res.ok){
      throw new Error('Bad response');
    }

    const data=await res.json();
    // Worker returns { reply: "..." }
    const reply = (data && typeof data.reply==='string' && data.reply.trim())
      ? data.reply.trim()
      : "Sorry, I couldn't process that. Please WhatsApp us at 066 451 2823.";
    typing.remove();
    appendMsg(reply,'bot');
    chatHistory.push({role:'assistant',content:reply});
  }catch(err){
    typing.remove();
    // SECURITY: generic error, never expose internals
    appendMsg("Something went wrong on our side. Please try again, or WhatsApp us at 066 451 2823.",'bot');
  }finally{
    aiSending=false;
    if(sendBtn) sendBtn.disabled=false;
  }
}

function aiInputKey(e){ if(e.key==='Enter'){ e.preventDefault(); sendAI(); } }

/* ============================================
   CONTACT FORM — validate + sanitize, open WhatsApp
   ============================================ */
function handleFormSubmit(e){
  e.preventDefault();
  const nameEl=document.getElementById('cf-name');
  const emailEl=document.getElementById('cf-email');
  const phoneEl=document.getElementById('cf-phone');
  const bizEl=document.getElementById('cf-biz');
  const serviceEl=document.getElementById('cf-service');
  const msgEl=document.getElementById('cf-message');
  const status=document.getElementById('cf-status');

  // clear previous errors
  document.querySelectorAll('.field-error').forEach(el=>el.classList.remove('show'));

  const name=cleanInput(nameEl.value,80);
  const email=cleanInput(emailEl.value,120);
  const phone=cleanInput(phoneEl?phoneEl.value:'',20);
  const biz=cleanInput(bizEl?bizEl.value:'',80);
  const service=serviceEl?serviceEl.value:'';
  const message=cleanInput(msgEl?msgEl.value:'',1000);

  let valid=true;
  if(name.length<2){ showFieldError('err-name'); valid=false; }
  if(!isValidEmail(email)){ showFieldError('err-email'); valid=false; }
  if(!isValidPhone(phone)){ showFieldError('err-phone'); valid=false; }
  if(message.length<5){ showFieldError('err-message'); valid=false; }
  if(!valid) return;

  // Build WhatsApp message (values already cleaned of control chars)
  const waText = encodeURIComponent(
    "Hi Maphake Automation!\n\n"+
    "Name: "+name+"\n"+
    "Business: "+(biz||'-')+"\n"+
    "Email: "+email+"\n"+
    "Phone: "+(phone||'-')+"\n"+
    "Service: "+(service||'Not specified')+"\n"+
    "Message: "+message
  );
  window.open('https://wa.me/27664512823?text='+waText,'_blank','noopener');

  if(status){ status.style.display='block'; status.textContent='Opening WhatsApp with your details…'; }
}
function showFieldError(id){
  const el=document.getElementById(id);
  if(el) el.classList.add('show');
}
