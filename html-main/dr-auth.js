// Shared login for iwantadopaminerush games. Uses the same accounts as Shoot & Open
// (shooter_players table, same password hashing, same saved login in localStorage).
// Needs supabase-js loaded first. Exposes window.DR.
(function(){
  const SUPA_URL='https://zznsfdcpondfnacherxv.supabase.co';
  const SUPA_KEY='sb_publishable_P6Xw_9hNrt-1_sKE7SsN7w_nN7eum3I';
  const CREDS='shooter_creds';

  const DR=window.DR={sb:null,user:null};
  try{DR.sb=window.supabase.createClient(SUPA_URL,SUPA_KEY);}catch(e){console.warn('[DR] Supabase failed to init',e);}

  const listeners=[];
  DR.onChange=fn=>{listeners.push(fn); return fn;};
  const emit=()=>listeners.forEach(fn=>{try{fn(DR.user);}catch(e){console.error(e);}});

  DR.esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function hashPw(pass,user){
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pass+'::shooter::'+user.toLowerCase()));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function saveCreds(u,p){try{localStorage.setItem(CREDS,JSON.stringify({u,p}));}catch(_){}}

  // Returns an error message, or '' on success.
  async function auth(u,p,signup){
    if(!DR.sb) return 'Online features are unavailable right now.';
    u=String(u||'').trim().toLowerCase();
    if(!u||!p) return 'Enter a username and password.';
    if(signup&&!/^[a-z0-9_]{3,16}$/.test(u)) return 'Username: 3-16 letters, numbers or _.';
    try{
      const hash=await hashPw(p,u);
      if(signup){
        const {error}=await DR.sb.from('shooter_players').insert({username:u,password_hash:hash});
        if(error) return error.code==='23505'?'That username is taken.':'Could not create account: '+error.message;
      } else {
        const {data,error}=await DR.sb.from('shooter_players').select('username').eq('username',u).eq('password_hash',hash).maybeSingle();
        if(error) return 'Login failed: '+error.message;
        if(!data) return 'Wrong username or password.';
      }
    }catch(e){return 'Connection error. Try again.';}
    saveCreds(u,p); DR.user=u; emit(); return '';
  }
  DR.login=(u,p)=>auth(u,p,false);
  DR.signup=(u,p)=>auth(u,p,true);
  DR.logout=()=>{try{localStorage.removeItem(CREDS);}catch(_){} DR.user=null; emit();};

  // Log back in with the saved login, if any.
  DR.ready=(async()=>{
    let c=null; try{c=JSON.parse(localStorage.getItem(CREDS)||'null');}catch(_){}
    if(c&&c.u&&c.p&&DR.sb){
      const err=await DR.login(c.u,c.p);
      if(err&&/Wrong/.test(err)) try{localStorage.removeItem(CREDS);}catch(_){}
    }
    emit();
    return DR.user;
  })();

  // A small login / sign-up form rendered into el. Styling comes from the host page's .dr-* rules,
  // with sensible inline defaults.
  DR.loginForm=function(el){
    el.innerHTML=
      '<form class="dr-form" style="display:flex;flex-direction:column;gap:8px">'+
      '<input class="dr-in" name="u" placeholder="Username" autocomplete="username" maxlength="32" style="padding:8px;border-radius:6px;border:1px solid #888;font:inherit">'+
      '<input class="dr-in" name="p" type="password" placeholder="Password" autocomplete="current-password" style="padding:8px;border-radius:6px;border:1px solid #888;font:inherit">'+
      '<div style="display:flex;gap:8px"><button class="dr-btn dr-primary" name="login" type="submit" style="flex:1">Log in</button>'+
      '<button class="dr-btn" name="signup" type="button" style="flex:1">Sign up</button></div>'+
      '<p class="dr-err" style="margin:0;min-height:1.2em;color:#e33;font-size:13px"></p>'+
      '<p class="dr-hint" style="margin:0;font-size:12px;opacity:.7">Same account as Shoot &amp; Open.</p></form>';
    const f=el.querySelector('form'), err=f.querySelector('.dr-err');
    const go=async signup=>{
      err.textContent='Working\u2026';
      f.querySelectorAll('button').forEach(b=>b.disabled=true);
      const e=await (signup?DR.signup:DR.login)(f.u.value,f.p.value);
      f.querySelectorAll('button').forEach(b=>b.disabled=false);
      err.textContent=e;
    };
    f.onsubmit=e=>{e.preventDefault(); go(false);};
    f.signup.onclick=()=>go(true);
  };
})();
