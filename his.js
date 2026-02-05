// Initialize firebase only if not already initialized
if (!firebase.apps || firebase.apps.length === 0) {
  firebase.initializeApp({
    apiKey: "AIzaSyDhQAe5KFGbfITB-m0R1unG6_-Pdhcinr8",
    authDomain: "meteorologic-8c713.firebaseapp.com",
    databaseURL: "https://meteorologic-8c713-default-rtdb.firebaseio.com",
    projectId: "meteorologic-8c713",
    storageBucket: "meteorologic-8c713.firebasestorage.app",
    messagingSenderId: "522749343978",
    appId: "1:522749343978:web:9ad8cf76a362c06ce93f93"
  });
}

const db = firebase.database();

function loadHistory(path, listId) {
    db.ref(path).limitToLast(100).on("value", snapshot => {
      const list = document.getElementById(listId);
      if (!list) return;
      list.innerHTML = "";

      // collect entries then reverse so newest appear at top
      const entries = [];
      snapshot.forEach(entry => entries.push({ key: entry.key, val: entry.val() }));
      entries.reverse();

      entries.forEach(item => {
        const li = document.createElement("li");
        li.className = "list-group-item";

        const v = item.val;
        let displayVal = '';
        let ts = null;

        if (v && typeof v === 'object') {
          // if history stored as object like { value: ..., ts: ... }
          if ('value' in v) displayVal = String(v.value);
          else if ('val' in v) displayVal = String(v.val);
          else displayVal = JSON.stringify(v);
          ts = v.ts || v.timestamp || v.time || null;
        } else {
          displayVal = String(v);
        }

        // fallback to push-id time if no ts stored
        if (!ts) ts = decodePushTimestamp(item.key);

        const timeStr = ts ? formatTimestamp(ts) : '';
        li.textContent = timeStr ? `${timeStr} — ${displayVal}` : displayVal;
        list.appendChild(li);
      });
    });
  }

  // ADDED: helpers to get timestamp from push-id and format in Israel timezone
  const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  function decodePushTimestamp(pushId) {
    if (!pushId || pushId.length < 8) return null;
    let ts = 0;
    for (let i = 0; i < 8; i++) {
      const idx = PUSH_CHARS.indexOf(pushId.charAt(i));
      if (idx === -1) return null;
      ts = ts * 64 + idx;
    }
    return ts;
  }
  function formatTimestamp(ms) {
    if (!ms) return '';
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'Asia/Jerusalem'
    }).format(new Date(Number(ms)));
  }

  // helper to prepend a single history entry to a list
  function prependHistoryItem(listId, key, valObj) {
    const list = document.getElementById(listId);
    if (!list) return;
    const li = document.createElement('li');
    li.className = 'list-group-item';

    let displayVal = '';
    let ts = null;
    if (valObj && typeof valObj === 'object') {
      displayVal = ('value' in valObj) ? String(valObj.value) : JSON.stringify(valObj);
      ts = valObj.ts || valObj.timestamp || null;
    } else {
      displayVal = String(valObj);
    }
    if (!ts) ts = decodePushTimestamp(key);

    const timeStr = ts ? formatTimestamp(ts) : '';
    li.textContent = timeStr ? `${timeStr} — ${displayVal}` : displayVal;

    // insert at top
    if (list.firstChild) list.insertBefore(li, list.firstChild);
    else list.appendChild(li);
  }

  // subscribe for new items (real-time, newest at top)
  function watchHistory(path, listId) {
    const ref = db.ref(path);
    // clear existing
    const list = document.getElementById(listId);
    if (list) list.innerHTML = '';
    // use onChildAdded to get new pushes as they happen
    ref.limitToLast(100).on('child_added', (snap) => {
      prependHistoryItem(listId, snap.key, snap.val());
    });
  }

  // start watchers
  watchHistory('history/temperature', 'history-temperature');
  watchHistory('history/humidity', 'history-humidity');
  watchHistory('history/light', 'history-light');
  watchHistory('history/speed', 'history-speed');
  watchHistory('history/direction', 'history-direction');
