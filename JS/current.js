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
      if (!isNaN(tempNum)) checkTempRefSimple();
    })
    .catch(e => console.error('setTempRef error', e));
}




//TEMP LISTENER: read TEMP value, update thermometer and icon
var TEMPREF = db.ref("/TEMP");

TEMPREF.on('value', (snapshot) => {
  const tempNum = Number(snapshot.val());
  console.log('TEMP listener #1 fired, value:', snapshot.val(), 'as number:', tempNum);
  if (isNaN(tempNum)) {
    console.warn('TEMP is NaN');
    return;
  }

  updateThermometer(tempNum);  // animated thermometer
});

// Live update: when the stored reference changes, re-evaluate the current TEMP and update icon immediately
db.ref(REF_TEMP_PATH).on('value', (snap) => {
  const v = snap.val();
  tempRefValue = (v === null) ? 0 : Number(v);

  // read current TEMP once and check temperature reference
  db.ref("/TEMP").once('value')
    .then(tempSnap => {
      const tempNum = Number(tempSnap.val());
      if (!isNaN(tempNum)) checkTempRefSimple();
    })
    .catch(err => console.error('Failed to refresh temp icon after REF change', err));
});


// When TEMP changes, check against reference and update toAltera
TEMPREF.on('value', (snapshot) => {
  const tempNum = Number(snapshot.val());
  console.log('TEMP listener #2 fired, value:', snapshot.val(), 'as number:', tempNum);
  if (isNaN(tempNum)) {
    console.warn('TEMP is NaN in listener #2');
    return;
  }

  updateThermometer(tempNum);
  console.log('Calling checkTempRefSimple...');
  checkTempRefSimple();
});

// When TEMP_REF changes, re-check and update toAltera
db.ref(REF_TEMP_PATH).on('value', (snap) => {
  const v = snap.val();
  tempRefValue = (v === null) ? 0 : Number(v);

  db.ref("/TEMP").once('value')
    .then(tempSnap => {
      const tempNum = Number(tempSnap.val());
      if (!isNaN(tempNum)) checkTempRefSimple();
    })
    .catch(err => console.error('Failed to refresh temp icon after REF change', err));
});

// Compare TEMP vs TEMP_REF and write value to /toAltera directly
function checkTempRefSimple() {
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
    // if TEMP_REF > TEMP -> write 64, else write 65
    const result = (ref > t) ? 64 : 65;
    console.log('checkTempRefSimple: TEMP=', t, 'TEMP_REF=', ref, '-> writing', result);
    return db.ref('/toAltera').set(result)
      .then(() => {
        console.log('checkTempRefSimple write succeeded:', result);
        return result;
      });
  })
  .catch(err => {
    console.error('checkTempRefSimple error', err);
    return null;
  });
}

// HUMIDITY SENSOR 
var HUMTREF = db.ref("/HUMIDITY");
HUMTREF.on('value', (snapshot) => {
  const hum = Number(snapshot.val());
  if (!isNaN(hum)) updateHumidity(hum);
});

// LIGHT SENSOR 
var LDRREF = db.ref("/fromAltera/A");
LDRREF.on('value', (snapshot) => {
  const lux = Number(snapshot.val());
  if (!isNaN(lux)) updateLightLevel(lux);
});


// WIND SPEED SENSOR 
var SPEEDREF = db.ref("/fromAltera/B");
SPEEDREF.on('value', (snapshot) => {
  const speed = Number(snapshot.val());
  if (!isNaN(speed)) updateWindSpeed(speed);
});


// WIND DIRECTION SENSOR 
var DIREF = db.ref("/fromAltera/C");

DIREF.on('value', (snapshot) => {
  const raw = snapshot.val();
  if (!raw) return;

  const dir = String(raw).trim().toLowerCase();

  const directionMap = {
    n: 0,
    north: 0,
    ne: 45,
    e: 90,
    east: 90,
    se: 135,
    s: 180,
    south: 180,
    sw: 225,
    w: 270,
    west: 270,
    nw: 315
  };

  const degrees = directionMap[dir];

  if (degrees !== undefined) {
    updateCompass(degrees); // 🔥 SEND VALUE TO FUNCTION
  }
});


