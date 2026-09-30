const $ = id => document.getElementById(id);
const euro = n => new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const num = id => Number($(id)?.value || 0);

function areaCalculation(){
  const mode = document.querySelector('input[name="areaMode"]:checked')?.value || 'dimensions';
  let wallArea = 0;
  let ceilingArea = 0;
  if(mode === 'house'){
    const total = num('houseArea');
    const factor = num('wallFactor') || 0;
    wallArea = total * factor;
    ceilingArea = total;
  } else {
    const w=num('width'), l=num('length'), h=num('height');
    wallArea = 2*(w+l)*h;
    ceilingArea = w*l;
  }
  const doorDeduction = num('doors') * 2.0;
  const windowDeduction = num('windows') * 1.5;
  const deductions = doorDeduction + windowDeduction;
  const extra = num('extraArea');
  let paintArea = Math.max(0, wallArea - deductions + extra);
  if($('ceiling').checked) paintArea += ceilingArea;
  return {mode, wallArea, ceilingArea, deductions, paintArea};
}

function buckets(req){
  const sizes=[5,10,15,20], prices=[num('p5'),num('p10'),num('p15'),num('p20')];
  let best=null;
  for(let a=0;a<=12;a++)for(let b=0;b<=12;b++)for(let c=0;c<=12;c++)for(let d=0;d<=12;d++){
    const qty=[a,b,c,d], liters=a*5+b*10+c*15+d*20;
    if(liters<req || liters===0) continue;
    const cost=qty.reduce((s,q,i)=>s+q*prices[i],0);
    if(!best || cost<best.cost || (cost===best.cost && liters<best.liters)) best={qty,liters,cost};
  }
  return best;
}

function calc(){
  const a=areaCalculation();
  $('wallAreaOut').textContent=a.wallArea.toFixed(2)+' m²';
  $('deductionsOut').textContent=a.deductions.toFixed(2)+' m²';
  $('paintAreaOut').textContent=a.paintArea.toFixed(2)+' m²';

  const coats=num('coats'), coverage=num('coverage')||1, waste=num('waste');
  const liters=a.paintArea*coats/coverage*(1+waste/100);
  const b=buckets(liters);
  const paintCost=b?b.cost:liters*num('paintPrice');
  $('litersOut').textContent=liters.toFixed(2)+' L';
  $('bucketsOut').textContent=b?`${b.qty[0]}×5 L · ${b.qty[1]}×10 L · ${b.qty[2]}×15 L · ${b.qty[3]}×20 L (${b.liters} L)`: '—';
  $('paintCostOut').textContent=euro(paintCost);

  const labor=a.paintArea*num('labor'), primer=a.paintArea*num('primer'), filler=a.paintArea*num('filler');
  const subtotal=Math.max(0,paintCost+labor+primer+filler+num('travel')-num('discount'));
  const vat=subtotal*num('vat'), total=subtotal+vat;
  $('subtotalOut').textContent=euro(subtotal);
  $('vatOut').textContent=euro(vat);
  $('totalOut').textContent=euro(total);
  $('heroTotal').textContent=euro(total);
  $('heroArea').textContent='Área de pintura: '+a.paintArea.toFixed(2)+' m²';
  $('heroLiters').textContent='Tinta: '+liters.toFixed(2)+' L';
  renderPreview({a,liters,b,paintCost,labor,primer,filler,subtotal,vat,total});
  return {a,liters,b,paintCost,labor,primer,filler,subtotal,vat,total};
}

function renderPreview(x){
  const areaLabel=x.a.mode==='house'?'Área total da casa: '+num('houseArea').toFixed(2)+' m²':'Cálculo por dimensões';
  $('quotePreview').innerHTML=`
  <div><b>Cliente:</b> ${esc($('client').value)||'—'}</div>
  <div><b>Obra:</b> ${esc($('address').value)||'—'}</div>
  <div><b>Trabalho:</b> ${esc($('job').value)||'—'}</div>
  <hr>
  <div>${areaLabel}</div>
  <div><b>Área de pintura:</b> ${x.a.paintArea.toFixed(2)} m²</div>
  <div><b>Demãos:</b> ${num('coats')} · <b>Tinta:</b> ${x.liters.toFixed(2)} L</div>
  <div><b>Mão de obra:</b> ${euro(x.labor)}</div>
  <div><b>Tinta:</b> ${euro(x.paintCost)}</div>
  <div><b>Extras:</b> ${euro(x.primer+x.filler+num('travel'))}</div>
  <hr><div class="grand"><b>Total:</b> ${euro(x.total)}</div>
  `;
}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

