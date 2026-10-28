var qe=Object.defineProperty;var ze=(k,v,I)=>v in k?qe(k,v,{enumerable:!0,configurable:!0,writable:!0,value:I}):k[v]=I;var g=(k,v,I)=>ze(k,typeof v!="symbol"?v+"":v,I);(function(){"use strict";const I="data-manhwa-voice-active",L="manhwa-voice-controller",n="mv-",P=new Map;let le=0;function me(t){if(t.dataset.mvId)return t.dataset.mvId;const e=`mv-img-${le++}`;return t.dataset.mvId=e,e}function H(t){return t.currentSrc||t.src||t.dataset.src||t.dataset.lazySrc||t.dataset.original||t.dataset.url||t.getAttribute("data-src")||t.getAttribute("data-lazy-src")||t.getAttribute("data-original")||t.getAttribute("data-url")||""}const fe=["header","nav","aside","footer",".header",".navbar",".sidebar",".footer",".recommend",".recommended",".poster",".poster--xs",".poster--sm",".poster--md",".card__poster-wrap",".hitem",".crow",".frow",".grow",".nrow",".ulrow",".ucoll",".fdrop",".modal",".dropdown","#comments",".comments",'[class*="comment"]','[class*="banner"]','[class*="ad-"]','[class*="ad_"]','[id*="ad-"]','[id*="ad_"]'].join(", "),be=[".rpage-main__inner",".rpage-swiper",".swiper-wrapper","#readerarea",".reading-content",".reader-container",".chapter-content",".entry-content","#chapter-view",".webtoon-view",".manga-reader",".comic-viewer","#viewer","#reader"].join(", ");function ye(t){try{if(t.closest(fe))return!0}catch{}return!1}function Se(){try{return document.querySelector(be)}catch{return null}}function N(){try{const t=document.querySelectorAll(".rpage-page, [data-page], .page-item, .chapter-page, .iv-image, .reading-content > div");if(t.length>0)return t.length}catch{}return 0}function q(t){if(ye(t))return!1;const e=Se(),i=!!t.closest(".rpage-page, [data-page], .page-item, .chapter-page, .iv-image");if(e&&!e.contains(t)&&!i)return!1;if(t.complete&&t.naturalWidth>0){const o=t.getBoundingClientRect();if(o.width<300&&t.naturalWidth<300||o.height<200&&t.naturalHeight<200)return!1}else{const o=t.getBoundingClientRect(),d=parseInt(t.getAttribute("width")||"0",10),S=parseInt(t.getAttribute("height")||"0",10);if(!((o.width>=300||d>=300)&&(o.height>=200||S>=200||o.height===0))&&!H(t)&&!i)return!1}const s=getComputedStyle(t);if(s.display==="none"||s.visibility==="hidden"||s.opacity==="0")return!1;const r=H(t).toLowerCase(),a=(t.alt||"").toLowerCase(),c=Array.from(t.classList).join(" ").toLowerCase();return!(t.naturalWidth>0&&(t.naturalWidth<=2||t.naturalHeight<=2)||["logo","avatar","icon","favicon","badge","emoji","sticker","ad-","banner-ad"].some(o=>c.includes(o)||a.includes(o)||r.includes(o)))}function z(t){if(!q(t))return null;const e=H(t);if(!e)return null;const i=me(t),s=P.get(i);if(s)return!s.url&&e&&(s.url=e),t.naturalWidth>0&&(s.naturalWidth=t.naturalWidth,s.naturalHeight=t.naturalHeight),s;const r={element:t,id:i,url:e,naturalWidth:t.naturalWidth||800,naturalHeight:t.naturalHeight||1200};return P.set(i,r),r}function xe(t){const e=l=>{if(q(l))if(l.complete&&l.naturalWidth>0){const o=z(l);o&&t(o)}else{l.addEventListener("load",()=>{if(q(l)){const d=z(l);d&&t(d)}},{once:!0});const o=z(l);o&&t(o)}},i=document.querySelectorAll("img");i.forEach(e);const s=new IntersectionObserver(l=>{for(const o of l)o.isIntersecting&&o.target instanceof HTMLImageElement&&e(o.target)},{rootMargin:"2000px"});i.forEach(l=>s.observe(l));const r=new IntersectionObserver(l=>{for(const o of l)if(o.isIntersecting&&o.target instanceof HTMLElement){const d=o.target.querySelector("img");d?e(d):window.dispatchEvent(new Event("scroll"))}},{rootMargin:"2000px"});document.querySelectorAll(".rpage-page, [data-page], .page-item, .chapter-page, .iv-image").forEach(l=>r.observe(l));const c=new MutationObserver(l=>{for(const o of l)o.type==="childList"?o.addedNodes.forEach(d=>{d instanceof HTMLImageElement?(s.observe(d),e(d)):d instanceof HTMLElement&&(d.matches&&d.matches(".rpage-page, [data-page], .page-item, .chapter-page, .iv-image")&&r.observe(d),d.querySelectorAll(".rpage-page, [data-page], .page-item, .chapter-page, .iv-image").forEach(b=>r.observe(b)),d.querySelectorAll("img").forEach(b=>{s.observe(b),e(b)}))}):o.type==="attributes"&&o.target instanceof HTMLImageElement&&e(o.target)});return c.observe(document.body,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["src","srcset","data-src","data-lazy-src","data-original","data-url"]}),()=>{c.disconnect(),s.disconnect(),r.disconnect()}}function we(t){var e;return(e=P.get(t))==null?void 0:e.element}function ve(){P.clear(),le=0}let x=null,h=null,O=!1,M=!1,A=!1,V=null,W=0,f={onPlay:()=>{},onPause:()=>{},onResume:()=>{},onStop:()=>{},onNext:()=>{},onPrevious:()=>{},onRepeat:()=>{},onSpeedChange:()=>{},onVoiceChange:()=>{},onAutoScrollToggle:()=>{},onSelectSegment:()=>{},onRequestPermissions:()=>{}};function Ie(){return`
    :host {
      all: initial;
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .${n}container {
      background: #151525;
      color: #e0e0e0;
      border: 1px solid #282845;
      border-radius: 12px;
      padding: 12px 14px;
      width: 330px;
      max-height: 540px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.55);
      font-size: 13px;
      line-height: 1.4;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }
    .${n}container.collapsed {
      width: auto;
      max-height: none;
      padding: 8px 12px;
    }
    .${n}header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .${n}title {
      font-weight: 600;
      font-size: 13px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
    }
    .${n}actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .${n}status {
      font-size: 11px;
      color: #8b8fa3;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .${n}status-playing { color: #4ade80; }
    .${n}status-paused { color: #fbbf24; }
    .${n}status-waiting { color: #38bdf8; }
    .${n}status-error { color: #f87171; }

    .${n}icon-btn {
      background: none;
      border: none;
      color: #8b8fa3;
      cursor: pointer;
      font-size: 13px;
      padding: 2px 5px;
      line-height: 1;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    .${n}icon-btn:hover {
      color: #fff;
      background: rgba(255,255,255,0.1);
    }

    .${n}playback-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: #1c1c32;
      padding: 6px;
      border-radius: 8px;
    }
    .${n}ctrl-btn {
      background: #282845;
      color: #fff;
      border: 1px solid #3d3d65;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: background 0.15s;
    }
    .${n}ctrl-btn:hover:not(:disabled) {
      background: #383860;
    }
    .${n}ctrl-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .${n}btn-play {
      background: #6c63ff;
      border-color: #7b73ff;
      min-width: 68px;
      font-weight: 600;
    }
    .${n}btn-play:hover:not(:disabled) {
      background: #7d75ff;
    }

    .${n}options-grid {
      display: grid;
      grid-template-columns: 75px 1fr;
      gap: 8px;
      font-size: 11px;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
    .${n}select-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      overflow: hidden;
    }
    .${n}select-label {
      color: #8888a0;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .${n}select {
      background: #1c1c32;
      color: #ddd;
      border: 1px solid #2e2e4e;
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 11px;
      outline: none;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }
    .${n}toggle-label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      color: #c0c0d5;
      font-size: 11px;
      user-select: none;
      margin-top: 2px;
    }

    .${n}transcript-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #7e7e9a;
      margin-top: 2px;
      padding: 0 2px;
    }
    .${n}text-area {
      background: #11111d;
      border: 1px solid #222238;
      border-radius: 6px;
      padding: 6px 8px;
      height: 140px;
      overflow-y: auto;
      font-size: 12px;
      color: #c0c0d0;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: height 0.2s ease;
    }
    .${n}text-area.expanded {
      height: 250px;
    }
    .${n}segment {
      padding: 4px 6px;
      border-radius: 4px;
      cursor: pointer;
      line-height: 1.35;
    }
    .${n}segment:hover {
      background: rgba(255,255,255,0.06);
    }
    .${n}segment-active {
      background: rgba(108, 99, 255, 0.28);
      border-left: 3px solid #6c63ff;
      color: #ffffff;
      font-weight: 500;
    }
    .${n}error-box {
      color: #fca5a5;
      font-size: 11px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 6px 8px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .${n}grant-btn {
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      align-self: flex-start;
    }
    .${n}grant-btn:hover {
      background: #6366f1;
    }

    .${n}meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #6e6e88;
    }
    .${n}progress {
      height: 3px;
      background: #222238;
      border-radius: 2px;
      overflow: hidden;
    }
    .${n}progress-bar {
      height: 100%;
      background: #6c63ff;
      transition: width 0.3s ease;
    }
  `}function $e(t){switch(t){case"idle":return"Ready";case"scanning":return"Scanning";case"ready":return"Ready";case"playing":return"Playing";case"paused":return"Paused";case"waiting":return"Waiting for panels...";case"stopped":return"Stopped";case"completed":return"Completed";case"error":return"Error";default:return"Ready"}}function $(t){if(!h)return;const e=h.querySelector(`.${n}container`);if(!e)return;const i=t.status==="playing",s=t.status==="paused",r=t.status==="waiting",a=t.totalSegments&&t.totalSegments>0||t.segments&&t.segments.length>0,c=$e(t.status);let l="";if(i?l=` ${n}status-playing`:s?l=` ${n}status-paused`:r?l=` ${n}status-waiting`:t.status==="error"&&(l=` ${n}status-error`),O){e.className=`${n}container collapsed`,e.innerHTML=`
      <div class="${n}header" style="gap: 12px;">
        <span class="${n}title" id="${n}uncollapse-title" title="Click to expand">
          <span>🎙️</span>
          <span class="${n}status${l}">${c}</span>
        </span>
        <div class="${n}actions">
          ${i?`
            <button class="${n}icon-btn" id="${n}mini-pause-btn" title="Pause">⏸</button>
          `:`
            <button class="${n}icon-btn" id="${n}mini-play-btn" ${a?"":"disabled"} title="Play">▶</button>
          `}
          <button class="${n}icon-btn" id="${n}expand-btn" title="Expand controller">⛶</button>
        </div>
      </div>
    `;const u=h.querySelector(`#${n}expand-btn`);u==null||u.addEventListener("click",()=>{O=!1,$(t)});const m=h.querySelector(`#${n}uncollapse-title`);m==null||m.addEventListener("click",()=>{O=!1,$(t)});const w=h.querySelector(`#${n}mini-play-btn`);w==null||w.addEventListener("click",()=>{s?f.onResume():f.onPlay()});const D=h.querySelector(`#${n}mini-pause-btn`);D==null||D.addEventListener("click",()=>f.onPause());return}e.className=`${n}container`;let o="";t.segments&&t.segments.length>0?o=t.segments.map((u,m)=>`<div class="${t.currentSegmentIndex===m?`${n}segment ${n}segment-active`:`${n}segment`}" data-index="${m}" title="Click to speak from here">${U(u)}</div>`).join(""):r?o='<div style="color:#38bdf8;padding:8px;font-style:italic;">Scanning upcoming pages... speech will resume automatically.</div>':t.isScanning?o=`<div style="color:#818cf8;padding:8px;">Scanning manhwa dialogue (panel ${(t.scannedImages||0)+1} of ${t.totalImages||"..."})</div>`:o='<div style="color:#666;padding:8px;">No dialogue detected yet.</div>';const d=(t.availableVoices||[]).map(u=>{const m=u.voiceURI===t.voiceURI?"selected":"";return`<option value="${U(u.voiceURI)}" ${m}>${U(u.name)} (${u.lang})</option>`}).join(""),S=[.7,.85,1,1.15,1.3,1.5],p=t.speed||1,b=S.map(u=>{const m=Math.abs(u-p)<.05?"selected":"";return`<option value="${u}" ${m}>${u}x</option>`}).join(""),y=typeof t.currentSegmentIndex=="number"&&t.totalSegments&&t.totalSegments>0?Math.min(t.currentSegmentIndex+1,t.totalSegments):0,T=t.totalSegments&&t.totalSegments>0?`Segment ${y} of ${t.totalSegments}`:"",He=typeof t.scannedImages=="number"&&t.totalImages?`${t.scannedImages} / ${t.totalImages} pages scanned`:"",Ne=t.error&&(t.error.includes("CORS")||t.error.includes("inaccessible")),pe=h.querySelector(`#${n}text-scroll`);pe&&(W=pe.scrollTop),e.innerHTML=`
    <div class="${n}header">
      <span class="${n}title">
        <span>🎙️</span>
        <span>Manhwa Voice</span>
      </span>
      <div class="${n}actions">
        <span class="${n}status${l}">${c}</span>
        <button class="${n}icon-btn" id="${n}collapse-btn" title="Minimize controller">_</button>
        <button class="${n}icon-btn" id="${n}hide-btn" title="Hide controller (playback continues)">✕</button>
      </div>
    </div>

    ${t.isScanning?`
      <div class="${n}progress" title="Scanning progress">
        <div class="${n}progress-bar" style="width: ${t.totalImages?Math.round((t.scannedImages||0)/t.totalImages*100):20}%"></div>
      </div>
    `:""}

    ${t.error?`
      <div class="${n}error-box">
        <span>${U(t.error)}</span>
        ${Ne?`
          <button class="${n}grant-btn" id="${n}allow-cdn-btn">Allow Image Access</button>
        `:""}
      </div>
    `:""}

    <!-- Playback controls bar -->
    <div class="${n}playback-bar">
      <button class="${n}ctrl-btn" id="${n}prev-btn" title="Previous segment" ${a?"":"disabled"}>⏮</button>
      <button class="${n}ctrl-btn" id="${n}repeat-btn" title="Repeat current segment" ${a?"":"disabled"}>🔁</button>

      ${i?`
        <button class="${n}ctrl-btn ${n}btn-play" id="${n}pause-btn" aria-label="Pause">⏸ Pause</button>
      `:s?`
        <button class="${n}ctrl-btn ${n}btn-play" id="${n}resume-btn" aria-label="Resume">▶ Resume</button>
      `:`
        <button class="${n}ctrl-btn ${n}btn-play" id="${n}play-btn" ${a?"":"disabled"} aria-label="Play">▶ Play</button>
      `}

      <button class="${n}ctrl-btn" id="${n}next-btn" title="Next segment" ${a?"":"disabled"}>⏭</button>
      <button class="${n}ctrl-btn" id="${n}stop-btn" title="Stop playback" ${i||s?"":"disabled"}>⏹</button>
    </div>

    <!-- Settings bar: Voice, Speed, AutoScroll -->
    <div class="${n}options-grid">
      <div class="${n}select-group">
        <span class="${n}select-label">Speed</span>
        <select class="${n}select" id="${n}speed-select" aria-label="Playback speed">
          ${b}
        </select>
      </div>

      <div class="${n}select-group">
        <span class="${n}select-label">Voice</span>
        <select class="${n}select" id="${n}voice-select" aria-label="Speech voice">
          ${d||'<option value="">Default Voice</option>'}
        </select>
      </div>
    </div>

    <label class="${n}toggle-label">
      <input type="checkbox" id="${n}scroll-toggle" ${t.autoScroll!==!1?"checked":""} />
      <span>Auto-scroll to dialogue</span>
    </label>

    <label class="${n}toggle-label">
      <input type="checkbox" id="${n}dialogue-toggle" ${t.dialogueOnly!==!1?"checked":""} />
      <span>Dialogue only (skip scene text & signs)</span>
    </label>

    <!-- Dialogue Transcript Header with Expand and Copy controls -->
    <div class="${n}transcript-header">
      <span>Dialogue Transcript</span>
      <div style="display: flex; gap: 6px;">
        <button class="${n}icon-btn" id="${n}copy-btn" title="Copy all dialogue to clipboard">📋 Copy</button>
        <button class="${n}icon-btn" id="${n}expand-text-btn" title="${M?"Shrink viewer":"Expand viewer"}">${M?"▲":"▼"}</button>
      </div>
    </div>

    <!-- Segments text area -->
    <div class="${n}text-area${M?" expanded":""}" id="${n}text-scroll">
      ${o}
    </div>

    <!-- Metadata footer -->
    <div class="${n}meta">
      <span>${T}</span>
      <span>${He}</span>
    </div>
  `;const F=h.querySelector(`#${n}play-btn`);F==null||F.addEventListener("click",()=>f.onPlay());const Z=h.querySelector(`#${n}pause-btn`);Z==null||Z.addEventListener("click",()=>f.onPause());const Q=h.querySelector(`#${n}resume-btn`);Q==null||Q.addEventListener("click",()=>f.onResume());const X=h.querySelector(`#${n}stop-btn`);X==null||X.addEventListener("click",()=>f.onStop());const K=h.querySelector(`#${n}next-btn`);K==null||K.addEventListener("click",()=>f.onNext());const J=h.querySelector(`#${n}prev-btn`);J==null||J.addEventListener("click",()=>f.onPrevious());const ee=h.querySelector(`#${n}repeat-btn`);ee==null||ee.addEventListener("click",()=>f.onRepeat());const te=h.querySelector(`#${n}allow-cdn-btn`);te==null||te.addEventListener("click",()=>f.onRequestPermissions());const E=h.querySelector(`#${n}copy-btn`);E==null||E.addEventListener("click",()=>{var u;t.segments&&t.segments.length>0&&((u=navigator.clipboard)==null||u.writeText(t.segments.join(`

`)).then(()=>{E&&(E.textContent="✓ Copied"),setTimeout(()=>{E&&(E.textContent="📋 Copy")},2e3)}))});const ne=h.querySelector(`#${n}expand-text-btn`);ne==null||ne.addEventListener("click",()=>{M=!M,$(t)});const se=h.querySelector(`#${n}speed-select`);se==null||se.addEventListener("change",u=>{const m=parseFloat(u.target.value);f.onSpeedChange(m)});const ie=h.querySelector(`#${n}voice-select`);ie==null||ie.addEventListener("change",u=>{const m=u.target.value;f.onVoiceChange(m)});const oe=h.querySelector(`#${n}scroll-toggle`);oe==null||oe.addEventListener("change",u=>{const m=u.target.checked;f.onAutoScrollToggle(m)});const re=h.querySelector(`#${n}dialogue-toggle`);re==null||re.addEventListener("change",u=>{var w;const m=u.target.checked;(w=f.onDialogueOnlyToggle)==null||w.call(f,m)});const ae=h.querySelector(`#${n}hide-btn`);ae==null||ae.addEventListener("click",()=>{x&&(x.style.display="none")});const ce=h.querySelector(`#${n}collapse-btn`);ce==null||ce.addEventListener("click",()=>{O=!0,$(t)}),h.querySelectorAll(`.${n}segment`).forEach(u=>{u.addEventListener("click",()=>{const m=u.getAttribute("data-index");if(m!==null){const w=parseInt(m,10);isNaN(w)||(A=!1,f.onSelectSegment(w))}})});const R=h.querySelector(`#${n}text-scroll`);if(R){R.scrollTop=W;const u=()=>{A=!0,V&&clearTimeout(V),V=setTimeout(()=>{A=!1},5e3)};R.addEventListener("wheel",u,{passive:!0}),R.addEventListener("touchmove",u,{passive:!0}),R.addEventListener("scroll",()=>{W=R.scrollTop},{passive:!0})}if(!A){const u=h.querySelector(`.${n}segment-active`);u==null||u.scrollIntoView({block:"nearest",behavior:"smooth"})}}function U(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function Ce(t){if(t&&(f={...f,...t}),document.getElementById(L)){const s=document.getElementById(L);if(s!=null&&s.shadowRoot)return h=s.shadowRoot,x=s,x.style.display="block",$}x=document.createElement("div"),x.id=L,h=x.attachShadow({mode:"open"});const e=document.createElement("style");e.textContent=Ie(),h.appendChild(e);const i=document.createElement("div");return i.className=`${n}container`,h.appendChild(i),document.body.appendChild(x),$({status:"idle",error:""}),$}function de(){x&&(x.style.display="block")}const Te=new Set(["no","yes","oh","ah","ok","hi","hey","why","who","how","now","run","die","win","man","boy","sir","mom","dad","son","she","her","him","his","you","the","and","but","not","what","wait","stop","help","look","listen","here","there","come","go","please"]),Ee=[/read at\s+\S+\.(?:com|net|org|gg|to)/i,/faster updates/i,/join our discord/i,/scanlat(?:ed|ion|or)/i,/\bdiscord\.gg\b/i,/\bwww\.\S+\.(?:com|net|org)/i,/\b(?:hivetoon|asuracomics?|reaperscans?|flamescans?|voidscans?)\.(?:com|net|org|to|io)\b/i,/for faster updates/i],ke=/[.!?…]+["'”’)]*\s*$/;function ue(t){return t?ke.test(t.trim()):!1}function Re(t,e){const i=t.trim(),s=e.trim();return i?s?/[a-zA-Z]-$/.test(i)?i.slice(0,-1)+s:`${i} ${s}`:i:s}function j(t){if(!t)return"";if(!t.replace(/[^a-zA-Z]/g,""))return t;const i=(t.match(/[A-Z]/g)||[]).length,s=(t.match(/[a-z]/g)||[]).length;let a=i>1&&(s===0||i/(i+s)>=.8)?t.toLowerCase():t;return a=a.replace(/(^\s*|[.!?…]\s+["'”’)]?\s*)([a-z])/g,(c,l,o)=>l+o.toUpperCase()),a=a.replace(/^(\s*["'“‘])([a-z])/,(c,l,o)=>l+o.toUpperCase()),a=a.replace(/\b(i)('m|'ll|'d|'ve)?\b/g,(c,l,o)=>"I"+(o||"")),a}function G(t,e){const i=t.trim();if(i.length<2||typeof e=="number"&&e>0&&e<45||Ee.some(c=>c.test(i))||/(.)\1{2,}/i.test(i))return!1;const s=(i.match(/[a-zA-Z]/g)||[]).length;if(s/i.length<.6)return!1;const r=i.split(/\s+/).map(c=>c.replace(/[^a-zA-Z0-9']/g,"")).filter(Boolean);if(r.length===0)return!1;if(r.length===1){const c=r[0].toLowerCase();if(!Te.has(c)&&(c.length<4||!/[aeiouy]/.test(c)||/^[A-Z]{3,}$/.test(r[0])))return!1}const a=(i.match(/[aeiouyAEIOUY]/g)||[]).length;return!(s>=3&&a===0)}function ge(t){return t?t.replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/(\w+)-\s*\n\s*(\w+)/g,"$1$2").replace(/([^\n.!?…])\n+([^\n])/g,"$1 $2").replace(/[\r\t]+/g," ").replace(/[ ]{2,}/g," ").trim().split(`
`).map(s=>s.trim()).filter(s=>G(s)).join(`
`):""}function Le(t,e=40){return[...t].sort((i,s)=>{const r=i.bbox.y0-s.bbox.y0;return Math.abs(r)<=e?i.bbox.x0-s.bbox.x0:r})}function Me(t){if(!t)return[];const e=t.split(new RegExp(`(?<=[.!?…]["'”’)]?)\\s+|\\n+`)),i=[];for(const s of e){const r=s.trim();r.length>0&&G(r)&&i.push(r)}return i}function Pe(t,e,i,s){const r=[];let a=0;const c=[];if(s&&s.trim()&&c.push({text:s.trim()}),e&&e.length>0){const p=e.filter(y=>y.text&&G(y.text,y.confidence)),b=Le(p);for(const y of b){const T=ge(y.text);T&&c.push({text:T,bbox:y.bbox,confidence:y.confidence})}}else if(i){const p=ge(i);p&&c.push({text:p})}if(c.length===0)return[];const l=[];let o="",d,S;for(const p of c)o?(o=Re(o,p.text),p.bbox&&d&&(d={x0:Math.min(d.x0,p.bbox.x0),y0:Math.min(d.y0,p.bbox.y0),x1:Math.max(d.x1,p.bbox.x1),y1:Math.max(d.y1,p.bbox.y1)})):(o=p.text,d=p.bbox,S=p.confidence),ue(o)&&(l.push({text:o,bbox:d,confidence:S}),o="",d=void 0,S=void 0);o&&l.push({text:o,bbox:d,confidence:S});for(const p of l){const b=Me(p.text);for(const y of b){const T=r[r.length-1];T&&T.text.toLowerCase()===y.toLowerCase()||r.push({id:`${t}-seg-${a++}`,imageId:t,text:y,spokenText:j(y),bbox:p.bbox,confidence:p.confidence})}}return r}class Oe{constructor(){g(this,"segments",[]);g(this,"currentSegmentId",null);g(this,"status","idle");g(this,"currentUtterance",null);g(this,"sessionToken",0);g(this,"rate",1);g(this,"voice",null);g(this,"voiceURI","");g(this,"stateChangeListeners",[]);g(this,"voicesChangeListeners",[]);g(this,"resumeTimeout",null);g(this,"utteranceStartTime",0);g(this,"scanningComplete",!1);this.selectDefaultVoice(),typeof window<"u"&&"speechSynthesis"in window&&(window.speechSynthesis.onvoiceschanged=()=>{this.selectDefaultVoice();const e=this.getAvailableVoices();for(const i of this.voicesChangeListeners)i(e)})}selectDefaultVoice(){if(typeof window>"u"||!("speechSynthesis"in window))return;const e=window.speechSynthesis.getVoices();if(this.voiceURI){const s=e.find(r=>r.voiceURI===this.voiceURI||r.name===this.voiceURI);if(s){this.voice=s;return}}const i=e.find(s=>s.lang.startsWith("en")&&s.default)||e.find(s=>s.lang.startsWith("en"))||e[0]||null;this.voice=i}getAvailableVoices(){return typeof window>"u"||!("speechSynthesis"in window)?[]:window.speechSynthesis.getVoices()}onVoicesChanged(e){this.voicesChangeListeners.push(e);const i=this.getAvailableVoices();return i.length>0&&e(i),()=>{this.voicesChangeListeners=this.voicesChangeListeners.filter(s=>s!==e)}}getCurrentIndex(){if(!this.currentSegmentId||this.segments.length===0)return 0;const e=this.segments.findIndex(i=>i.id===this.currentSegmentId);return e>=0?e:0}setSegments(e){var i;this.stop(),this.segments=[...e],this.currentSegmentId=((i=e[0])==null?void 0:i.id)||null,this.emitState(e.length>0?"ready":"idle")}appendSegments(e,i=!1){if(this.scanningComplete=i,e.length===0){i&&this.status==="waiting"&&(this.status="completed",this.emitState("completed"));return}const s=new Set(this.segments.map(a=>a.id)),r=e.filter(a=>!s.has(a.id));if(r.length!==0)if(this.segments.push(...r),!this.currentSegmentId&&this.segments.length>0&&(this.currentSegmentId=this.segments[0].id),this.status==="waiting"){console.log("[Speech] New segments arrived while waiting, automatically resuming playback");const a=this.currentSegmentId?this.segments.findIndex(c=>c.id===this.currentSegmentId):-1;a>=0&&a+1<this.segments.length?this.currentSegmentId=this.segments[a+1].id:this.currentSegmentId=r[0].id,this.speakCurrentSegment()}else this.emitState(this.status)}setScanningComplete(e=!0){this.scanningComplete=e,e&&this.status==="waiting"&&(this.status="completed",this.emitState("completed"))}getSegments(){return this.segments}getCurrentUtterance(){return this.currentUtterance}setRate(e){this.rate=Math.max(.7,Math.min(1.5,e))}getRate(){return this.rate}setVoiceURI(e){this.voiceURI=e,this.selectDefaultVoice()}getVoiceURI(){var e;return((e=this.voice)==null?void 0:e.voiceURI)||this.voiceURI}play(e){var i;if(typeof window>"u"||!("speechSynthesis"in window)){this.emitState("error","Speech synthesis is not supported in this browser.");return}if(this.segments.length===0){this.scanningComplete?this.emitState("idle"):(this.status="waiting",this.emitState("waiting"));return}if(typeof e=="number"){const s=Math.max(0,Math.min(e,this.segments.length-1));this.currentSegmentId=((i=this.segments[s])==null?void 0:i.id)||null}else!this.currentSegmentId&&this.segments.length>0&&(this.currentSegmentId=this.segments[0].id);if(this.status==="paused"&&e===void 0){this.resume();return}this.speakCurrentSegment()}pause(){typeof window>"u"||!("speechSynthesis"in window)||this.status==="playing"&&(this.clearResumeTimeout(),window.speechSynthesis.pause(),this.status="paused",this.emitState("paused"))}resume(){typeof window>"u"||!("speechSynthesis"in window)||this.status==="paused"&&(this.clearResumeTimeout(),window.speechSynthesis.resume(),this.status="playing",this.emitState("playing"),this.resumeTimeout=setTimeout(()=>{this.status==="playing"&&!window.speechSynthesis.speaking&&(console.warn("[Speech] Resume watchdog triggered, re-speaking segment"),this.speakCurrentSegment())},250))}stop(){this.clearResumeTimeout(),this.sessionToken++,typeof window<"u"&&"speechSynthesis"in window&&window.speechSynthesis.cancel(),this.currentUtterance=null,this.status="stopped",this.emitState("stopped")}next(){const e=this.getCurrentIndex();e<this.segments.length-1?(this.currentSegmentId=this.segments[e+1].id,this.speakCurrentSegment()):this.scanningComplete?(this.status="completed",this.emitState("completed")):(this.status="waiting",this.emitState("waiting"))}previous(){const e=this.utteranceStartTime>0?Date.now()-this.utteranceStartTime:0,i=this.getCurrentIndex();e>1500||i===0?this.speakCurrentSegment():(this.currentSegmentId=this.segments[Math.max(0,i-1)].id,this.speakCurrentSegment())}repeat(){this.speakCurrentSegment()}speakCurrentSegment(){if(typeof window>"u"||!("speechSynthesis"in window))return;this.clearResumeTimeout(),this.sessionToken++;const e=this.sessionToken;if(this.segments.length===0){this.scanningComplete?(this.status="completed",this.emitState("completed")):(this.status="waiting",this.emitState("waiting"));return}const i=this.getCurrentIndex();if(i>=this.segments.length){this.scanningComplete?(this.status="completed",this.emitState("completed")):(this.status="waiting",this.emitState("waiting"));return}const s=this.segments[i];this.currentSegmentId=s.id,window.speechSynthesis.cancel();const r=s.spokenText||j(s.text),a=new SpeechSynthesisUtterance(r);this.voice&&(a.voice=this.voice),a.rate=this.rate,a.onstart=()=>{this.sessionToken===e&&(this.clearResumeTimeout(),this.utteranceStartTime=Date.now(),this.status="playing",this.emitState("playing"))},a.onend=()=>{if(this.sessionToken!==e)return;this.currentUtterance=null;const c=this.getCurrentIndex();c+1<this.segments.length?(this.currentSegmentId=this.segments[c+1].id,this.speakCurrentSegment()):this.scanningComplete?(this.status="completed",this.emitState("completed")):(this.status="waiting",this.emitState("waiting"))},a.onerror=c=>{this.sessionToken===e&&(c.error==="canceled"||c.error==="interrupted"||(console.error("[Speech] Utterance error:",c.error),this.emitState("error",`Speech error: ${c.error}`)))},this.currentUtterance=a,window.speechSynthesis.speak(a)}clearResumeTimeout(){this.resumeTimeout&&(clearTimeout(this.resumeTimeout),this.resumeTimeout=null)}onStateChange(e){return this.stateChangeListeners.push(e),e(this.getState()),()=>{this.stateChangeListeners=this.stateChangeListeners.filter(i=>i!==e)}}getState(){const e=this.getCurrentIndex(),i=this.segments.length>0?Math.min(e,this.segments.length-1):0;return{status:this.status,currentIndex:i,totalSegments:this.segments.length,currentSegment:this.segments[i]||null,currentSegmentId:this.currentSegmentId}}emitState(e,i){this.status=e;const s=this.getCurrentIndex(),r=this.segments.length>0?Math.min(s,this.segments.length-1):0,a={status:e,currentIndex:r,totalSegments:this.segments.length,currentSegment:this.segments[r]||null,currentSegmentId:this.currentSegmentId,error:i};for(const c of this.stateChangeListeners)try{c(a)}catch(l){console.error("[Speech] Error in listener callback:",l)}}destroy(){this.stop(),this.stateChangeListeners=[],this.voicesChangeListeners=[]}}class Ae{constructor(e=!0){g(this,"enabled");g(this,"userInteracting",!1);g(this,"interactionTimeout",null);g(this,"lastScrolledSegmentId",null);g(this,"removeInteractionListeners",null);this.enabled=e,this.setupInteractionListeners()}setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}scrollToSegment(e,i){if(!(!this.enabled||this.userInteracting)&&e.id!==this.lastScrolledSegmentId&&(this.lastScrolledSegmentId=e.id,!!i)){try{i.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"})}catch{const s=i.getBoundingClientRect(),a=(window.scrollY||window.pageYOffset)+s.top-window.innerHeight*.25;window.scrollTo({top:Math.max(0,a),behavior:"smooth"})}window.dispatchEvent(new Event("scroll"))}}stop(){this.lastScrolledSegmentId=null,this.clearInteractionTimeout()}setupInteractionListeners(){const e=s=>{var r;s&&(((r=s.composedPath)==null?void 0:r.call(s))||[]).some(l=>{var o;return l instanceof HTMLElement&&(l.id===L||((o=l.closest)==null?void 0:o.call(l,`#${L}`)))})||(this.userInteracting=!0,this.clearInteractionTimeout(),this.interactionTimeout=setTimeout(()=>{this.userInteracting=!1},3e3))};window.addEventListener("wheel",e,{passive:!0}),window.addEventListener("touchmove",e,{passive:!0});const i=s=>{const r=["ArrowUp","ArrowDown","PageUp","PageDown","Space","Home","End"];(r.includes(s.code)||r.includes(s.key))&&e()};window.addEventListener("keydown",i,{passive:!0}),this.removeInteractionListeners=()=>{window.removeEventListener("wheel",e),window.removeEventListener("touchmove",e),window.removeEventListener("keydown",i)}}clearInteractionTimeout(){this.interactionTimeout&&(clearTimeout(this.interactionTimeout),this.interactionTimeout=null)}destroy(){var e;this.clearInteractionTimeout(),(e=this.removeInteractionListeners)==null||e.call(this),this.lastScrolledSegmentId=null}}function Ue(t){return typeof t=="object"&&t!==null&&"type"in t&&typeof t.type=="string"}class _e{constructor(){g(this,"images",[]);g(this,"processedImageIds",new Set);g(this,"isProcessing",!1);g(this,"isDestroyed",!1);g(this,"scheduleTimeout",null);g(this,"virtualCheckTimeout",null);g(this,"activeImageId",null);g(this,"dialogueOnly",!0);g(this,"pendingCarryOverText","");g(this,"onSegmentsCallback",null);g(this,"onProgressCallback",null);g(this,"onErrorCallback",null)}addImage(e){this.isDestroyed||this.images.some(i=>i.id===e.id)||(this.images.push(e),this.sortImages(),this.notifyProgress(),!this.isProcessing&&!this.scheduleTimeout&&(this.scheduleTimeout=setTimeout(()=>{this.scheduleTimeout=null,this.isProcessing||this.processNextImage()},0)))}sortImages(){const e=typeof window<"u"&&(window.scrollY||window.pageYOffset)||0;this.images.sort((i,s)=>{const r=i.element.getBoundingClientRect?i.element.getBoundingClientRect().top+e:0,a=s.element.getBoundingClientRect?s.element.getBoundingClientRect().top+e:0;return r-a})}setActiveReadingImage(e){this.activeImageId=e}setDialogueOnly(e){this.dialogueOnly=e}onSegmentsAvailable(e){this.onSegmentsCallback=e}onProgress(e){this.onProgressCallback=e}onError(e){this.onErrorCallback=e}notifyProgress(){if(this.onProgressCallback){const e=N(),i=Math.max(this.images.length,e);this.onProgressCallback({scannedImages:this.processedImageIds.size,totalImages:i,isScanning:this.isProcessing})}}getNextImageToScan(){let e=-1;this.activeImageId&&(e=this.images.findIndex(s=>s.id===this.activeImageId));const i=typeof window<"u"&&(window.scrollY||window.pageYOffset)||0;if(e<0&&typeof window<"u"&&i>0&&this.images.length>0){const s=i+window.innerHeight/2;let r=1/0;this.images.forEach((a,c)=>{if(!a.element.getBoundingClientRect)return;const o=a.element.getBoundingClientRect().top+(window.scrollY||window.pageYOffset||0),d=Math.abs(o-s);d<r&&(r=d,e=c)})}e<0&&(e=0);for(let s=Math.max(0,e);s<=Math.min(this.images.length-1,e+10);s++){const r=this.images[s];if(!this.processedImageIds.has(r.id))return r}for(let s=e+11;s<this.images.length;s++){const r=this.images[s];if(!this.processedImageIds.has(r.id))return r}return this.images.find(s=>!this.processedImageIds.has(s.id))}async processNextImage(){var i,s,r,a,c,l;if(this.isDestroyed)return;const e=this.getNextImageToScan();if(!e){const o=N();if(o>0&&this.processedImageIds.size<o){this.isProcessing=!1,this.notifyProgress(),(i=this.onSegmentsCallback)==null||i.call(this,[],!1),this.triggerNextVirtualPage();return}if(this.pendingCarryOverText){const S={id:`seg-final-${Date.now()}`,imageId:((s=this.images[this.images.length-1])==null?void 0:s.id)||"final",text:this.pendingCarryOverText,spokenText:j(this.pendingCarryOverText)};this.pendingCarryOverText="",(r=this.onSegmentsCallback)==null||r.call(this,[S],!0)}else(a=this.onSegmentsCallback)==null||a.call(this,[],!0);this.isProcessing=!1,this.notifyProgress();return}this.isProcessing=!0,this.notifyProgress();try{const o=await this.scanImage(e);if(this.isDestroyed)return;this.processedImageIds.add(e.id);const d=this.images.some(y=>!this.processedImageIds.has(y.id)),S=N(),p=S>0&&this.processedImageIds.size<S,b=!d&&!p;if(!b&&o.length>0){const y=o[o.length-1];ue(y.text)||(this.pendingCarryOverText=y.text,o.pop())}(c=this.onSegmentsCallback)==null||c.call(this,o,b)}catch(o){if(this.isDestroyed)return;const d=o instanceof Error?o.message:String(o);console.warn(`[Queue] Failed scanning image ${e.id}, continuing to next:`,d),this.processedImageIds.add(e.id),(l=this.onErrorCallback)==null||l.call(this,`Skipped panel: ${d}`)}this.notifyProgress(),setTimeout(()=>{this.processNextImage()},10)}triggerNextVirtualPage(){if(!this.isDestroyed){try{const i=Array.from(document.querySelectorAll(".rpage-page, [data-page], .page-item, .chapter-page, .iv-image")).find(s=>!s.querySelector("img"));i&&(i.getBoundingClientRect().top>window.innerHeight&&window.scrollBy({top:300,behavior:"smooth"}),window.dispatchEvent(new Event("scroll")))}catch{}this.virtualCheckTimeout&&clearTimeout(this.virtualCheckTimeout),this.virtualCheckTimeout=setTimeout(()=>{!this.isProcessing&&!this.isDestroyed&&this.processNextImage()},800)}}async scanImage(e){let i={};if(e.url&&!e.url.startsWith("blob:")&&!e.url.startsWith("data:")){i={imageUrl:e.url};const r=this.imageToBase64(e.element);r&&(i.imageBase64=r)}else{const r=this.imageToBase64(e.element);if(r)i={imageBase64:r};else throw new Error("Image is inaccessible (CORS or tainted canvas)")}const s=await chrome.runtime.sendMessage({type:"OCR_REQUEST",imageUrl:i.imageUrl??"",imageBase64:i.imageBase64,tileIndex:0,tileTotal:1,imageId:e.id,dialogueOnly:this.dialogueOnly});if(!Ue(s))throw new Error("Invalid response from OCR background service");if(s.type==="OCR_RESULT"){const r=s,a=this.pendingCarryOverText;return this.pendingCarryOverText="",Pe(e.id,r.blocks,r.fullText,a)}else if(s.type==="OCR_ERROR"){const r=s;throw new Error(r.error||"OCR recognition failed")}return[]}imageToBase64(e){try{if(typeof document>"u"||typeof navigator<"u"&&navigator.userAgent.includes("jsdom"))return null;const i=document.createElement("canvas");i.width=e.naturalWidth||800,i.height=e.naturalHeight||1200;const s=i.getContext("2d");return s?(s.drawImage(e,0,0),i.toDataURL("image/png")):null}catch{return null}}destroy(){this.scheduleTimeout&&(clearTimeout(this.scheduleTimeout),this.scheduleTimeout=null),this.virtualCheckTimeout&&(clearTimeout(this.virtualCheckTimeout),this.virtualCheckTimeout=null),this.isDestroyed=!0,this.isProcessing=!1,this.images=[],this.processedImageIds.clear(),this.activeImageId=null,this.pendingCarryOverText="",this.onSegmentsCallback=null,this.onProgressCallback=null,this.onErrorCallback=null}}const C={voiceURI:"",speed:1,autoScroll:!0,dialogueOnly:!0},Y="mv_settings";function B(t){if(typeof t!="object"||t===null)return{...C};const e=t,i=typeof e.voiceURI=="string"?e.voiceURI:C.voiceURI;let s=typeof e.speed=="number"&&!Number.isNaN(e.speed)?e.speed:C.speed;s=Math.max(.7,Math.min(1.5,Math.round(s*100)/100));const r=typeof e.autoScroll=="boolean"?e.autoScroll:C.autoScroll,a=typeof e.dialogueOnly=="boolean"?e.dialogueOnly:C.dialogueOnly;return{voiceURI:i,speed:s,autoScroll:r,dialogueOnly:a}}async function he(){var t;try{if(typeof chrome>"u"||!((t=chrome.storage)!=null&&t.local))return{...C};const e=await chrome.storage.local.get(Y);return B(e[Y])}catch(e){return console.warn("[Settings] Failed to load settings from storage, using defaults:",e),{...C}}}async function _(t){var e;try{const i=await he(),s=B({...i,...t});return typeof chrome<"u"&&((e=chrome.storage)!=null&&e.local)&&await chrome.storage.local.set({[Y]:s}),s}catch(i){return console.warn("[Settings] Failed to save settings to storage:",i),B(t)}}document.documentElement.getAttribute(I)?(console.log("[Manhwa Voice] Already active on this page — focusing controller."),de()):(document.documentElement.setAttribute(I,"true"),De());async function De(){console.log("[Manhwa Voice] Session initializing...");const t=await he(),e=new Oe,i=new Ae(t.autoScroll),s=new _e;s.setDialogueOnly(t.dialogueOnly!==!1),e.setRate(t.speed),t.voiceURI&&e.setVoiceURI(t.voiceURI);let r=null,a={scanned:0,total:0,isScanning:!0};const c=()=>{var p;if(!r)return;const o=e.getState(),d=e.getSegments(),S=e.getAvailableVoices().map(b=>({name:b.name,lang:b.lang,voiceURI:b.voiceURI}));r({status:o.status,text:((p=o.currentSegment)==null?void 0:p.text)??"",error:o.error??"",progress:o.totalSegments>0?(o.currentIndex+1)/o.totalSegments:0,imageCount:a.total,currentSegmentIndex:o.currentIndex,totalSegments:o.totalSegments,segments:d.map(b=>b.text),speed:e.getRate(),voiceURI:e.getVoiceURI(),autoScroll:i.isEnabled(),dialogueOnly:t.dialogueOnly!==!1,availableVoices:S,scannedImages:a.scanned,totalImages:a.total,isScanning:a.isScanning})};r=Ce({onPlay:()=>e.play(),onPause:()=>e.pause(),onResume:()=>e.resume(),onStop:()=>{e.stop(),i.stop()},onNext:()=>e.next(),onPrevious:()=>e.previous(),onRepeat:()=>e.repeat(),onSelectSegment:o=>e.play(o),onSpeedChange:o=>{e.setRate(o),_({speed:o}),c()},onVoiceChange:o=>{e.setVoiceURI(o),_({voiceURI:o}),c()},onAutoScrollToggle:o=>{i.setEnabled(o),_({autoScroll:o}),c()},onDialogueOnlyToggle:o=>{t.dialogueOnly=o,s.setDialogueOnly(o),_({dialogueOnly:o}),c()},onRequestPermissions:async()=>{try{await chrome.runtime.sendMessage({type:"REQUEST_PERMISSIONS"})}catch(o){console.warn("[Manhwa Voice] Permission request failed:",o)}}}),e.onStateChange(o=>{if(c(),o.status==="playing"&&o.currentSegment){s.setActiveReadingImage(o.currentSegment.imageId);const d=we(o.currentSegment.imageId);i.scrollToSegment(o.currentSegment,d)}else(o.status==="stopped"||o.status==="idle")&&i.stop()}),e.onVoicesChanged(()=>{c()}),s.onSegmentsAvailable((o,d)=>{e.appendSegments(o,d),c()}),s.onProgress(o=>{a={scanned:o.scannedImages,total:o.totalImages,isScanning:o.isScanning},e.setScanningComplete(!o.isScanning&&o.scannedImages>=o.totalImages),c()}),s.onError(o=>{var d;r&&r({...e.getState(),status:e.getState().status,text:((d=e.getState().currentSegment)==null?void 0:d.text)??"",error:o,progress:0,imageCount:a.total,speed:e.getRate(),voiceURI:e.getVoiceURI(),autoScroll:i.isEnabled(),scannedImages:a.scanned,totalImages:a.total,isScanning:a.isScanning})});const l=xe(o=>{s.addImage(o)});chrome.runtime.onMessage.addListener(o=>{o.type==="SHOW_CONTROLLER"&&de()}),c(),window.addEventListener("beforeunload",()=>{l(),s.destroy(),e.destroy(),i.destroy(),ve()})}})();
