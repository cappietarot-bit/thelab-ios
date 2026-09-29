/* The Lab / Nocturne — presentation layer.
 * core.js is an unchanged extraction of the supplied app. Its state, storage,
 * dose math, schedules, guides, timers, and native integrations remain in use.
 * New controls delegate to those existing functions; no demo data is installed.
 */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shapes = {
    home:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
    workout:'<path d="M3 9v6m3-9v12m12-12v12m3-9v6M6 12h12"/>',
    syringe:'<path d="m15 3 6 6m-4-4L5 17l2 2L19 7M4 20l-2 2m2-7 5 5m1-13 7 7m-7-3 2 2m1-5 2 2"/>',
    food:'<path d="M5 3v6c0 3 4 3 4 0V3M7 3v18M19 21V3c-4 2-5 9 0 10"/>',
    check:'<path d="m5 12 4 4 10-10"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    back:'<path d="m15 5-7 7 7 7"/>',
    plus:'<path d="M12 4v16M4 12h16"/>',
    minus:'<path d="M5 12h14"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    site:'<path d="m8 3-1 7-3 11m12-18 1 7 3 11M7 10c3 2 7 2 10 0m-5 3v8"/>',
    coach:'<path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z"/>',
    vial:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 6v3l-3 3v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8l-3-3V6M6 14h12"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>'
  };
  const icon = (name, cls='') => `<svg class="lab-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.vial}</svg>`;
  const bar = (value, cls='') => `<span class="lab-bar ${cls}"><i style="width:${Math.max(0,Math.min(100,Number(value)||0))}%"></i></span>`;
  const mount = (tag, className, html) => { const n=document.createElement(tag);n.className=className;n.innerHTML=html;return n; };

  document.documentElement.classList.add('lab-nocturne');
  document.querySelector('.brand h1').textContent='THE LAB';
  const profile=document.getElementById('profileBtn');
  profile.innerHTML=icon('user');
  profile.setAttribute('aria-label','Open settings');
  const navNames={track:['home','Today'],guide:['syringe','Stack'],coach:['coach','Coach'],gym:['workout','Workout'],food:['food','Food']};
  document.querySelectorAll('#nav button').forEach(b=>{
    const [name,label]=navNames[b.dataset.tab];
    b.innerHTML=icon(name)+`<span>${label}</span>`;
    b.setAttribute('aria-label',label);
  });

  // Dashboard: retain the original week picker, quick log, insights and event handlers.
  const originalTrack=renderTrack;
  renderTrack=function(){
    originalTrack();
    const el=document.getElementById('v-track'),key=iso(selDay),log=S.log[key]||{};
    const due=activeTrack().filter(p=>dueOn(p,selDay));
    const logged=due.filter(p=>log[p.id]).length;
    const workout=workoutFor(key),exercises=workout?.exercises||[];
    const exComplete=exercises.filter(exDone).length;
    const allSets=exercises.flatMap(ensureSets),setComplete=allSets.filter(x=>x.done).length;
    const meals=S.meals.filter(m=>m.date===key),kcal=meals.reduce((n,m)=>n+(+m.kcal||0),0);
    // The ring represents scheduled compounds + exercises, not a health score.
    const total=due.length+exercises.length,done=logged+exComplete;
    const progress=total?Math.round(done/total*100):0;
    const dayline=el.querySelector('.dayline');
    dayline.querySelector('.dlbig').setAttribute('role','heading');
    dayline.querySelector('.dlbig').setAttribute('aria-level','2');
    dayline.querySelector('.dlsm').textContent=selDay.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
    const summary=mount('div','lab-summary',`
      <div class="lab-progress" role="img" aria-label="${total?progress+' percent of scheduled compounds and exercises complete':'No scheduled items'}">
        <svg viewBox="0 0 160 160" aria-hidden="true"><circle class="lab-ring-track" cx="80" cy="80" r="68"/><circle class="lab-ring-value" cx="80" cy="80" r="68" stroke-dasharray="${427.256*progress/100} 427.256"/></svg>
        <div><strong>${total?progress+'%':'—'}</strong><span>${total?'Complete':'No plan yet'}</span></div>
      </div>
      <div class="lab-metrics">
        <button data-lab-open="gym">${icon('workout')}<span>Workout<strong>${exercises.length?exComplete+' <small>/ '+exercises.length+' exercises</small>':'<small>No session</small>'}</strong></span></button>
        <button data-lab-open="guide">${icon('syringe')}<span>Peptides<strong>${logged} <small>/ ${due.length} logged</small></strong></span></button>
        <button data-lab-open="food">${icon('food')}<span>Food<strong>${Math.round(kcal)} <small>kcal</small></strong></span></button>
      </div><span class="lab-summary-note">Scheduled compounds + exercises</span>`);
    dayline.after(summary);
    summary.querySelectorAll('[data-lab-open]').forEach(b=>b.onclick=()=>setTab(b.dataset.labOpen));
    const stack=el.querySelector('.cardstack');
    const tiles=mount('div','lab-tiles','');
    const config=[['wcard','workout','Workout',allSets.length?100*setComplete/allSets.length:0,workout?(ROUTINES[workout.routine]?.n||'Your session'):'Choose a session'],
      ['pcard','syringe','Peptides',due.length?100*logged/due.length:0,due.length?`${logged} of ${due.length} logged`:'View your stack'],
      ['fcard','food','Food',S.macros.kcal?100*kcal/S.macros.kcal:0,`${Math.round(kcal).toLocaleString()} kcal · ${meals.length} ${meals.length===1?'item':'items'}`]];
    for(const [cls,ico,title,pct,subtitle] of config){
      const tile=stack.querySelector('.'+cls),action=tile.querySelector('.bcgo');
      tile.className='lab-tile lab-'+cls;
      // Move the existing action, preserving its original handler.
      action.className='lab-tile-action';
      action.innerHTML=`<span class="lab-tile-symbol">${icon(ico)}</span><span class="lab-tile-label"><strong>${title}</strong><span>${esc(subtitle)}</span>${bar(pct)}</span>${icon('chevron','lab-tile-chevron')}`;
      action.setAttribute('aria-label',title==='Workout'?(workout?'Open workout':'Choose a workout'):title==='Peptides'?'Open my stack':'Open food log');
      tile.replaceChildren(action);tiles.append(tile);
    }
    stack.prepend(tiles);
    const calendar=mount('details','lab-day-planner','<summary>'+icon('calendar')+'<span>Your week</span>'+icon('chevron')+'</summary>');
    calendar.append(el.querySelector('.weekbar'),el.querySelector('.goalwrap'));
    const shots=stack.querySelector('.shotcard');
    if(shots){
      const quick=mount('details','lab-quick-log','<summary>'+icon('syringe')+'<span>Quick log</span><small>'+logged+' / '+due.length+'</small>'+icon('chevron')+'</summary>');
      quick.append(shots);tiles.after(quick);quick.after(calendar);
    }else tiles.after(calendar);
  };

  // Stack: decorate the real cards; expanded guides, stock, edit, and stats survive.
  let stackFilter='today';
  const originalGuide=renderGuide;
  renderGuide=function(){
    originalGuide();
    const el=document.getElementById('v-guide'),key=iso(new Date()),log=S.log[key]||{};
    const head=el.querySelector('.vhead');head.querySelector('h2').textContent='My Stack';
    const tabs=mount('div','lab-stack-tabs','');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Filter compounds');
    [['today','Today'],['week','This Week'],['all','All Compounds']].forEach(([value,label])=>{
      const b=mount('button',stackFilter===value?'on':'',label);b.setAttribute('aria-pressed',stackFilter===value?'true':'false');
      b.dataset.stackFilter=value;b.onclick=()=>{stackFilter=value;renderGuide();};tabs.append(b);
    });
    head.after(tabs);
    const week=weekStart(new Date());
    let visible=0;
    el.querySelectorAll('.gcard').forEach(card=>{
      const header=card.querySelector('[data-g]'),p=pById(header.dataset.g);if(!p)return;
      const today=dueOn(p,new Date()),taken=!!log[p.id],off=p.status==='off';
      const included=stackFilter==='all'||(stackFilter==='today'?today:Array.from({length:7},(_,i)=>new Date(+week+i*DAY)).some(d=>dueOn(p,d)));
      card.hidden=!included;if(!included)return;visible++;
      card.classList.add('lab-compound');
      header.prepend(mount('span','lab-compound-icon',icon(p.label?'vial':'syringe')));
      const text=card.querySelector('.gt2');
      const site=log[p.id]?.site,siteLabel=site&&SITEBY[site]?SITEBY[site].n:null;
      text.innerHTML=`<span class="gname">${esc(p.name)}</span><span class="lab-compound-dose">${esc(doseLabel(p))}</span><span class="lab-compound-meta">${icon('calendar')}${esc(schedLabel(p))}</span>${siteLabel?`<span class="lab-compound-meta">${icon('site')}${esc(siteLabel)}</span>`:p.timing?`<span class="lab-compound-meta lab-timing">${esc(p.timing)}</span>`:''}`;
      header.setAttribute('aria-expanded',card.classList.contains('open')?'true':'false');
      header.setAttribute('aria-label','Details for '+p.name);
      const status=mount('button','lab-dose-status'+(taken?' taken':''),`<span class="lab-status-circle">${taken?icon('check'):''}</span><strong>${off?'Paused':taken?'Taken':today?'Due':'Later'}</strong>${today&&!taken?`<small>${p.time==='pm'?'PM':'AM'}</small>`:''}`);
      status.setAttribute('aria-label',taken?'Undo today’s log for '+p.name:today?'Log '+p.name+' for today':off?p.name+' is paused':p.name+' is not due today');
      status.disabled=off||(!today&&!taken);
      status.onclick=()=>{toggleDay2(p.id,key,true);renderGuide();};
      card.append(status);
    });
    // Band headers used by the old list are replaced by the three filter tabs.
    el.querySelectorAll('.pband,.duehead').forEach(n=>n.remove());
    if(!visible){
      el.querySelector('.empty-note')?.remove();
      el.append(mount('div','lab-empty',`${icon('vial')}<h3>${stackFilter==='today'?'Nothing scheduled today':stackFilter==='week'?'Nothing scheduled this week':'Your stack starts here'}</h3><p>${stackFilter==='all'?'Add a compound to track your own schedule.':'Your full list is available under All Compounds.'}</p>`));
    }
    const add=mount('button','lab-add-compound',icon('plus')+'Add Compound');add.id='labAddCompound';add.onclick=openAdd;
    el.append(add);
    const disc=el.querySelector('#discBtn');if(disc)el.append(disc);
  };

  // Session overview retains the existing actions, history and recovery panels.
  const originalDayWorkout=dayWorkout;
  dayWorkout=function(el,key){
    originalDayWorkout(el,key);
    const w=workoutFor(key);
    if(w){
      el.querySelectorAll('.exc').forEach((n,i)=>{
        const sets=ensureSets(w.exercises[i]),complete=sets.filter(s=>s.done).length;
        n.querySelector('.excthumb').insertAdjacentHTML('afterbegin',icon('workout','lab-exercise-glyph'));
        n.querySelector('.excbody').insertAdjacentHTML('beforeend',bar(sets.length?100*complete/sets.length:0));
      });
    }
  };
  const originalGym=renderGym;
  renderGym=function(){
    originalGym();
    document.querySelector('#v-gym .vhead h2').textContent='Workout';
  };

  // Focused set entry: the original PL session, rest timer, saving and logSet()
  // remain authoritative. Only their view is replaced with the reference layout.
  drawPlayer=function(){
    const el=document.getElementById('player');
    if(!PL){el.classList.remove('on');return;}
    const w=PL.w,completed=w.exercises.filter(exDone).length,title=ROUTINES[w.routine]?.n||'Workout';
    el.innerHTML=`<div class="lab-session">
      <div class="lab-session-brand"><span>THE LAB</span><div class="lab-session-time">${icon('workout')}<span id="plElapsed">${fmtClock(PL.elapsed)}</span></div></div>
      <div class="lab-session-heading"><button class="lab-back" id="plClose" aria-label="Leave workout and save progress">${icon('back')}</button><h2>${esc(title)}</h2><div class="lab-session-progress"><span>${completed} <small>/ ${w.exercises.length}</small></span>${bar(w.exercises.length?100*completed/w.exercises.length:0)}</div></div>
      <div class="lab-session-list">${w.exercises.map((e,index)=>{
        const sets=ensureSets(e),n=sets.filter(s=>s.done).length,next=sets.findIndex(s=>!s.done),open=index===PL.i;
        return `<section class="lab-exercise${open?' expanded':''}${exDone(e)?' complete':''}">
          <button class="lab-exercise-head" data-lab-jump="${index}" aria-expanded="${open}"><span class="lab-compound-icon">${icon('workout')}</span><span class="lab-exercise-name"><strong>${esc(e.n)}</strong><span class="lab-exercise-progress">${bar(sets.length?100*n/sets.length:0)}<small>${n} / ${sets.length} sets</small></span></span>${icon('chevron','lab-exercise-chevron')}</button>
          ${open?`<div class="lab-set-table"><div class="lab-set-labels"><span>#</span><span>Weight (lb)</span><span>Reps</span><span class="lab-sr-only">Status</span></div>
            ${sets.map((s,i)=>`<div class="lab-set-row${s.done?' done':''}${i===next?' current':''}"><span class="lab-set-number">${i+1}${s.warm?'<small>Warm</small>':''}</span><input type="number" inputmode="decimal" step="any" min="0" data-lab-field="w" data-lab-set="${i}" value="${s.w}" aria-label="Set ${i+1} weight in pounds"><div class="lab-reps"><button data-lab-step="-1" data-lab-set="${i}" aria-label="Decrease set ${i+1} reps">−</button><input type="number" inputmode="numeric" min="0" data-lab-field="r" data-lab-set="${i}" value="${s.r}" aria-label="Set ${i+1} repetitions"><button data-lab-step="1" data-lab-set="${i}" aria-label="Increase set ${i+1} reps">+</button></div><button class="lab-log-set" data-lab-log="${i}" ${s.done||i!==next||PL.resting?'disabled':''} aria-label="${s.done?'Set '+(i+1)+' complete':'Log set '+(i+1)}">${s.done?icon('check'):''}</button></div>`).join('')}
            <button class="lab-add-set" id="labAddSet">${icon('plus')}Add Set</button>
            <div class="lab-exercise-tools"><button id="plInfo">${icon('info')}Exercise guide</button><button id="plSwap">Swap exercise</button></div>
          </div>`:''}</section>`;
      }).join('')}</div>
      <div class="lab-session-footer">${PL.resting?`<button class="lab-rest-adjust" id="labRestAdd">+20s</button><div class="lab-rest-clock"><span>${PL.left<=0?'Ready':'Rest'}</span><strong>${fmtClock(PL.left)}</strong></div><button class="lab-rest-skip" id="plSkip">${PL.left<=0?'Next set':'Skip rest'}</button>`:`<button class="lab-log-primary" id="plLog">${icon('check')}Log set &amp; rest</button>`}</div>
    </div>`;
    el.classList.add('on');
    document.getElementById('plClose').onclick=endPlayer;
    el.querySelectorAll('[data-lab-jump]').forEach(b=>b.onclick=()=>{if(+b.dataset.labJump!==PL.i)jumpTo(+b.dataset.labJump);});
    const e=w.exercises[PL.i],sets=ensureSets(e);
    el.querySelectorAll('[data-lab-field]').forEach(input=>input.onchange=()=>{
      const i=+input.dataset.labSet,f=input.dataset.labField;
      sets[i][f]=parseFloat(input.value)||0;
      if(sets[i].warm&&f==='w')delete sets[i].warm;
      save();
    });
    el.querySelectorAll('[data-lab-step]').forEach(b=>b.onclick=()=>{
      const i=+b.dataset.labSet;sets[i].r=Math.max(0,(+sets[i].r||0)+(+b.dataset.labStep));save();
      el.querySelector(`[data-lab-field="r"][data-lab-set="${i}"]`).value=sets[i].r;
    });
    el.querySelectorAll('[data-lab-log]').forEach(b=>b.onclick=logSet);
    document.getElementById('labAddSet').onclick=()=>{
      const last=sets[sets.length-1]||{r:e.r||0,w:e.w||0};
      sets.push({r:last.r,w:last.w,done:false});e.s=sets.length;markExercise(e,false);save();drawPlayer();
    };
    document.getElementById('plInfo').onclick=()=>exInfoPop(e.n);
    document.getElementById('plSwap').onclick=()=>swapPop(w,PL.i,PL.key,()=>{stopRest();drawPlayer();});
    if(PL.resting){
      document.getElementById('plSkip').onclick=()=>{stopRest();drawPlayer();};
      document.getElementById('labRestAdd').onclick=()=>{PL.left+=20;PL.total+=20;PL.fired=false;clearAlert();drawPlayer();};
    }else document.getElementById('plLog').onclick=logSet;
    applyLang();
  };

  // An accessible close affordance for sheets, without bypassing the existing gate.
  const sheetObserver=new MutationObserver(()=>{
    const sheet=document.getElementById('sheet');
    if(sheet.querySelector('.lab-sheet-close')||gateUp)return;
    const b=mount('button','lab-sheet-close','×');b.setAttribute('aria-label','Close dialog');
    b.onclick=closeModal;sheet.prepend(b);
  });
  sheetObserver.observe(document.getElementById('sheet'),{childList:true});
  const originalClose=closeModal;
  closeModal=function(){originalClose();if(tab==='guide')renderGuide();};

  // Backgrounds in the supplied app referenced files absent from its IPA.
  // All new imagery is local; a neutral CSS surface works without any photo.
  setBg=function(t){document.documentElement.dataset.labView=t;};
  const originalSetTab=setTab;
  setTab=function(t){
    originalSetTab(t);
    document.querySelectorAll('#nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===t?'page':'false'));
  };
  renderTrack();setBg(tab);
  document.querySelector('#nav [data-tab="track"]').setAttribute('aria-current','page');
})();