function quoteData(){
  const c=calc();
  return {id:Date.now(),date:new Date().toISOString(),client:$('client').value,phone:$('phone').value,address:$('address').value,job:$('job').value,validity:$('validity').value,notes:$('notes').value,calc:c,areaMode:document.querySelector('input[name="areaMode"]:checked').value,houseArea:num('houseArea'),wallFactor:num('wallFactor')};
}
function saveQuote(){
  const data=quoteData(), list=JSON.parse(localStorage.getItem('pintor_quotes')||'[]');
  list.unshift(data); localStorage.setItem('pintor_quotes',JSON.stringify(list)); renderHistory(); alert('Orçamento guardado.');
}
function renderHistory(){
  const list=JSON.parse(localStorage.getItem('pintor_quotes')||'[]');
  if(!list.length){$('historyList').innerHTML='<p class="hint">Ainda não existem orçamentos guardados.</p>';return;}
  $('historyList').innerHTML=list.map(q=>`<div class="history-item"><div><strong>${esc(q.client||'Sem cliente')}</strong><small>${new Date(q.date).toLocaleString('pt-PT')}</small><span>${euro(q.calc?.total||0)} · ${(q.calc?.a?.paintArea||0).toFixed(2)} m²</span></div><div><button onclick="openQuote(${q.id})">Abrir</button><button class="danger" onclick="deleteQuote(${q.id})">Apagar</button></div></div>`).join('');
}
function openQuote(id){
  const q=JSON.parse(localStorage.getItem('pintor_quotes')||'[]').find(x=>x.id===id); if(!q)return;
  $('client').value=q.client||'';$('phone').value=q.phone||'';$('address').value=q.address||'';$('job').value=q.job||'';$('validity').value=q.validity||15;$('notes').value=q.notes||'';
  document.querySelector(`input[name="areaMode"][value="${q.areaMode||'dimensions'}"]`).checked=true;
  $('houseArea').value=q.houseArea||100;$('wallFactor').value=q.wallFactor||2.5;
  toggleMode(); calc(); document.querySelector('[data-tab="quote"]').click();
}
function deleteQuote(id){localStorage.setItem('pintor_quotes',JSON.stringify(JSON.parse(localStorage.getItem('pintor_quotes')||'[]').filter(q=>q.id!==id)));renderHistory();}
function toggleMode(){
  const mode=document.querySelector('input[name="areaMode"]:checked').value;
  $('dimensionsBox').classList.toggle('hidden',mode!=='dimensions');
  $('houseBox').classList.toggle('hidden',mode!=='house');
  calc();
}
function saveSettings(){
  const ids=['company','nif','companyPhone','email','companyAddress'];
  const s={};ids.forEach(id=>s[id]=$(id).value);localStorage.setItem('pintor_settings',JSON.stringify(s));alert('Definições guardadas.');
}
function loadSettings(){const s=JSON.parse(localStorage.getItem('pintor_settings')||'{}');Object.entries(s).forEach(([k,v])=>{if($(k))$(k).value=v;});}
function shareQuote(){
  const c=calc(), text=`Pintor PRO Portugal\nÁrea de pintura: ${c.a.paintArea.toFixed(2)} m²\nTinta: ${c.liters.toFixed(2)} L\nTotal: ${euro(c.total)}`;
  if(navigator.share) navigator.share({title:'Orçamento Pintor PRO',text}); else navigator.clipboard?.writeText(text).then(()=>alert('Resumo copiado.'));
}
function newQuote(){document.querySelectorAll('input[type="text"],input[type="tel"],input[type="email"],textarea').forEach(e=>e.value='');$('job').value='Pintura interior';calc();document.querySelector('[data-tab="calc"]').click();}

document.querySelectorAll('input,select,textarea').forEach(e=>e.addEventListener('input',calc));
document.querySelectorAll('input[name="areaMode"]').forEach(e=>e.addEventListener('change',toggleMode));
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('tab-'+b.dataset.tab).classList.add('active');if(b.dataset.tab==='history')renderHistory();}));
$('saveBtn').onclick=saveQuote;$('shareBtn').onclick=shareQuote;$('printBtn').onclick=()=>window.print();$('settingsBtn').onclick=saveSettings;$('newQuoteBtn').onclick=newQuote;
loadSettings();toggleMode();renderHistory();
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
