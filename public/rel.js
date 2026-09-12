async function carregarRelatorios(){
  try{
    var r=await fetch('/dados_rel');var d=await r.json();
    document.getElementById('stat-total').innerText =d.totalRegas;
    document.getElementById('stat-hoje').innerText  =d.regasHoje;
    document.getElementById('stat-media').innerText =d.mediaDiaria.toFixed(1);
    document.getElementById('stat-nivel').innerText =Math.round(d.nivelAgua)+'%';
    var hist=d.historico;var el=document.getElementById('historico-rel');
    if(!hist||hist.length===0){
      el.innerHTML='<div class="empty-hist"><i class="fa-solid fa-seedling"></i>Nenhuma rega registrada ainda.</div>';
    }else{
      el.innerHTML='';
      hist.forEach(function(h){
        el.innerHTML+=
          '<div class="hist-item">'
          +'<div class="hi-time"><i class="fa-solid fa-calendar-day"></i>'+h.data+'&nbsp;&nbsp;<i class="fa-solid fa-clock"></i>'+h.hora+'</div>'
          +'<div class="hi-row">'
          +'<span><i class="fa-solid fa-droplet"></i>'+Math.round(h.umidade)+'% umidade</span>'
          +'<span><i class="fa-solid fa-bucket"></i>'+Math.round(h.nivel)+'% reserv.</span>'
          +'</div></div>';
      });
    }
    var ctx=document.getElementById('chart-regas').getContext('2d');
    if(window._chartRegas)window._chartRegas.destroy();
    window._chartRegas=new Chart(ctx,{
      type:'bar',
      data:{labels:d.labels,datasets:[{label:'Regas',data:d.regasPorDia,
        backgroundColor:'rgba(109,179,63,0.30)',borderColor:'#6db33f',
        borderWidth:2,borderRadius:8,borderSkipped:false}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return' '+c.raw+' regas';}}}},
        scales:{
          y:{beginAtZero:true,ticks:{stepSize:1,color:'#4e7535',font:{family:"'DM Mono',monospace",size:11}},
             grid:{color:'rgba(109,179,63,0.10)'}},
          x:{ticks:{color:'#4e7535',font:{family:"'Space Grotesk',sans-serif",size:11}},grid:{display:false}}
        }}
    });
  }catch(e){console.error(e);}
}
var toggle=document.querySelector('.sidebar-toggle');
var sidebar=document.querySelector('.sidebar-rel');
var overlay=document.querySelector('.sidebar-overlay');
function openSidebar(){sidebar.classList.add('open');overlay.classList.add('open');}
function closeSidebar(){sidebar.classList.remove('open');overlay.classList.remove('open');}
toggle.addEventListener('click',openSidebar);
overlay.addEventListener('click',closeSidebar);
carregarRelatorios();setInterval(carregarRelatorios,5000);
