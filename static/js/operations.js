/**
 * Operations page: send, receive, bridge, transaction history.
 */
(function () {
  function getAddress() {
    if (window.__yieldmindWalletAddress) return window.__yieldmindWalletAddress;
    var el = document.getElementById('wallet-address');
    if (!el) return null;
    return el.getAttribute('data-full-address') || null;
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

  function toUinit(amountStr) {
    if (!amountStr) return null;
    var normalized = String(amountStr).trim();
    if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
    var parts = normalized.split('.');
    var whole = parts[0] || '0';
    var frac = (parts[1] || '').slice(0, 6).padEnd(6, '0');
    var units = BigInt(whole) * 1000000n + BigInt(frac);
    return units > 0n ? units.toString() : null;
  }

  function postHistory(payload) {
    return fetch('/api/tx-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function () {});
  }

  function lookupTx(txHash) {
    if (!txHash) return Promise.resolve({ exists: false, reason: 'empty' });
    return fetch('/api/tx-lookup?tx_hash=' + encodeURIComponent(txHash))
      .then(function (r) { return r.json(); })
      .catch(function () { return { exists: false, reason: 'lookup_failed' }; });
  }

  var tabButtons = Array.from(document.querySelectorAll('.ops-tab'));
  var panels = Array.from(document.querySelectorAll('.ops-panel'));
  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tab = btn.getAttribute('data-tab');
      tabButtons.forEach(function (b) { b.classList.toggle('active', b === btn); });
      panels.forEach(function (p) {
        p.classList.toggle('active', p.getAttribute('data-panel') === tab);
      });
    });
  });

  var sendForm = document.getElementById('send-form');
  var sendToAddress = document.getElementById('send-to-address');
  var sendAmount = document.getElementById('send-amount');
  var sendTxHash = document.getElementById('send-tx-hash');
  var btnOpenExplorer = document.getElementById('btn-open-explorer');
  var lastTxHash = '';
  var receiveAddressEl = document.getElementById('receive-wallet-address');
  var btnCopyReceive = document.getElementById('btn-copy-receive');

  function syncReceiveAddress() {
    var address = getAddress();
    if (!receiveAddressEl) return;
    if (!address) {
      receiveAddressEl.textContent = 'Connect wallet to view address';
      if (btnCopyReceive) btnCopyReceive.disabled = true;
      return;
    }
    receiveAddressEl.textContent = address;
    if (btnCopyReceive) btnCopyReceive.disabled = false;
  }

  if (btnCopyReceive) {
    btnCopyReceive.addEventListener('click', function () {
      var address = getAddress();
      if (!address) {
        showToast('Connect wallet first', 'error');
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address)
          .then(function () { showToast('Address copied', 'success'); })
          .catch(function () { showToast('Copy failed, please copy manually', 'error'); });
        return;
      }
      showToast('Clipboard is not available in this browser', 'error');
    });
  }

  function setTxHash(hash) {
    lastTxHash = hash || '';
    if (!sendTxHash) return;
    sendTxHash.textContent = lastTxHash || 'Tx hash will appear here';
    if (btnOpenExplorer) btnOpenExplorer.disabled = false;
  }

  if (btnOpenExplorer) {
    btnOpenExplorer.addEventListener('click', function () {
      var url = 'https://scan.testnet.initia.xyz';
      if (lastTxHash) {
        url += '/txs/' + encodeURIComponent(lastTxHash);
      } else {
        showToast('No tx hash yet. Opening explorer home.', 'success');
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  if (sendForm) {
    sendForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var from = getAddress();
      if (!from) {
        showToast('Connect wallet first', 'error');
        return;
      }
      var to = sendToAddress ? sendToAddress.value.trim() : '';
      var amountInput = sendAmount ? sendAmount.value : '';
      var amountUinit = toUinit(amountInput);
      if (!to || !to.startsWith('init')) {
        showToast('Enter a valid Initia address', 'error');
        return;
      }
      if (!amountUinit) {
        showToast('Enter an amount greater than 0', 'error');
        return;
      }
      var walletApi = window.yieldmindWalletApi;
      if (!walletApi || typeof walletApi.sendToken !== 'function') {
        showToast('Wallet send API is not ready', 'error');
        return;
      }
      showToast('Waiting for wallet signature...', 'success');
      walletApi.sendToken({
        toAddress: to,
        amountUinit: amountUinit,
        memo: 'YieldMind transfer'
      })
        .then(function (result) {
          var txHash = result.txHash || '';
          return lookupTx(txHash).then(function (lookup) {
            setTxHash(txHash);
            if (lookup.exists) {
              showToast('Transaction confirmed on explorer', 'success');
              return postHistory({
                address: from,
                kind: 'send',
                status: 'success',
                tx_hash: txHash,
                network: 'onchain',
                details: { to: to, amount_init: amountInput }
              });
            }
            showToast('Transaction submitted, but not indexed yet. Check again in 20-60 seconds.', 'success');
            return postHistory({
              address: from,
              kind: 'send',
              status: 'pending',
              tx_hash: txHash,
              network: 'pending',
              details: { to: to, amount_init: amountInput, lookup_reason: lookup.reason || 'unknown' }
            });
          }).then(loadTxHistory);
        })
        .catch(function (err) {
          var msg = (err && err.message) ? err.message : 'Transaction failed';
          showToast(msg, 'error');
          postHistory({
            address: from,
            kind: 'send',
            status: 'failed',
            network: 'demo',
            details: { to: to, amount_init: amountInput, reason: msg }
          }).then(loadTxHistory);
        });
    });
  }

  var bridgeForm = document.getElementById('bridge-form');
  var btnBridgePreview = document.getElementById('btn-bridge-preview');
  var bridgeSummary = document.getElementById('bridge-summary');

  function bridgeValues() {
    return {
      from_chain: (document.getElementById('bridge-from-chain') || {}).value || '',
      asset: (document.getElementById('bridge-asset') || {}).value || '',
      amount: (document.getElementById('bridge-amount') || {}).value || '',
      destination: ((document.getElementById('bridge-destination') || {}).value || '').trim()
    };
  }

  function renderBridgeSummary(values) {
    if (!bridgeSummary) return;
    bridgeSummary.classList.add('ready');
    bridgeSummary.textContent = 'You will bridge ' + values.amount + ' ' + values.asset + ' from ' + values.from_chain + ' to ' + values.destination + '.';
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
      var walletApi = window.yieldmindWalletApi;
      if (walletApi && typeof walletApi.openBridgeIn === 'function') {
        Promise.resolve(walletApi.openBridgeIn({
          fromChain: values.from_chain,
          asset: values.asset,
          amount: values.amount,
          destination: values.destination
        }))
          .then(function () {
            renderBridgeSummary(values);
            showToast('Bridge flow opened. Complete it in the wallet modal.', 'success');
            return postHistory({
              address: address,
              kind: 'bridge',
              status: 'pending',
              network: 'external',
              details: values
            });
          })
          .then(loadTxHistory)
          .catch(function (err) {
            var msg = (err && err.message) ? err.message : 'Bridge flow failed to open';
            showToast(msg, 'error');
          });
        return;
      }

      // Safety fallback for environments where bridge API is unavailable.
      showToast('Bridge wallet flow is unavailable, using demo preparation', 'error');
      fetch('/api/execute-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address, action_id: 'bridge_in', params: values })
      })
        .then(function (r) { return r.json(); })
        .then(function (payload) {
          renderBridgeSummary(values);
          var demo = payload.demo_execution || {};
          showToast(demo.message || 'Bridge prepared in demo mode', 'success');
          return postHistory({
            address: address,
            kind: 'bridge',
            status: demo.applied ? 'success' : 'pending',
            network: 'demo',
            details: values
          });
        })
        .then(loadTxHistory)
        .catch(function () {
          showToast('Bridge preparation failed', 'error');
        });
    });
  }

  function loadTxHistory() {
    var list = document.getElementById('tx-history-list');
    var address = getAddress();
    if (!list) return;
    if (!address) {
      list.innerHTML = '<p class="loading">Connect wallet to load history.</p>';
      return;
    }
    list.innerHTML = '<p class="loading">Loading history...</p>';
    fetch('/api/tx-history?address=' + encodeURIComponent(address))
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows) || !rows.length) {
          list.innerHTML = '<p class="loading">No transactions yet.</p>';
          return;
        }
        list.innerHTML = rows.map(function (tx) {
          var statusClass = tx.status === 'success' ? 'tx-success' : (tx.status === 'failed' ? 'tx-failed' : 'tx-pending');
          var hasExplorerLink = tx.network === 'onchain' && !!tx.tx_hash;
          var hashHtml = hasExplorerLink
            ? '<a href="https://scan.testnet.initia.xyz/txs/' + encodeURIComponent(tx.tx_hash) + '" target="_blank" rel="noopener noreferrer">' + tx.tx_hash.slice(0, 18) + '...</a>'
            : '<span class="muted">' + (tx.network === 'demo' ? 'simulated' : (tx.network === 'pending' ? 'indexing...' : (tx.network === 'external' ? 'in wallet flow' : '-'))) + '</span>';
          return '<div class="tx-row">'
            + '<span>' + (tx.kind || '-') + '</span>'
            + '<span class="' + statusClass + '">' + (tx.status || '-') + '</span>'
            + '<span>' + hashHtml + '</span>'
            + '<span class="muted">' + (tx.time || '-') + '</span>'
            + '</div>';
        }).join('');
      })
      .catch(function () {
        list.innerHTML = '<p class="loading">Failed to load history.</p>';
      });
  }

  function syncBridgeDestination() {
    var destinationInput = document.getElementById('bridge-destination');
    if (!destinationInput) return;
    destinationInput.value = getAddress() || '';
  }

  window.addEventListener('yieldmind:wallet-connected', function () {
    syncBridgeDestination();
    syncReceiveAddress();
    loadTxHistory();
  });
  window.addEventListener('yieldmind:wallet-disconnected', function () {
    syncBridgeDestination();
    syncReceiveAddress();
    setTxHash('');
    loadTxHistory();
  });

  syncBridgeDestination();
  syncReceiveAddress();
  loadTxHistory();
})();

