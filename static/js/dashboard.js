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
          var items = data.slice(0, 3);
          list.innerHTML = items.map(function (o) {
            var apy = (o.apy !== undefined && o.apy !== null) ? o.apy + '%' : '--';
            var risk = o.risk || 'n/a';
            return '<div class="rec-item">'
              + '<span class="cell-pair">' + (o.name || o.id) + '</span>'
              + '<span class="cell-apy">' + apy + '</span>'
              + '<span class="cell-risk">' + risk + '</span>'
              + '</div>';
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
      list.textContent = 'Connect wallet to see balance';
      list.className = 'dashboard__list dashboard__list--compact';
      return;
    }
    list.innerHTML = '<p class="loading">Loading…</p>';
    list.className = 'dashboard__list dashboard__list--compact';
    fetch('/api/balances?address=' + encodeURIComponent(address))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.balances && data.balances.length) {
          var items = data.balances.slice(0, 4);
          list.innerHTML = items.map(function (b) {
            return '<div class="balance-row">'
              + '<span class="cell-asset">' + (b.symbol || b.denom) + '</span>'
              + '<span class="cell-amount">' + (b.amount || '0') + '</span>'
              + '</div>';
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
          var maxRecs = recs.slice(0, 2);
          list.innerHTML = maxRecs.map(function (r) {
            var html = '<div class="rec-item" data-action-id="' + (r.id || '') + '"><h4>' + (r.title || r.id) + '</h4><p>' + (r.description || '') + '</p>';
            html += '<button type="button" class="btn btn-primary btn-execute" data-action-id="' + (r.id || '') + '">Execute</button></div>';
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
  var bridgeForm = document.getElementById('bridge-form');
  var btnBridgePreview = document.getElementById('btn-bridge-preview');
  var bridgeSummary = document.getElementById('bridge-summary');

  function bridgeValues() {
    var fromChain = document.getElementById('bridge-from-chain');
    var asset = document.getElementById('bridge-asset');
    var amount = document.getElementById('bridge-amount');
    var destination = document.getElementById('bridge-destination');
    return {
      from_chain: fromChain ? fromChain.value : '',
      asset: asset ? asset.value : '',
      amount: amount ? amount.value : '',
      destination: destination ? destination.value.trim() : ''
    };
  }

  function renderBridgeSummary(values) {
    if (!bridgeSummary) return;
    bridgeSummary.classList.add('ready');
    bridgeSummary.textContent =
      'You will bridge ' + values.amount + ' ' + values.asset + ' from '
      + values.from_chain + ' to ' + values.destination + '.';
  }

  function validateBridge(values) {
    var numericAmount = Number(values.amount);
    if (!values.destination) return 'Destination address is required';
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 'Amount must be greater than 0';
    return '';
  }

  if (btnBridgePreview) {
    btnBridgePreview.addEventListener('click', function () {
      var values = bridgeValues();
      var error = validateBridge(values);
      if (error) {
        showToast(error, 'error');
        return;
      }
      renderBridgeSummary(values);
      showToast('Bridge preview ready', 'success');
    });
  }

  if (bridgeForm) {
    bridgeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var address = getAddress();
      if (!address) {
        showToast('Connect wallet first', 'error');
        return;
      }
      var values = bridgeValues();
      var error = validateBridge(values);
      if (error) {
        showToast(error, 'error');
        return;
      }
      fetch('/api/execute-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address,
          action_id: 'bridge_in',
          params: values
        })
      })
        .then(function (r) { return r.json(); })
        .then(function () {
          renderBridgeSummary(values);
          showToast('Bridge transaction prepared. Confirm in wallet.', 'success');
        })
        .catch(function () {
          showToast('Bridge preparation failed', 'error');
        });
    });
  }

  var btnHelpOpen = document.getElementById('btn-help-open');
  var btnHelpClose = document.getElementById('btn-help-close');
  var helpModal = document.getElementById('help-modal');
  if (btnHelpOpen && helpModal) {
    btnHelpOpen.addEventListener('click', function () {
      helpModal.classList.remove('hidden');
    });
  }
  if (btnHelpClose && helpModal) {
    btnHelpClose.addEventListener('click', function () {
      helpModal.classList.add('hidden');
    });
  }
  if (helpModal) {
    helpModal.addEventListener('click', function (e) {
      if (e.target === helpModal) helpModal.classList.add('hidden');
    });
  }

  function syncBridgeDestination() {
    var destinationInput = document.getElementById('bridge-destination');
    if (!destinationInput) return;
    destinationInput.value = getAddress() || '';
  }

  if (btnBridge) {
    syncBridgeDestination();
  }

  window.addEventListener('yieldmind:wallet-connected', loadBalances);
  window.addEventListener('yieldmind:wallet-connected', syncBridgeDestination);
  window.addEventListener('yieldmind:wallet-disconnected', function () {
    var list = document.getElementById('balances-list');
    if (list) {
      list.textContent = 'Connect wallet to see balance';
      list.className = 'dashboard__list dashboard__list--compact';
    }
    syncBridgeDestination();
  });

  loadOpportunities();
  loadBalances();
})();
