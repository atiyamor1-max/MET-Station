// Initialize Firebase only if not already initialized
if (!window.firebase) {
  alert('Firebase not loaded. Include firebase-app.js and firebase-database.js before this script.');
}
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

function sendMessage() {
  console.log('sendMessage called');
  if (!window.firebase) {
    alert('Firebase not loaded. Include firebase-app.js and firebase-database.js before this script.');
    return;
  }
  const emailEl = document.getElementById('email');
  const messageEl = document.getElementById('message');
  if (!emailEl || !messageEl) {
    alert('Inputs with id="email" and id="message" must exist in the HTML.');
    console.error('Missing inputs:', { emailEl, messageEl });
    return;
  }

  const email = emailEl.value.trim();
  const message = messageEl.value.trim();

  if (!email || !message) {
    alert('Please fill email and message.');
    return;
  }
  if (!isValidEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }

  const payload = { email, message, ts: firebase.database.ServerValue.TIMESTAMP };
  console.log('Pushing payload:', payload);

  db.ref('contact/messages').push(payload)
    .then(ref => {
      console.log('Push succeeded, key:', ref.key);
      alert('Message sent.');
      emailEl.value = '';
      messageEl.value = '';
    })
    .catch(err => {
      console.error('sendMessage error', err);
      alert('Failed to send message. See console for details.');
    });
}
// email  validator
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}