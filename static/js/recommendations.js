/**
 * AI Recommendations page: examples, recommendations list, prediction chart.
 */
(function () {
  function getAddress() {
    if (window.__yieldmindWalletAddress) return window.__yieldmindWalletAddress;
    var el = document.getElementById('wallet-address');
    return el ? (el.getAttribute('data-full-address') || null) : null;
  }

  function showToast(message, type) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 4000);
  }

  var currentRecommendations = [];

  Array.from(document.querySelectorAll('.rec-example')).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var prompt = btn.getAttribute('data-prompt') || '';
      var input = document.getElementById('recommend-message');
      if (input) input.value = prompt;
    });
  });

  function drawPrediction(series, recommendationTitle) {
    var canvas = document.getElementById('prediction-chart');
    var note = document.getElementById('prediction-note');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!series || !series.points || !series.points.length) {
      if (note) note.textContent = 'No historical data available for this recommendation.';
      return;
    }

    var values = series.points.map(function (p) { return Number(p); });
    var minV = Math.min.apply(null, values);
    var maxV = Math.max.apply(null, values);
    var pad = 24;
    var w = canvas.width - pad * 2;
    var h = canvas.height - pad * 2;

    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.moveTo(pad, canvas.height - pad);
    ctx.lineTo(canvas.width - pad, canvas.height - pad);
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, canvas.height - pad);
    ctx.stroke();

    ctx.strokeStyle = '#7c8dff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    values.forEach(function (value, i) {
      var x = pad + (i / Math.max(values.length - 1, 1)) * w;
      var yRatio = (value - minV) / Math.max(maxV - minV, 0.0001);
      var y = canvas.height - pad - yRatio * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    values.forEach(function (value, i) {
      var x = pad + (i / Math.max(values.length - 1, 1)) * w;
      var yRatio = (value - minV) / Math.max(maxV - minV, 0.0001);
      var y = canvas.height - pad - yRatio * h;
      ctx.fillStyle = '#c7d2fe';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    var trend = values[values.length - 1] - values[0];
    var trendText = trend >= 0 ? 'uptrend' : 'downtrend';
    if (note) {
      note.textContent = recommendationTitle + ': historical APY shows a ' + trendText + ' (' + values[0].toFixed(1) + '% -> ' + values[values.length - 1].toFixed(1) + '%).';
    }
  }

  function loadOpportunityHistoryFor(rec) {
    return fetch('/api/opportunity-history')
      .then(function (r) { return r.json(); })
      .then(function (history) {
        var series = null;
        if (history && Array.isArray(history.series)) {
          series = history.series.find(function (s) { return s.id === rec.id; }) || history.series[0];
        }
        drawPrediction(series, rec.title || rec.id || 'Selected recommendation');
      })
      .catch(function () {
        drawPrediction(null, '');
      });
  }

  function executeRecommendation(rec) {
    var address = getAddress();
    if (!address) {
      showToast('Connect wallet first', 'error');
      return;
    }
    fetch('/api/execute-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: address, action_id: rec.id, params: rec.params || {} })
    })
      .then(function (r) { return r.json(); })
      .then(function (payload) {
        var demo = payload.demo_execution || {};
        showToast(demo.message || 'Execution request submitted', 'success');
      })
      .catch(function () {
        showToast('Execution failed', 'error');
      });
  }

  function renderRecommendations(recs) {
    var list = document.getElementById('recommendations-list');
    if (!list) return;
    if (!recs.length) {
      list.innerHTML = '<p class="loading">No recommendations</p>';
      return;
    }
    list.innerHTML = recs.map(function (r, idx) {
      return '<div class="rec-item rec-item--select" data-rec-index="' + idx + '">'
        + '<h4>' + (r.title || r.id) + '</h4>'
        + '<p>' + (r.description || '') + '</p>'
        + '<button type="button" class="btn btn-primary btn-execute">Execute</button>'
        + '</div>';
    }).join('');

    Array.from(list.querySelectorAll('.rec-item--select')).forEach(function (node) {
      node.addEventListener('click', function (e) {
        var idx = Number(node.getAttribute('data-rec-index'));
        var rec = currentRecommendations[idx];
        if (!rec) return;
        if (e.target && e.target.classList.contains('btn-execute')) {
          executeRecommendation(rec);
          e.stopPropagation();
        } else {
          loadOpportunityHistoryFor(rec);
        }
      });
    });

    loadOpportunityHistoryFor(recs[0]);
  }

  var recommendForm = document.getElementById('recommend-form');
  if (recommendForm) {
    recommendForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var address = getAddress();
      if (!address) {
        showToast('Connect wallet first', 'error');
        return;
      }
      var msgEl = document.getElementById('recommend-message');
      var message = msgEl && msgEl.value ? msgEl.value.trim() : '';
      var list = document.getElementById('recommendations-list');
      if (list) list.innerHTML = '<p class="loading">Getting recommendations...</p>';
      fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address, message: message })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          currentRecommendations = data.recommendations || [];
          renderRecommendations(currentRecommendations);
        })
        .catch(function () {
          if (list) list.innerHTML = '<p class="loading">Recommendation request failed</p>';
          showToast('Recommendation request failed', 'error');
        });
    });
  }

  window.addEventListener('yieldmind:wallet-disconnected', function () {
    var list = document.getElementById('recommendations-list');
    if (list) list.innerHTML = '<p class="loading">Connect wallet to request recommendations.</p>';
    drawPrediction(null, '');
  });
})();

