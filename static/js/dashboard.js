/**
 * Dashboard page: balances + top opportunities + APY chart.
 */
(function () {
  function getAddress() {
    if (window.__yieldmindWalletAddress) return window.__yieldmindWalletAddress;
    var el = document.getElementById('wallet-address');
    if (!el) return null;
    var fromAttr = el.getAttribute('data-full-address');
    return fromAttr || null;
  }

  function loadBalances() {
    var list = document.getElementById('balances-list');
    var address = getAddress();
    if (!list) return;
    if (!address) {
      list.textContent = 'Connect wallet to see balance';
      return;
    }
    list.innerHTML = '<p class="loading">Loading...</p>';
    fetch('/api/balances?address=' + encodeURIComponent(address))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var items = (data.balances || []).slice(0, 6);
        if (!items.length) {
          list.innerHTML = '<p class="loading">No balances</p>';
          return;
        }
        list.innerHTML = items.map(function (b) {
          return '<div class="balance-row"><span class="cell-asset">' + (b.symbol || b.denom) + '</span><span class="cell-amount">' + (b.amount || '0') + '</span></div>';
        }).join('');
      })
      .catch(function () {
        list.innerHTML = '<p class="loading">Failed to load</p>';
      });
  }

  function drawOpportunitiesChart(items) {
    var canvas = document.getElementById('opportunities-chart');
    if (!canvas || !items || !items.length) return;
    var note = document.getElementById('opportunities-chart-note');
    var ctx = canvas.getContext('2d');
    var width = canvas.width;
    var height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    var values = items.map(function (o) { return Number(o.apy || 0); });
    var maxVal = Math.max.apply(null, values.concat([1]));
    var barW = Math.max(90, Math.floor((width - 120) / items.length));
    var gap = 30;
    var startX = 50;
    var baseY = height - 40;

    ctx.fillStyle = '#8fa3ff';
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.moveTo(35, 15);
    ctx.lineTo(35, baseY);
    ctx.lineTo(width - 20, baseY);
    ctx.stroke();

    items.forEach(function (o, i) {
      var value = Number(o.apy || 0);
      var h = Math.max(8, Math.round((value / maxVal) * (height - 80)));
      var x = startX + i * (barW + gap);
      var y = baseY - h;
      ctx.fillStyle = '#6472ff';
      ctx.fillRect(x, y, barW, h);
      ctx.fillStyle = '#c7d2fe';
      ctx.font = '14px sans-serif';
      ctx.fillText((value || 0).toFixed(1) + '%', x + 8, y - 8);
      ctx.fillStyle = '#9fb0d8';
      ctx.font = '13px sans-serif';
      var label = (o.name || o.id || '').slice(0, 18);
      ctx.fillText(label, x + 4, baseY + 18);
    });

    if (note) {
      var top = items.reduce(function (acc, it) {
        return Number(it.apy || 0) > Number(acc.apy || 0) ? it : acc;
      }, items[0]);
      note.textContent = 'Highest APY currently: ' + (top.name || top.id) + ' (' + (top.apy || '0') + '%)';
    }
  }

  function loadOpportunities() {
    var list = document.getElementById('opportunities-list');
    if (!list) return;
    fetch('/api/opportunities')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var items = Array.isArray(data) ? data.slice(0, 4) : [];
        if (!items.length) {
          list.innerHTML = '<p class="loading">No opportunities</p>';
          return;
        }
        list.innerHTML = items.map(function (o) {
          return '<div class="rec-item"><span class="cell-pair">' + (o.name || o.id) + '</span><span class="cell-apy">' + (o.apy || '--') + '%</span><span class="cell-risk">' + (o.risk || 'n/a') + '</span></div>';
        }).join('');
        drawOpportunitiesChart(items);
      })
      .catch(function () {
        list.innerHTML = '<p class="loading">Failed to load</p>';
      });
  }

  window.addEventListener('yieldmind:wallet-connected', loadBalances);
  window.addEventListener('yieldmind:wallet-disconnected', loadBalances);
  loadBalances();
  loadOpportunities();
})();
