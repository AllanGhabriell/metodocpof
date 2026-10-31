import {normalizeAll,effective,solveLabel,format,statistics,csv,shareImage,downloadOrShare} from '../../v2/timer/records.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createTimerHistory({root,getRecords,setRecords,kind='3x3',onUpdate=()=>{}}){
 let search='',selection=false,selected=new Set(),filter='active',session='all',sort='new',detail=null,deleted=null,deleteTimer=0;
 const redraw=()=>{
  const rows=getRecords();
  const sessions=[...new Set(rows.map(r=>r.session||'Geral'))].sort();
  let subset=rows.filter(r=>(filter==='all'||(filter==='archive'?!!r.archived:!r.archived))&&(session==='all'||(r.session||'Geral')===session));
  if(search.trim())subset=subset.filter(r=>[r.scramble,r.comment,r.session,solveLabel(r),new Date(r.date).toLocaleDateString('pt-BR')].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  if(sort==='best')subset.sort((a,b)=>effective(a)-effective(b));else if(sort==='worst')subset.sort((a,b)=>effective(b)-effective(a));
  else subset.sort((a,b)=>new Date(b.date)-new Date(a.date));
  root.innerHTML='<div class="timer-history-tools"><label class="timer-search">Pesquisar tempos, comentários ou embaralhamento<input type="search" id="timer-search" value="'+esc(search)+'" placeholder="Buscar…" autocomplete="off"></label>'+
   '<div class="timer-history-filters"><label>Visualizar<select id="timer-filter"><option value="active" '+(filter==='active'?'selected':'')+'>Ativos</option><option value="archive" '+(filter==='archive'?'selected':'')+'>Arquivados</option><option value="all" '+(filter==='all'?'selected':'')+'>Todos</option></select></label>'+
   '<label>Sessão<select id="timer-session-filter"><option value="all">Todas</option>'+sessions.map(s=>'<option value="'+esc(s)+'" '+(session===s?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select></label>'+
   '<label>Ordem<select id="timer-sort"><option value="new">Mais recentes</option><option value="best" '+(sort==='best'?'selected':'')+'>Melhor tempo</option><option value="worst" '+(sort==='worst'?'selected':'')+'>Pior tempo</option></select></label></div>'+
   '<div class="timer-bulk-bar"><button data-timer-history="select">'+(selection?'Cancelar seleção':'Selecionar vários')+'</button>'+
   (selection?'<button data-timer-history="all">Selecionar visíveis</button><button data-timer-history="archive">Arquivar '+selected.size+'</button><button class="timer-danger" data-timer-history="remove">Excluir '+selected.size+'</button>':'')+
   '<button data-timer-history="export">Exportar CSV</button><button data-timer-history="backup">Backup JSON</button><label class="timer-import-label">Importar JSON<input id="timer-json-import" type="file" accept="application/json,.json" hidden></label></div>'+
   '<p class="timer-history-count">'+subset.length+' resultado(s) · '+getRecords().length+' registros locais</p></div>'+
   '<div class="timer-history-grid">'+(subset.length?subset.slice(0,300).map(r=>
    '<button type="button" class="timer-history-card '+(selected.has(r.id)?'is-selected':'')+'" data-timer-record="'+esc(r.id)+'" aria-label="'+(selection?'Selecionar tempo':'Ver detalhes do tempo')+' '+esc(solveLabel(r))+'">'+
    '<small>'+esc(new Date(r.date).toLocaleDateString('pt-BR'))+'</small><strong>'+esc(solveLabel(r))+'</strong>'+
    '<span>'+esc(r.comment?.slice(0,32)||r.session||'Geral')+'</span>'+(selection?'<b class="timer-check">'+(selected.has(r.id)?'✓':'○')+'</b>':'')+'</button>').join(''):'<p class="timer-empty">Nenhum tempo encontrado.</p>')+'</div>'+
   (subset.length>300?'<p class="timer-history-count">Exibindo os 300 primeiros resultados. Use filtros para localizar outros tempos.</p>':'')+
   (deleted?'<div class="timer-undo" role="status">Exclusão efetuada. <button data-timer-history="undo">Desfazer</button></div>':'');
 };
 const persist=next=>{setRecords(next);onUpdate();redraw()};
 const undoable=(ids)=>{const before=getRecords().slice();let after=before.filter(r=>!ids.has(r.id));if(after.length===before.length)return;
  deleted=before;clearTimeout(deleteTimer);deleteTimer=setTimeout(()=>{deleted=null;redraw()},10000);persist(after);};
 const modal=(record)=>{
  detail=record?.id||null;
  document.getElementById('timer-edit-dialog')?.remove();
  const dlg=document.createElement('dialog');dlg.id='timer-edit-dialog';dlg.className='timer-edit-dialog';
  dlg.innerHTML='<form method="dialog" id="timer-edit-form"><div class="timer-edit-head"><h2>Detalhes da resolução</h2><button type="button" data-timer-close aria-label="Fechar">✕</button></div>'+
   '<strong class="timer-edit-time">'+esc(solveLabel(record))+'</strong><small>'+esc(new Date(record.date).toLocaleString('pt-BR'))+'</small>'+
   '<p class="timer-edit-scramble">'+esc(record.scramble)+'</p>'+
   '<div class="timer-edit-fields"><label>Tempo em segundos<input type="number" min="0" max="3600" step="0.01" name="time" value="'+(record.ms/1000).toFixed(2)+'" required></label>'+
   '<label>Penalidade<select name="penalty"><option value="OK" '+(record.penalty==='OK'?'selected':'')+'>Sem penalidade</option><option value="+2" '+(record.penalty==='+2'?'selected':'')+'>+2 segundos</option><option value="DNF" '+(record.penalty==='DNF'?'selected':'')+'>DNF</option></select></label>'+
   '<label>Sessão<input type="text" maxlength="45" name="session" value="'+esc(record.session||'Geral')+'"></label>'+
   '<label>Comentário<textarea maxlength="600" name="comment" rows="3" placeholder="Como foi a resolução?">'+esc(record.comment||'')+'</textarea></label></div>'+
   '<label class="timer-archive-check"><input type="checkbox" name="archived" '+(record.archived?'checked':'')+'> Arquivar esta resolução</label>'+
   '<div class="timer-edit-actions"><button type="submit" value="save" class="timer-primary">Salvar alterações</button><button type="button" data-timer-share>Compartilhar</button><button type="button" data-timer-delete class="timer-danger">Excluir</button></div></form>';
  document.body.appendChild(dlg);
  dlg.querySelector('[data-timer-close]').onclick=()=>dlg.close();
  dlg.addEventListener('close',()=>dlg.remove());
  dlg.querySelector('[data-timer-share]').onclick=async()=>{
   try{await downloadOrShare(shareImage({title:kind==='3x3'?'Meu tempo 3×3':'Meu tempo de Cross',subtitle:kind,record}), 'academia-cfop-tempo.png')}
   catch(e){alert('Não foi possível compartilhar: '+e.message)}
  };
  dlg.querySelector('[data-timer-delete]').onclick=()=>{
   if(!confirm('Excluir apenas esta resolução? Você poderá desfazer por 10 segundos.'))return;
   dlg.close();undoable(new Set([record.id]));
  };
  dlg.querySelector('form').addEventListener('submit',e=>{
   e.preventDefault();
   const form=new FormData(e.currentTarget),seconds=Number(form.get('time'));
   if(!Number.isFinite(seconds)||seconds<0||seconds>3600){alert('Tempo inválido.');return}
   const next=getRecords().map(r=>r.id===record.id?{...r,ms:Math.round(seconds*1000),penalty:form.get('penalty'),
     session:String(form.get('session')||'Geral').slice(0,45),comment:String(form.get('comment')||'').slice(0,600),
     archived:form.get('archived')==='on',edited:true}:r);
   dlg.close();persist(next);
  });
  dlg.showModal();
 };
 root.addEventListener('click',async e=>{
  const card=e.target.closest('[data-timer-record]');
  if(card){const r=getRecords().find(x=>x.id===card.dataset.timerRecord);if(!r)return;
   if(selection){if(selected.has(r.id))selected.delete(r.id);else selected.add(r.id);redraw()}else modal(r);return}
  const key=e.target.closest('[data-timer-history]')?.dataset.timerHistory;if(!key)return;
  if(key==='select'){selection=!selection;selected.clear();redraw()}
  if(key==='all'){root.querySelectorAll('[data-timer-record]').forEach(el=>selected.add(el.dataset.timerRecord));redraw()}
  if(key==='archive'&&selected.size){persist(getRecords().map(r=>selected.has(r.id)?{...r,archived:!r.archived}:r));selected.clear()}
  if(key==='remove'&&selected.size&&confirm('Excluir '+selected.size+' tempos?')){undoable(selected);selected.clear()}
  if(key==='undo'&&deleted){const old=deleted;deleted=null;clearTimeout(deleteTimer);persist(old)}
  if(key==='export'||key==='backup'){
   const blob=key==='export'?new Blob([csv(getRecords())],{type:'text/csv;charset=utf-8'}):
    new Blob([JSON.stringify({format:'academia-cfop-times-v1',kind,records:getRecords()},null,2)],{type:'application/json'});
   const uri=URL.createObjectURL(blob),a=document.createElement('a');a.href=uri;a.download='academia-cfop-'+kind+'-backup.'+(key==='export'?'csv':'json');a.click();setTimeout(()=>URL.revokeObjectURL(uri),1200);
  }
 });
 root.addEventListener('change',async e=>{
  if(e.target.id==='timer-filter')filter=e.target.value;
  if(e.target.id==='timer-session-filter')session=e.target.value;
  if(e.target.id==='timer-sort')sort=e.target.value;
  if(e.target.id==='timer-json-import'){
   const file=e.target.files?.[0];if(!file||file.size>5*1024*1024)return;
   try{
    const data=JSON.parse(await file.text());if(data.format!=='academia-cfop-times-v1'||data.kind!==kind||!Array.isArray(data.records))throw Error('Backup incompatível com este timer');
    const imported=normalizeAll(data.records),map=new Map(getRecords().map(r=>[r.id,r]));
    imported.forEach(r=>map.set(r.id,r));
    if(confirm('Importar '+imported.length+' tempos, sem apagar os atuais?'))persist([...map.values()].slice(-3500));
   }catch(err){alert('Não foi possível importar: '+err.message)}
  }else redraw();
 });
 root.addEventListener('input',e=>{if(e.target.id==='timer-search'){search=e.target.value;const at=e.target.selectionStart;redraw();const input=root.querySelector('#timer-search');input?.focus();input?.setSelectionRange(at,at)}});
 return {render:redraw,open:modal};
}
