var historico=[];
function mostrarHistorico(){
  var h=document.getElementById('historico');h.innerHTML='';
  if(historico.length===0){h.innerHTML='<div style="color:rgba(200,236,170,0.5);font-size:13px;padding:10px 0">Nenhuma pergunta ainda.</div>';return;}
  historico.forEach(function(c){
    h.innerHTML+=
      '<div class="hist">'
      +'<b><i class="fa-solid fa-circle-question"></i> Pergunta</b>'+c.p
      +'<br><b><i class="fa-solid fa-robot"></i> Resposta</b>'+c.r
      +'</div>';
  });
}
async function perguntar(){
  var q=document.getElementById('q').value.trim();if(!q)return;
  document.getElementById('res').innerText='Pensando...';
  try{
    var resp=await fetch('/perguntar_ia?q='+encodeURIComponent(q));
    if(!resp.ok){document.getElementById('res').innerText='Erro HTTP: '+resp.status;return;}
    var txt=await resp.text();
    document.getElementById('res').innerText=txt;
    historico.unshift({p:q,r:txt});
    if(historico.length>10)historico.length=10;
    mostrarHistorico();
  }catch(e){document.getElementById('res').innerText='Erro na conexão: '+e.message;}
}
var toggle=document.querySelector('.sidebar-toggle');
var sidebar=document.querySelector('.sidebar-hist');
var overlay=document.querySelector('.sidebar-overlay');
function openSidebar(){sidebar.classList.add('open');overlay.classList.add('open');}
function closeSidebar(){sidebar.classList.remove('open');overlay.classList.remove('open');}
toggle.addEventListener('click',openSidebar);
overlay.addEventListener('click',closeSidebar);
mostrarHistorico();
