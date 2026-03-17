/**
 * Wallet bar: connect / disconnect and address display.
 * In production, replace with InterwovenKit (@initia/interwovenkit-react) for real wallet connection and TX.
 */
(function () {
  const placeholder = document.getElementById('wallet-placeholder');
  const connected = document.getElementById('wallet-connected');
  const btnConnect = document.getElementById('btn-connect');
  const btnDisconnect = document.getElementById('btn-disconnect');
  const walletAddress = document.getElementById('wallet-address');
  const walletInitName = document.getElementById('wallet-init-name');

  const STORAGE_KEY = 'yieldmind_wallet_demo';

  function loadDemoWallet() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return null;
    }
  }

  function saveDemoWallet(data) {
    if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    else localStorage.removeItem(STORAGE_KEY);
  }

  function showConnected(addr, initName) {
    if (!placeholder || !connected) return;
    placeholder.classList.add('hidden');
    connected.classList.remove('hidden');
    if (walletAddress) walletAddress.textContent = addr ? addr.slice(0, 10) + '…' + addr.slice(-8) : '';
    if (walletInitName) walletInitName.textContent = initName ? initName + '.init' : '';
  }

  function showPlaceholder() {
    if (!placeholder || !connected) return;
    connected.classList.add('hidden');
    placeholder.classList.remove('hidden');
    saveDemoWallet(null);
  }

  function connect() {
    // Demo: use a fake address and .init name. Replace with InterwovenKit wallet connection.
    const demo = {
      address: 'init1' + Array.from({ length: 38 }, () => Math.random().toString(36)[2]).join(''),
      initName: 'yieldmind'
    };
    saveDemoWallet(demo);
    showConnected(demo.address, demo.initName);
    window.dispatchEvent(new CustomEvent('yieldmind:wallet-connected', { detail: demo }));
  }

  function disconnect() {
    showPlaceholder();
    window.dispatchEvent(new CustomEvent('yieldmind:wallet-disconnected'));
  }

  if (btnConnect) btnConnect.addEventListener('click', connect);
  if (btnDisconnect) btnDisconnect.addEventListener('click', disconnect);

  const stored = loadDemoWallet();
  if (stored && stored.address) {
    showConnected(stored.address, stored.initName);
  }
})();
