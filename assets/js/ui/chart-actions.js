
(function(){
  'use strict';
  if(window.__VG_CHART_ACTIONS__) return;
  window.__VG_CHART_ACTIONS__ = true;

  var scanTimer = null;
  var currentCanvas = null;

  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function cleanText(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function stop(ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); } }
  function slug(s){ return cleanText(s || 'grafico').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase() || 'grafico'; }

  function toast(msg){
    var el = q('#vgcToast');
    if(!el){ el = document.createElement('div'); el.id = 'vgcToast'; el.className = 'vgc-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el.__t);
    el.__t = setTimeout(function(){ el.classList.remove('show'); }, 2600);
  }

  function getChart(canvas){
    try{ if(window.Chart && typeof window.Chart.getChart === 'function') return window.Chart.getChart(canvas); }catch(e){}
    try{
      if(window.Chart && window.Chart.instances){
        var inst = window.Chart.instances;
        if(Array.isArray(inst)){
          for(var i=0;i<inst.length;i++){ if(inst[i] && inst[i].canvas === canvas) return inst[i]; }
        }else{
          for(var k in inst){ if(inst[k] && inst[k].canvas === canvas) return inst[k]; }
        }
      }
    }catch(e){}
    return null;
  }

  function isVisibleCanvas(canvas){
    if(!canvas || canvas.closest('#vgcChartModal')) return false;
    var r = canvas.getBoundingClientRect();
    var w = canvas.width || r.width || canvas.offsetWidth || 0;
    var h = canvas.height || r.height || canvas.offsetHeight || 0;
    if(w < 40 || h < 30) return false;
    if(r.width <= 0 && r.height <= 0 && canvas.offsetParent === null) return false;
    return true;
  }

  function canvasHasInk(canvas){
    try{
      if(!isVisibleCanvas(canvas) || !canvas.getContext) return false;
      var w = canvas.width || 0;
      var h = canvas.height || 0;
      if(w < 40 || h < 30) return false;
      var ctx = canvas.getContext('2d', {willReadFrequently:true});
      if(!ctx) return false;
      var stepX = Math.max(1, Math.floor(w / 14));
      var stepY = Math.max(1, Math.floor(h / 10));
      var painted = 0;
      var samples = 0;
      for(var y=0; y<h; y+=stepY){
        for(var x=0; x<w; x+=stepX){
          var p = ctx.getImageData(x,y,1,1).data;
          samples++;
          var a = p[3];
          var blank = a < 8 || (p[0] > 246 && p[1] > 246 && p[2] > 246) || (p[0] > 236 && p[1] > 236 && p[2] > 236 && Math.abs(p[0]-p[1]) < 4 && Math.abs(p[1]-p[2]) < 4);
          if(!blank){ painted++; if(painted >= 2) return true; }
          if(samples > 180) return painted >= 2;
        }
      }
      return false;
    }catch(e){
      return !!getChart(canvas);
    }
  }

  function findContainer(canvas){
    if(!canvas || !canvas.closest) return null;
    var selectors = [
      '.chart-card','.chart-box','.card','.glass-card','.panel','.section-card','.content-card','.kpi-card',
      '.rt-chart','.ri-card','.ri-chart','.occ-chart-card','.ig-chart-card','.pl-panel','.cua-card','.ca-card',
      '.dashboard-card','.widget','.widget-card','.analytics-card','.graph-card','.metric-card'
    ].join(',');
    var card = canvas.closest(selectors);
    if(card) return card;
    var p = canvas.parentElement;
    while(p && p !== document.body){
      if(p.querySelectorAll && p.querySelectorAll('canvas').length <= 2) return p;
      p = p.parentElement;
    }
    return canvas.parentElement;
  }

  function titleFrom(card, canvas){
    var parts = [];
    if(card){
      var t = q('h1,h2,h3,h4,.card-title,.section-title,.chart-title,.widget-title,.kpi-title,.ri-title,.occ-title,.ig-title,.pl-title,.rt-title', card);
      if(t) parts.push(cleanText(t.textContent));
      var prev = card.previousElementSibling;
      if(prev && /^H[1-4]$/i.test(prev.tagName || '')) parts.push(cleanText(prev.textContent));
    }
    try{
      var ch = getChart(canvas);
      var ct = ch && ch.options && ch.options.plugins && ch.options.plugins.title && ch.options.plugins.title.text;
      if(Array.isArray(ct)) ct = ct.join(' ');
      if(ct) parts.unshift(cleanText(ct));
    }catch(e){}
    if(canvas && canvas.id) parts.push(canvas.id);
    return parts.filter(Boolean)[0] || 'Gráfico';
  }

  function bestCanvas(card, fallback){
    var list = qa('canvas', card || document).filter(isVisibleCanvas);
    if(!list.length) return fallback;
    var painted = list.filter(canvasHasInk);
    var pool = painted.length ? painted : list;
    pool.sort(function(a,b){
      var ra = a.getBoundingClientRect();
      var rb = b.getBoundingClientRect();
      return ((b.width || rb.width || 0) * (b.height || rb.height || 0)) - ((a.width || ra.width || 0) * (a.height || ra.height || 0));
    });
    return pool[0] || fallback;
  }

  function canvasToJpeg(canvas, scale){
    // Base: usar o tamanho CSS real do canvas (não o buffer interno, que já
    // pode estar escalado pelo devicePixelRatio). Multiplicar o buffer outra
    // vez por "scale" duplicava a escala em ecrãs Retina e ficava curto em
    // ecrãs com devicePixelRatio=1 (comum em monitores externos sem scaling).
    var r = canvas.getBoundingClientRect();
    var cssW = Math.max(1, Math.round(r.width) || canvas.width || 1200);
    var cssH = Math.max(1, Math.round(r.height) || canvas.height || 720);
    var dpr = window.devicePixelRatio || 1;
    // Tamanho máximo real do modal nesta janela (espelha o CSS
    // .vgc-modal{width:min(1220px,96vw); height:min(790px,92vh)}),
    // descontando o padding interno do host (~40px).
    var modalMaxW = Math.max(200, Math.min(1220, window.innerWidth * 0.96) - 40);
    var modalMaxH = Math.max(200, Math.min(790, window.innerHeight * 0.92) - 100);
    // A imagem usa object-fit:contain dentro do modal: a dimensão que
    // "limita" o tamanho final de exibição é a que dá o factor MENOR
    // (é essa que bate primeiro no limite da caixa), não a maior.
    var fitScale = Math.min(modalMaxW / cssW, modalMaxH / cssH);
    // O essencial: garantir pelo menos o dobro da densidade de pixels
    // necessária para o tamanho REAL a que a imagem vai ser mostrada no
    // modal (fitScale × 2), independentemente do devicePixelRatio do
    // ecrã ou de qualquer valor fixo legado passado em "scale".
    var targetScale = Math.max(scale || 2.2, dpr * 2, fitScale * 2);
    targetScale = Math.min(targetScale, 4); // limite para não gerar imagens absurdamente grandes/lentas
    var tmp = document.createElement('canvas');
    tmp.width = Math.round(cssW * targetScale);
    tmp.height = Math.round(cssH * targetScale);
    var ctx = tmp.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,tmp.width,tmp.height);
    try{ ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; }catch(e){}
    ctx.drawImage(canvas, 0, 0, tmp.width, tmp.height);
    return tmp.toDataURL('image/jpeg', .94);
  }

  function downloadCanvas(canvas, card){
    try{
      var live = bestCanvas(card, canvas);
      if(!live){ toast('Não encontrei o gráfico para guardar.'); return; }
      var a = document.createElement('a');
      a.href = canvasToJpeg(live, 2.4);
      a.download = slug(titleFrom(card, live)) + '.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('Gráfico guardado em JPEG.');
    }catch(e){
      console.error('VG chart JPEG error', e);
      toast('Não foi possível guardar este gráfico.');
    }
  }

  function printCanvas(canvas, card){
    try{
      var live = bestCanvas(card, canvas);
      if(!live){ toast('Não encontrei o gráfico para imprimir.'); return; }
      var title = titleFrom(card, live).replace(/[<>]/g,'');
      var data = canvasToJpeg(live, 2.2);
      var w = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=850');
      if(!w){ toast('O browser bloqueou a janela de impressão.'); return; }
      w.document.open();
      w.document.write('<!doctype html><html><head><title>'+title+'</title><style>html,body{margin:0;background:#fff;font-family:Arial,sans-serif}header{padding:18px 22px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:800}main{padding:18px}img{width:100%;height:auto;display:block}@media print{header{display:none}main{padding:0}}</style></head><body><header>'+title+'</header><main><img src="'+data+'"></main><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>');
      w.document.close();
    }catch(e){
      console.error('VG chart print error', e);
      toast('Não foi possível imprimir este gráfico.');
    }
  }

  function ensureModal(){
    var m = q('#vgcChartModal');
    if(m) return m;
    m = document.createElement('div');
    m.id = 'vgcChartModal';
    m.className = 'vgc-modal-backdrop';
    m.innerHTML = '<div class="vgc-modal" role="dialog" aria-modal="true" aria-label="Gráfico expandido"><div class="vgc-modal-head"><div class="vgc-modal-title"><strong id="vgcModalTitle">Gráfico</strong><span>Janela expandida · guardar em JPEG ou imprimir</span></div><div class="vgc-modal-actions"><button class="vgc-modal-btn" data-vgc="download">Guardar JPEG</button><button class="vgc-modal-btn" data-vgc="print">Imprimir</button><button class="vgc-modal-btn primary" data-vgc="close">Fechar</button></div></div><div class="vgc-modal-body"><div class="vgc-modal-host" id="vgcModalHost"></div></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function(ev){ if(ev.target === m) closeModal(); });
    q('[data-vgc="close"]', m).addEventListener('click', closeModal);
    q('[data-vgc="download"]', m).addEventListener('click', function(){ if(currentCanvas) downloadCanvas(currentCanvas.canvas, currentCanvas.card); });
    q('[data-vgc="print"]', m).addEventListener('click', function(){ if(currentCanvas) printCanvas(currentCanvas.canvas, currentCanvas.card); });
    document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape' && m.classList.contains('open')) closeModal(); });
    return m;
  }

  function openModal(canvas, card){
    var live = bestCanvas(card, canvas);
    var m = ensureModal();
    var host = q('#vgcModalHost', m);
    var title = titleFrom(card, live);
    currentCanvas = {canvas: live, card: card};
    q('#vgcModalTitle', m).textContent = title;
    host.innerHTML = '';
    try{
      var img = document.createElement('img');
      img.alt = title;
      img.src = canvasToJpeg(live, 2.6);
      host.appendChild(img);
    }catch(e){
      console.error('VG chart expand error', e);
      host.innerHTML = '<div class="vgc-modal-empty">Não foi possível expandir este gráfico.<br>O gráfico original pode ainda não estar desenhado.</div>';
    }
    m.classList.add('open');
  }

  function closeModal(){
    var m = q('#vgcChartModal');
    if(!m) return;
    m.classList.remove('open');
    document.body.classList.remove('vgc-printing');
    var host = q('#vgcModalHost', m);
    if(host) host.innerHTML = '';
    currentCanvas = null;
  }

  function attach(canvas){
    if(!isVisibleCanvas(canvas) || canvas.__vgcActions) return;
    var card = findContainer(canvas);
    if(!card || card.__vgcActionsAttached) return;
    card.__vgcActionsAttached = true;
    card.classList.add('vgc-chart-card');
    try{ if(getComputedStyle(card).position === 'static') card.style.position = 'relative'; }catch(e){ card.style.position = 'relative'; }
    var actions = document.createElement('div');
    actions.className = 'vgc-chart-actions';
    actions.innerHTML = '<button type="button" class="vgc-chart-action" data-vgc-action="expand" title="Expandir">⛶</button><button type="button" class="vgc-chart-action" data-vgc-action="jpeg" title="Guardar JPEG">⬇</button><button type="button" class="vgc-chart-action" data-vgc-action="print" title="Imprimir">⎙</button>';
    actions.addEventListener('click', function(ev){
      var btn = ev.target.closest('[data-vgc-action]');
      if(!btn) return;
      stop(ev);
      card.classList.remove('vgc-chart-pulse');
      void card.offsetWidth;
      card.classList.add('vgc-chart-pulse');
      var action = btn.getAttribute('data-vgc-action');
      var live = bestCanvas(card, canvas);
      if(action === 'expand') openModal(live, card);
      if(action === 'jpeg') downloadCanvas(live, card);
      if(action === 'print') printCanvas(live, card);
    });
    card.appendChild(actions);
    canvas.__vgcActions = true;
  }

  function scan(){
    qa('canvas').forEach(function(c){
      if(c.closest('#vgcChartModal')) return;
      attach(c);
    });
  }

  function scheduleScan(delay){
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, delay || 180);
  }

  function init(){
    scan();
    [300,800,1500,3000,5000].forEach(function(t){ setTimeout(scan, t); });
    try{
      var mo = new MutationObserver(function(){ scheduleScan(220); });
      mo.observe(document.body, {childList:true, subtree:true});
    }catch(e){}
    ['click','change','input'].forEach(function(evt){
      document.addEventListener(evt, function(){ scheduleScan(260); }, true);
    });
    window.addEventListener('resize', function(){ scheduleScan(220); });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
