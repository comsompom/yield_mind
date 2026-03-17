/**
 * Dashboard: load balances, opportunities, submit recommend form, execute intent.
 * Wallet address is read from the wallet bar (or demo storage) for API calls.
 */
(function () {
  function getAddress() {
    const el = document.getElementById('wallet-address');
    if (!el) return null;
    const stored = localStorage.getItem('yieldmind_wallet_demo');
    if (stored) {
      try {
        const o = JSON.parse(stored);
        return o && o.address ? o.address : null;
      } catch (_) {}
    }
    return null;
  }

  function showToast(message, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 4000);
  }

  function loadOpportunities() {
    const list = document.getElementById('opportunities-list');
    if (!list) return;
    fetch('/api/opportunities')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (Array.isArray(data)) {
          list.innerHTML = data.map(function (o) {
            return '<div class="rec-item"><h4>' + (o.name || o.id) + '</h4><p>APY ' + (o.apy || '') + '% · ' + (o.risk || '') + '</p></div>';
          }).join('');
        } else {
          list.innerHTML = '<p class="loading">No opportunities</p>';
        }
      })
      .catch(function () {
        list.innerHTML = '<p class="loading">Failed to load</p>';
      });
  }

  function loadBalances() {
    const list = document.getElementById('balances-list');
    const address = getAddress();
    if (!list) return;
    if (!address) {
      list.textContent = '— Connect wallet —';
      return;
    }
    list.innerHTML = '<p class="loading">Loading…</p>';
    fetch('/api/balances?address=' + encodeURIComponent(address))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.balances && data.balances.length) {
          list.innerHTML = data.balances.map(function (b) {
            return '<div class="rec-item">' + (b.symbol || b.denom) + ': ' + (b.amount || '0') + '</div>';
          }).join('');
        } else {
          list.innerHTML = '<p class="loading">No balances</p>';
        }
      })
      .catch(function () {
        list.innerHTML = '<p class="loading">Failed to load</p>';
      });
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
      var message = (msgEl && msgEl.value) ? msgEl.value.trim() : '';
      var list = document.getElementById('recommendations-list');
      if (list) list.innerHTML = '<p class="loading">Getting recommendations…</p>';
      fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address, message: message })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var recs = data.recommendations || [];
          if (!list) return;
          if (recs.length === 0) {
            list.innerHTML = '<p class="loading">No recommendations</p>';
            return;
          }
          list.innerHTML = recs.map(function (r) {
            var html = '<div class="rec-item" data-action-id="' + (r.id || '') + '"><h4>' + (r.title || r.id) + '</h4><p>' + (r.description || '') + '</p><span class="risk">' + (r.risk || '') + '</span>';
            html += ' <button type="button" class="btn btn-primary btn-execute" data-action-id="' + (r.id || '') + '">Execute</button></div>';
            return html;
          }).join('');
          list.querySelectorAll('.btn-execute').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var actionId = btn.getAttribute('data-action-id');
              executeIntent(actionId);
            });
          });
        })
        .catch(function () {
          if (list) list.innerHTML = '<p class="loading">Request failed</p>';
          showToast('Recommend request failed', 'error');
        });
    });
  }

  function executeIntent(actionId) {
    var address = getAddress();
    if (!address) {
      showToast('Connect wallet first', 'error');
      return;
    }
    fetch('/api/execute-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: address, action_id: actionId, params: {} })
    })
      .then(function (r) { return r.json(); })
      .then(function (payload) {
        // In production: pass payload to InterwovenKit to sign/send.
        showToast('TX payload ready — sign in wallet (InterwovenKit)', 'success');
      })
      .catch(function () {
        showToast('Execute failed', 'error');
      });
  }

  var btnBridge = document.getElementById('btn-bridge');
  if (btnBridge) {
    btnBridge.addEventListener('click', function () {
      // In production: open Interwoven Bridge UI (e.g. modal or new tab).
      showToast('Open Interwoven Bridge (integrate @initia/interwovenkit-react)', 'success');
    });
  }

  window.addEventListener('yieldmind:wallet-connected', loadBalances);
  window.addEventListener('yieldmind:wallet-disconnected', function () {
    var list = document.getElementById('balances-list');
    if (list) list.textContent = '— Connect wallet —';
  });

  loadOpportunities();
  loadBalances();
})();
