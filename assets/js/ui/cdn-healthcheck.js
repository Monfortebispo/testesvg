
  // Verifica passados alguns segundos se as bibliotecas externas chegaram a carregar
  setTimeout(function(){
    var missing = [];
    if (typeof Chart === 'undefined') missing.push('Chart.js');
    // XLSX é carregado sob pedido na v18 para reduzir o arranque.
    if (missing.length) {
      var b = document.getElementById('cdnWarningBanner');
      if (b) b.style.display = 'block';
      console.error('Bibliotecas externas não carregadas:', missing.join(', '));
    }
  }, 4000);
