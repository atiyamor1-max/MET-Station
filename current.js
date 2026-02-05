const firebaseConfig = {
    apiKey: "AIzaSyDhQAe5KFGbfITB-m0R1unG6_-Pdhcinr8",
    authDomain: "meteorologic-8c713.firebaseapp.com",
    databaseURL: "https://meteorologic-8c713-default-rtdb.firebaseio.com",
    projectId: "meteorologic-8c713",
    storageBucket: "meteorologic-8c713.firebasestorage.app",
    messagingSenderId: "522749343978",
    appId: "1:522749343978:web:9ad8cf76a362c06ce93f93"
  };
  firebase.initializeApp(firebaseConfig)
  
  const db=firebase.database();

  // temperature reference
const REF_TEMP_PATH = "/TEMP_REF";
let tempRefValue = 0;

// keep local copy of the stored reference temperature
db.ref(REF_TEMP_PATH).on('value', (snap) => {
  const v = snap.val();
  tempRefValue = (v === null) ? 0 : Number(v);
    const input=document.getElementById('tempinput');
  input.value='';
});


// Additional TEMP listener that updates only the icon according to tempRefValue.
// This does not remove or change your existing TEMPREF.on listener.
db.ref("/TEMP").on('value', (snapshot) => {

  const data = snapshot.val();
  const tempNum = Number(data);
  if (isNaN(tempNum)) return; // nothing to do for non-numeric values

  const imgHtml = (tempNum > tempRefValue)
    ? '<i class="bi bi-thermometer-sun" style="font-size: 3rem"></i>'
    : '<i class="bi bi-thermometer-snow" style="font-size: 3rem"></i>';

  const el = document.getElementById("tempimg");
  if (el) el.innerHTML = imgHtml;
});

function setTempRef() {
  const input = document.getElementById("tempinput");
  if (!input) {
    alert('Temp input not found (id="tempinput")');
    return;
  }
  const raw = input.value;
  const num = Number(raw);
  if (raw === '' || isNaN(num)) {
    alert('Enter a valid number for reference temperature');
    return;
  }
  firebase.database().ref(REF_TEMP_PATH).set(num)
    .then(() => {
      tempRefValue = num; // update local immediately
      console.log('TEMP_REF set to', num);
      // IMMEDIATE UI UPDATE: read current TEMP and refresh icon right away
      return db.ref("/TEMP").once('value');
    })
    .then((tempSnap) => {
      if (!tempSnap) return;
      const tempNum = Number(tempSnap.val());
      if (!isNaN(tempNum)) updateTempIcon(tempNum);
    })
    .catch(e => console.error('setTempRef error', e));
}

// function to set reference temperature from input field
  //ALWAYS WORKS- PRINTING DATA FROM SENSOR

//Temperature SENSOR
db.ref(REF_TEMP_PATH).on('value', (snap) => {
  const v = snap.val();
  tempRefValue = (v === null) ? 0 : Number(v);
});

// --- ADDED: single function that updates the temp icon based on numeric value ---
function updateTempIcon(tempNum) {
  if (isNaN(tempNum)) return;
  const el = document.getElementById("tempimg");
  if (!el) return;
  el.innerHTML = (tempNum > tempRefValue)
    ? '<i class="bi bi-thermometer-sun" style="font-size: 3rem"></i>'
    : '<i class="bi bi-thermometer-snow" style="font-size: 3rem"></i>';
}


//  TEMP listener that updates only the icon according to tempRefValue.
// This now calls the new updateTempIcon function.
db.ref("/TEMP").on('value', (snapshot) => {
  const data = snapshot.val();
  const tempNum = Number(data);
  if (isNaN(tempNum)) return; // nothing to do for non-numeric values

  updateTempIcon(tempNum);
});


// ADD: define TEMPREF and update the numeric display + icon
var TEMPREF = db.ref("/TEMP");
TEMPREF.on('value', (snapshot) => {
  const data = snapshot.val();
  const tempNum = Number(data);
  const display = isNaN(tempNum) ? data : tempNum;
  const el = document.getElementById("tempValue");
  if (el) el.innerText = "The Temperature is: " + display + " °C";

  // call the existing function that sets the icon
  if (!isNaN(tempNum)) updateTempIcon(tempNum);
});

// Live update: when the stored reference changes, re-evaluate the current TEMP and update icon immediately
db.ref(REF_TEMP_PATH).on('value', (snap) => {
  const v = snap.val();
  tempRefValue = (v === null) ? 0 : Number(v);

  // read current TEMP once and update icon right away
  db.ref("/TEMP").once('value')
    .then(tempSnap => {
      const tempNum = Number(tempSnap.val());
      if (!isNaN(tempNum)) updateTempIcon(tempNum);
    })
    .catch(err => console.error('Failed to refresh temp icon after REF change', err));
});


