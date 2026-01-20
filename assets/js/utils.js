(function(){
  window.CPOF = window.CPOF || {};

  CPOF.setCookie = function(name, value, days){
    const v = encodeURIComponent(JSON.stringify(value));
    const d = new Date(); d.setTime(d.getTime() + (days||365)*24*60*60*1000);
    document.cookie = name + "=" + v + ";expires=" + d.toUTCString() + ";path=/";
  }

  CPOF.getCookie = function(name){
    const k = name + "=";
    const ca = document.cookie.split(';');
    for(let c of ca){ c = c.trim(); if(c.indexOf(k)===0){ try{return JSON.parse(decodeURIComponent(c.substring(k.length)));}catch(e){return null;} }}
    return null;
  }

  CPOF.parseRangeInput = function(input){
    if(!input) return [];
    const parts = input.split(/[,\s]+/g).map(s=>s.trim()).filter(Boolean);
    const out = new Set();
    parts.forEach(p => {
      if(/\d+-\d+/.test(p)){
        const [a,b] = p.split('-').map(Number);
        const start = Math.max(1, Math.min(a,b));
        const end = Math.min(41, Math.max(a,b));
        for(let i=start;i<=end;i++) out.add(i);
      } else if(/^\d+$/.test(p)){
        const n = Number(p); if(n>=1 && n<=41) out.add(n);
      }
    });
    return Array.from(out).sort((a,b)=>a-b);
  }

  CPOF.preloadImage = function(src){
    return new Promise((resolve,reject)=>{
      const img = new Image(); img.src = src;
      img.onload = ()=>resolve(src);
      img.onerror = reject;
    });
  }

  CPOF.pickRandom = function(arr, last){
    if(!arr || arr.length===0) return null;
    if(arr.length===1) return arr[0];
    // try to pick different than last
    const filtered = arr.filter(x => x !== last);
    if(filtered.length === 0) return arr[Math.floor(Math.random()*arr.length)];
    return filtered[Math.floor(Math.random()*filtered.length)];
  }

})();