// mapping: enable button -> 0, buzzerBtn1..4 -> 1..4
const BUZZER_MAP = {
  ENABLEBTN: 0,
  buzzerBtn1: 1,
  buzzerBtn2: 2,
  buzzerBtn3: 3,
  buzzerBtn4: 4
};

// Track last value set from UI (prevents unwanted auto-reset)
let lastUserBuzzerValue = 0;
let allowZeroFromUI = false;

// Keep UI in sync with Firebase BUT ignore unwanted auto-zero
db.ref("/toAltera").on('value', (snap) => {
  const raw = snap.val();
  console.log('toAltera listener fired, raw:', raw);
  if (raw === null) return;

  const val = Number(raw);
  if (Number.isNaN(val)) return;

  // Ignore automatic zero unless explicitly allowed
  if (val === 0 && !allowZeroFromUI) {
    return;
  }

  lastUserBuzzerValue = val;

  Object.keys(BUZZER_MAP).forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;

    const btnVal = BUZZER_MAP[id];

    btn.classList.toggle('active', val === btnVal);
    btn.setAttribute('aria-pressed', val === btnVal ? 'true' : 'false');
  });
});

// Attach click events
function attachBuzzerButtons(ids = []) {
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;

    const mappedVal = BUZZER_MAP[id];
    if (mappedVal === undefined) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();

      if (mappedVal === 0) {
        // ENABLE button resets intentionally
        allowZeroFromUI = true;
        buzzerOn(0).then(() => {
          lastUserBuzzerValue = 0;
          allowZeroFromUI = false;
        });
        return;
      }

      // Regular buzzer buttons (1–4)
      buzzerOn(mappedVal).then(() => {
        lastUserBuzzerValue = mappedVal;
      });
    });
  });
}

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

// compass
function updateCompass(degrees) {
  const arrow = document.getElementById("compassArrow");
  arrow.style.transform = `translate(-50%, -100%) rotate(${degrees}deg)`;

  document.getElementById("directionLabel").innerText =
    `${degrees}° (${getCardinalDirection(degrees)})`;
}

function getCardinalDirection(deg) {
  const directions = ["N","NE","E","SE","S","SW","W","NW"];
  return directions[Math.round(deg / 45) % 8];
}
// thermometer
function updateThermometer(tempValue) {
  const minTemp = -10;
  const maxTemp = 50;

  const percent =
    ((tempValue - minTemp) / (maxTemp - minTemp)) * 100;

  const clamped = Math.max(0, Math.min(100, percent));

  const fill = document.getElementById("thermoFill");
  const label = document.getElementById("tempLabel");
  const valueText = document.getElementById("tempValue");

  if (fill) fill.style.height = clamped + "%";
  if (label) label.innerText = tempValue + "°C";
  if (valueText)
    valueText.innerText =
      "The Temperature is: " + tempValue + " °C";
}

//water drop
function updateHumidity(humidity) {
  const percent = Math.max(0, Math.min(100, humidity));

  const fill = document.getElementById("dropFill");
  const label = document.getElementById("humLabel");

  if (fill) fill.style.height = percent + "%";
  if (label) label.innerText = percent + "%";
}

//anemometer

function updateWindSpeed(speed) {
  const rotor = document.getElementById("rotor");
  const label = document.getElementById("speedLabel");

  if (!rotor) return;

  // Higher speed = faster rotation
  const duration = Math.max(0.2, 5 / Math.max(1, speed));

  rotor.style.animationDuration = duration + "s";

  if (label) label.innerText = speed + " km/h";
}

  //sun
function updateLightLevel(lux) {
  const sun = document.getElementById("sun");
  const label = document.getElementById("luxLabel");

  if (!sun) return;

  const intensity = Math.min(100, lux);

  const glowSize = 20 + intensity * 0.8;

  sun.style.boxShadow =
    `0 0 ${glowSize}px rgba(255,193,7,${0.5 + intensity/200})`;

  sun.style.transform =
    `scale(${1 + intensity / 300})`;

  if (label) label.innerText = lux + " Lux";
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