function checkTempRefSimple() {
  // Read the measured TEMP and the stored TEMP_REF, compute 1 if TEMP > TEMP_REF else 0,
  // write that numeric result to /toAltera and return the written value.
  return Promise.all([
    db.ref('/TEMP').once('value'),
    db.ref(REF_TEMP_PATH).once('value')
  ])
  .then(([tempSnap, refSnap]) => {
    const t = Number(tempSnap.val());
    const ref = Number(refSnap.val());
    if (isNaN(t) || isNaN(ref)) {
      console.warn('checkTempRefSimple: missing numeric TEMP or TEMP_REF', tempSnap.val(), refSnap.val());
      return null;
    }
    // user requested: if TEMP_REF > TEMP -> write 0, else write 1
    const result = (ref > t) ? 64 : 65;
    return db.ref('/toAltera').set(result).then(() => result);
  })
  .catch(err => {
    console.error('checkTempRefSimple error', err);
    return null;
  });
}

// HUMIDITY SENSOR 
var HUMTREF = db.ref("/HUMIDITY");
HUMTREF.on('value', (snapshot) => {
  const data = snapshot.val();
  document.getElementById("humValue").innerText = `The Humidity level is: ${data} %`;

  if (Number(data) > 60) {
    document.getElementById("humimg").innerHTML = '<i class="bi bi-droplet-fill" style="font-size: 3rem"></i>';
  } else if (Number(data) >= 40 && Number(data) <= 60) {
    document.getElementById("humimg").innerHTML = '<i class="bi bi-droplet-half" style="font-size: 3rem"></i>';
  } else {
    document.getElementById("humimg").innerHTML = '<i class="bi bi-droplet" style="font-size: 3rem"></i>';
  }
});

// LIGHT SENSOR 
var LDRREF = db.ref("/A");
LDRREF.on('value', (snapshot) => {
  const data = snapshot.val();
  console.log('/A value:', data);
  document.getElementById("ldrValue").innerText = `The light level is: ${data} Lux`;

  if (Number(data) > 60) {
    document.getElementById("ldrimg").innerHTML = '<i class="bi bi-brightness-high-fill" style="font-size: 3rem"></i>';
  } else if (Number(data) >= 40 && Number(data) <= 60) {
    document.getElementById("ldrimg").innerHTML = '<i class="bi bi-brightness-high" style="font-size: 3rem"></i>';
  } else {
    document.getElementById("ldrimg").innerHTML = '<i class="bi bi-cloud-sun-fill" style="font-size: 3rem"></i>';
  }
});

// WIND SPEED SENSOR 
var SPEEDREF = db.ref("/B");
SPEEDREF.on('value', (snapshot) => {
  const data = snapshot.val();
  const speedNum = Number(data);
  const display = isNaN(speedNum) ? data : speedNum;
  document.getElementById("speedValue").innerText = `The wind speed is: ${display} km/h`;

  if (speedNum > 60) {
    document.getElementById("speedimg").innerHTML = '<i class="bi bi-cloud-fog2-fill" style="font-size: 3rem"></i>';
  } else if (speedNum >= 40 && speedNum <= 60) {
    document.getElementById("speedimg").innerHTML = '<i class="bi bi-cloud-fog2-fill" style="font-size: 3rem"></i>';
  } else {
    document.getElementById("speedimg").innerHTML = '<i class="bi bi-cloud-minus" style="font-size: 3rem"></i>';
  }
});

// WIND DIRECTION SENSOR 
var DIREF = db.ref("/C");
DIREF.on('value', (snapshot) => {
  const data = snapshot.val();
  const dir = (data === null) ? 'unknown' : String(data).trim().toLowerCase();
  document.getElementById("dirValue").innerText = `The wind comes from: ${dir}`;

  if (dir === 'north' || dir === 'n') {
    document.getElementById("dirimg").innerHTML = '<i class="bi bi-arrow-up-circle-fill" style="font-size: 3rem"></i>';
  } else if (dir === 'east' || dir === 'e') {
    document.getElementById("dirimg").innerHTML = '<i class="bi bi-arrow-right-circle-fill" style="font-size: 3rem"></i>';
  } else if (dir === 'south' || dir === 's') {
    document.getElementById("dirimg").innerHTML = '<i class="bi bi-arrow-down-circle-fill" style="font-size: 3rem"></i>';
  } else if (dir === 'west' || dir === 'w') {
    document.getElementById("dirimg").innerHTML = '<i class="bi bi-arrow-left-circle-fill" style="font-size: 3rem"></i>';
  } else {
    document.getElementById("dirimg").innerHTML = ''; // or default icon
  }
});



// turn buzzer off (0)
function buzzerOff() {
  return db.ref("/toAltera").set(0)
    .then(() => 0)
    .catch(err => {
      console.error('buzzerOff error', err);
      return 0;
    });
}

