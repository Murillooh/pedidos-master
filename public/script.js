/* ═══════════════════════════════
   PARTÍCULAS BG
═══════════════════════════════ */
(function(){
  const bg = document.getElementById('bg');
  const colors = ['#f59e0b','#38bdf8','#a78bfa','#22c55e'];
  for(let i=0;i<18;i++){
    const d = document.createElement('div');
    d.className = 'dot';
    const s = Math.random()*6+4;
    d.style.cssText = `
      width:${s}px;height:${s}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      left:${Math.random()*100}%;
      animation-duration:${Math.random()*20+15}s;
      animation-delay:-${Math.random()*20}s;
    `;
    bg.appendChild(d);
  }
})();

/* ═══════════════════════════════
   MÁSCARAS
═══════════════════════════════ */
document.getElementById('f_tel').addEventListener('input',function(){
  let v = this.value.replace(/\D/g,'').slice(0,11);
  if(v.length>10) v=v.replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3');
  else if(v.length>6) v=v.replace(/^(\d{2})(\d{4})(\d{0,4})$/,'($1) $2-$3');
  else if(v.length>2) v=v.replace(/^(\d{2})(\d{0,5})$/,'($1) $2');
  else if(v.length>0) v=v.replace(/^(\d{0,2})$/,'($1');
  this.value = v;
});

document.getElementById('f_cep').addEventListener('input',function(){
  let v = this.value.replace(/\D/g,'').slice(0,8);
  if(v.length>5) v=v.replace(/^(\d{5})(\d{0,3})$/,'$1-$2');
  this.value = v;
  if(v.replace('-','').length===8) buscaCep(v.replace('-',''));
});

document.getElementById('f_estado').addEventListener('input',function(){
  this.value = this.value.replace(/[^a-zA-Z]/g,'').toUpperCase().slice(0,2);
});

/* ═══════════════════════════════
   VIACEP
═══════════════════════════════ */
function buscaCep(cep){
  const spin = document.getElementById('cep-spin');
  spin.style.display='block';
  fetch(`https://viacep.com.br/ws/${cep}/json/`)
    .then(r=>r.json())
    .then(d=>{
      spin.style.display='none';
      if(d.erro) return;
      const end = `${d.logradouro}${d.complemento?' — '+d.complemento:''}, ${d.bairro}, ${d.localidade} — ${d.uf}, CEP ${cep.replace(/^(\d{5})(\d{3})$/,'$1-$2')}`;
      document.getElementById('f_end').value = end;
      document.getElementById('f_cidade').value = d.localidade;
      document.getElementById('f_estado').value = d.uf;
      document.getElementById('f_end').classList.add('ok');
    })
    .catch(()=>{ spin.style.display='none'; });
}

/* ═══════════════════════════════
   CNPJ — MÁSCARA + VALIDAÇÃO
═══════════════════════════════ */
const cnpjEl = document.getElementById('f_cnpj');
const cnpjSt = document.getElementById('cnpj-status');

cnpjEl.addEventListener('input',function(){
  let v = this.value.replace(/\D/g,'').slice(0,14);
  if(v.length>12) v=v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/,'$1.$2.$3/$4-$5');
  else if(v.length>8) v=v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})$/,'$1.$2.$3/$4');
  else if(v.length>5) v=v.replace(/^(\d{2})(\d{3})(\d{0,3})$/,'$1.$2.$3');
  else if(v.length>2) v=v.replace(/^(\d{2})(\d{0,3})$/,'$1.$2');
  this.value = v;

  const raw = v.replace(/\D/g,'');
  cnpjSt.textContent='';
  this.classList.remove('ok','error');
  if(raw.length===14){
    if(validarCNPJ(raw)){
      this.classList.add('ok');
      cnpjSt.textContent='✔';
      cnpjSt.style.color='var(--success)';
    } else {
      this.classList.add('error');
      cnpjSt.textContent='✗';
      cnpjSt.style.color='var(--red)';
    }
  }
});

function validarCNPJ(c){
  if(c.length!==14||/^(\d)\1+$/.test(c)) return false;
  const calc=(s,n)=>{
    let sum=0,pos=n-7;
    for(let i=n;i>=1;i--){
      sum+=parseInt(s.charAt(n-i))*pos--;
      if(pos<2) pos=9;
    }
    const r=sum%11<2?0:11-sum%11;
    return r===parseInt(s.charAt(n));
  };
  return calc(c,12)&&calc(c,13);
}

/* ═══════════════════════════════
   QUANTIDADES
═══════════════════════════════ */
function qty(id, delta){
  const el = document.getElementById(id);
  const v = (parseInt(el.value)||0) + delta;
  el.value = Math.max(0, v);
}

/* ═══════════════════════════════
   TOAST
═══════════════════════════════ */
let toastTimer;
function showToast(msg){
  const t=document.getElementById('toast');
  document.getElementById('toast-msg').textContent=msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3500);
}