// mapping: enable button -> 0, buzzerBtn1..4 -> 4..7
const BUZZER_MAP = {
  ENABLEBTN: 0,
  buzzerBtn1: 1,
  buzzerBtn2: 2,
  buzzerBtn3: 3,
  buzzerBtn4: 4
};

// keep the button UI in sync with /toAltera numeric value (preserve original labels)
db.ref("/toAltera").on('value', (snap) => {
  const val = Number(snap.val()) || 0;

  // update single generic button (if present) but keep its original label
  const singleBtn = document.getElementById('buzzerBtn');
  if (singleBtn) {
    if (!singleBtn.dataset.originalText) singleBtn.dataset.originalText = singleBtn.innerText;
    singleBtn.dataset.buzzer = String(val);
    singleBtn.classList.toggle('active', val !== 0);
    singleBtn.innerText = (val !== 0) ? `${singleBtn.dataset.originalText} — Active (${val})` : singleBtn.dataset.originalText;
  }

  // update mapped buttons: only toggle active state, keep labels
  Object.keys(BUZZER_MAP).forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const btnVal = BUZZER_MAP[id];
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerText;
    btn.dataset.buzzer = String(val);
    btn.classList.toggle('active', val === btnVal);
    btn.setAttribute('aria-pressed', val === btnVal ? 'true' : 'false');
  });
});

// attach events to multiple buzzer buttons;
// changed: buttons 1..4 now only set their mapped value on click and do NOT auto-reset.
// ENABLEBTN (mapped to 0) sets 0 when clicked — only ENABLEBTN resets the buzzer.
function attachBuzzerButtons(ids = []) {
  ids.forEach((id, idx) => {
    const btn = document.getElementById(id);
    if (!btn) {
      console.warn(`buzzer button not found: #${id}`);
      return;
    }
    if (btn.dataset.buzzerAttached === '1') return; // already attached
    btn.dataset.buzzerAttached = '1';

    // determine mapped value: prefer BUZZER_MAP, then data-buzzerval; if none -> skip
    const mapped = (BUZZER_MAP.hasOwnProperty(id) ? BUZZER_MAP[id] : null);
    const dataAttr = (typeof btn.dataset.buzzerval !== 'undefined') ? Number(btn.dataset.buzzerval) : null;
    const mappedVal = (mapped !== null) ? mapped : (Number.isFinite(dataAttr) ? dataAttr : null);

    if (mappedVal === null) {
      console.warn(`No buzzer value for #${id} (add to BUZZER_MAP or set data-buzzerval). Skipping attachment.`);
      return;
    }

    btn.dataset.buzzerval = String(mappedVal);

    // store original label so listener won't overwrite it later
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerText;

    // NEW: click sets the mapped value (for ENABLEBTN mappedVal === 0 => resets)
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (mappedVal === 0) {
        // enable button: explicitly write 0 (reset)
        buzzerOn(0);
        return;
      }
      // set this button's value and keep it until ENABLEBTN is pressed
      buzzerOn(mappedVal);
    });
  });
}

// ensure it's attached after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  attachBuzzerButtons(['ENABLEBTN','buzzerBtn1','buzzerBtn2','buzzerBtn3','buzzerBtn4']);
});

// history page listeners

// Save temperature to history
TEMPREF.on('value', (snapshot) => {
  const data = snapshot.val();
  db.ref("history/temperature").push(data);
});

// Save humidity to history
HUMTREF.on('value', (snapshot) => {
  const data = snapshot.val();
  db.ref("history/humidity").push(data);
});

// Save light level to history
LDRREF.on('value', (snapshot) => {
  const data = snapshot.val();
  db.ref("history/light").push(data);
});

// Save wind speed
SPEEDREF.on('value', (snapshot) => {
  const data = snapshot.val();
  db.ref("history/speed").push(data);
});

// Save wind direction
DIREF.on('value', (snapshot) => {
  const data = snapshot.val();
  db.ref("history/direction").push(data);
});

// Simple buzzer functions: write 1 or 0 and return a Promise that resolves to the written value.
function buzzerOn(val) {
  if (typeof val === 'undefined' || val === null) {
    console.warn('buzzerOn called without a value — no write performed');
    return Promise.resolve(0);
  }
  const v = Number(val);
  if (Number.isNaN(v)) {
    console.error('buzzerOn invalid value', val);
    return Promise.resolve(0);
  }
  return db.ref("/toAltera").set(v)
    .then(() => v)
    .catch(err => {
      console.error('buzzerOn error', err);
      return 0;
    });
}
// simple cam preview listener: set <img id="camPreview"> src to http://{camIp}:81/
db.ref("/camIp").once('value', (snap) => {
  const ip = snap.val();
  const img = document.getElementById('camPreview');
  if (!img) return;
  if (ip) {
    img.src = `http://${String(ip).trim()}:81/stream`;
  } else {
    img.src = '';
  }
});