/* ═══════════════════════════════
   VALIDAÇÃO STEP 1
═══════════════════════════════ */
function validate1(){
  const fields=[
    {id:'f_master', label:'Nome da Master'},
    {id:'f_cidade', label:'Cidade'},
    {id:'f_estado', label:'Estado'},
    {id:'f_tel',    label:'Telefone'},
    {id:'f_cep',    label:'CEP'},
    {id:'f_end',    label:'Endereço de entrega'},
    {id:'f_cnpj',   label:'CNPJ'},
  ];
  let first=null;
  fields.forEach(f=>{
    const el=document.getElementById(f.id);
    el.classList.remove('error');
    if(!el.value.trim()){
      el.classList.add('error');
      if(!first) first={el,label:f.label};
    }
  });
  // CNPJ válido?
  const cnpjRaw=cnpjEl.value.replace(/\D/g,'');
  if(cnpjRaw.length===14&&!validarCNPJ(cnpjRaw)){
    cnpjEl.classList.add('error');
    if(!first) first={el:cnpjEl,label:'CNPJ inválido'};
  }
  if(first){
    first.el.focus();
    showToast(`Preencha corretamente: ${first.label}`);
    return false;
  }
  return true;
}

/* ═══════════════════════════════
   VALIDAÇÃO STEP 2
═══════════════════════════════ */
function validate2(){
  const total = +document.getElementById('n4').value
              + +document.getElementById('abf').value
              + +document.getElementById('abe').value;
  if(total===0){
    showToast('Informe ao menos 1 produto na solicitação');
    return false;
  }
  return true;
}

/* ═══════════════════════════════
   NAVEGAÇÃO
═══════════════════════════════ */
function showPane(n){
  [1,2,3].forEach(i=>{
    document.getElementById('pane'+i).style.display = i===n?'block':'none';
  });
  // steps
  [1,2,3].forEach(i=>{
    const si=document.getElementById('step-ind-'+i);
    const sc=document.getElementById('sc'+i);
    si.classList.remove('active','done');
    if(i<n){ si.classList.add('done'); sc.textContent='✓'; }
    else if(i===n){ si.classList.add('active'); sc.textContent=i; }
    else{ sc.textContent=i; }
  });
  document.getElementById('line1').style.width = n>1?'100%':'0%';
  document.getElementById('line2').style.width = n>2?'100%':'0%';
  window.scrollTo({top:0,behavior:'smooth'});
}

function goStep1(){ showPane(1); }
function goStep2(){
  if(document.getElementById('pane1').style.display==='none'){ showPane(2); return; }
  if(!validate1()) return;
  showPane(2);
}
function goStep3(){
  if(!validate2()) return;
  buildResumo();
  showPane(3);
}

/* ═══════════════════════════════
   RESUMO
═══════════════════════════════ */
function buildResumo(){
  const rows=[
    ['Master', V('f_master')],
    ['Cidade / Estado', `${V('f_cidade')} — ${V('f_estado')}`],
    ['Telefone', V('f_tel')],
    ['CNPJ', V('f_cnpj')],
    ['Endereço de Entrega', V('f_end')],
  ];
  const prods=[
    ['N4 — Rastreadores', V('n4')],
    ['AllBlock Full', V('abf')],
    ['AllBlock Eletrônico', V('abe')],
  ];
  const obs = V('f_obs');

  let html=`<div style="margin-bottom:16px">`;
  rows.forEach(([k,v])=>{
    html+=`<div class="sum-row"><span class="sum-key">${k}</span><span class="sum-val">${esc(v)}</span></div>`;
  });
  html+=`</div>`;
  html+=`<p style="font-size:.75rem;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;font-weight:600">Produtos</p>`;
  prods.forEach(([k,v])=>{
    html+=`<div class="sum-qty-row"><span>${k}</span><span>${v} un.</span></div>`;
  });
  if(obs) html+=`<div style="margin-top:14px;font-size:.82rem;color:var(--muted)"><b style="color:var(--text)">Obs:</b> ${esc(obs)}</div>`;

  document.getElementById('resumo').innerHTML=html;
}

function V(id){ return document.getElementById(id).value||''; }
function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ═══════════════════════════════
   ENVIO
═══════════════════════════════ */
function enviar(){
  // Aqui você conecta com seu backend / Google Apps Script / etc.
  // Por ora simulamos o sucesso:
  const detail = `
    <strong>Master:</strong> ${esc(V('f_master'))} — ${esc(V('f_cidade'))}/${esc(V('f_estado'))}<br>
    <strong>CNPJ:</strong> ${esc(V('f_cnpj'))}<br>
    <strong>N4:</strong> ${V('n4')} &nbsp;|&nbsp; <strong>AllBlock Full:</strong> ${V('abf')} &nbsp;|&nbsp; <strong>AllBlock Eletrônico:</strong> ${V('abe')}
  `;
  document.getElementById('success-detail').innerHTML=detail;
  [1,2,3].forEach(i=>document.getElementById('pane'+i).style.display='none');
  document.getElementById('successBox').classList.add('show');
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ═══════════════════════════════
   RESET
═══════════════════════════════ */
function resetForm(){
  ['f_master','f_cidade','f_estado','f_tel','f_cep','f_end','f_cnpj','f_obs'].forEach(id=>{
    const el=document.getElementById(id);
    el.value='';
    el.classList.remove('ok','error');
  });
  ['n4','abf','abe'].forEach(id=>document.getElementById(id).value=0);
  cnpjSt.textContent='';
  document.getElementById('successBox').classList.remove('show');
  showPane(1);
}

/* init */
showPane(1);
