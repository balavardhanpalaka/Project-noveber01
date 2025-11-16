// app.js — client-side logic for index.html
// IMPORTANT: create a Firebase project and replace the firebaseConfig object below.
// This file uses Firebase compat libraries for simplicity.

const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const gateEl = document.getElementById('gate');
const uploaderEl = document.getElementById('uploader');
const galleryEl = document.getElementById('gallery');
const enterBtn = document.getElementById('enter-btn');
const createBtn = document.getElementById('create-btn');
const dopInput = document.getElementById('dop-input');

const fileInput = document.getElementById('file-input');
const captionInput = document.getElementById('caption-input');
const uploadBtn = document.getElementById('upload-btn');
const finishBtn = document.getElementById('finish-btn');
const uploadStatus = document.getElementById('upload-status');
const myCodeEl = document.getElementById('my-code');
const codeText = document.getElementById('code-text');
const shareLink = document.getElementById('share-link');
const itemsEl = document.getElementById('items');

let currentDop = null;
let currentShareId = null; // Firestore doc id for this session's uploads

function genCode(len = 6){
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // avoid ambiguous chars
  let out = "";
  for(let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

enterBtn.addEventListener('click', ()=> {
  const val = dopInput.value.trim();
  if(!val){ alert('Enter your DOP or create one.'); return; }
  currentDop = val;
  gateEl.classList.add('hidden');
  uploaderEl.classList.remove('hidden');
  galleryEl.classList.remove('hidden');
  // sign in anonymously for uploads (Firebase rules should be set accordingly)
  auth.signInAnonymously().catch(console.error);
  loadMyUploads(); // try to load existing uploads for this DOP
});

createBtn.addEventListener('click', ()=> {
  // convenience: generate a DOP for user (they can change)
  const newDop = prompt('Create a DOP (a secret code or memorable date). A short code is fine:', genCode(8));
  if(newDop){
    dopInput.value = newDop;
    currentDop = newDop;
  }
});

uploadBtn.addEventListener('click', async ()=> {
  const file = fileInput.files[0];
  if(!file){ alert('Select a file first'); return; }
  uploadStatus.textContent = 'Uploading…';
  try{
    // ensure we have a share doc
    if(!currentShareId) {
      // create a new gallery document associated with this DOP
      const shareCode = genCode(6);
      const doc = await db.collection('galleries').add({
        dop: currentDop,
        code: shareCode,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      currentShareId = doc.id;
      codeText.textContent = shareCode;
      shareLink.href = `${location.origin}/viewer.html?code=${shareCode}`;
      myCodeEl.classList.remove('hidden');
    }
    const ext = file.name.split('.').pop();
    const filename = `${currentShareId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
    const ref = storage.ref().child('uploads/' + filename);
    const task = await ref.put(file);
    const url = await ref.getDownloadURL();
    // write metadata
    await db.collection('galleries').doc(currentShareId).collection('items').add({
      url,
      name: file.name,
      type: file.type,
      caption: captionInput.value || '',
      uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    uploadStatus.textContent = 'Upload complete';
    captionInput.value = '';
    fileInput.value = '';
    loadMyUploads();
  }catch(e){
    console.error(e);
    uploadStatus.textContent = 'Upload failed: ' + e.message;
  }
});

finishBtn.addEventListener('click', async ()=> {
  if(!currentShareId){
    alert('Upload at least one file first; a share code is created when you upload.');
    return;
  }
  // show share card (already created on first upload)
  myCodeEl.classList.remove('hidden');
});

// load uploads for currentShareId / currentDop
async function loadMyUploads(){
  itemsEl.innerHTML = '';
  if(!currentShareId){
    // try to find gallery by DOP
    const q = await db.collection('galleries').where('dop','==',currentDop).orderBy('createdAt','desc').limit(1).get();
    if(!q.empty){
      const doc = q.docs[0];
      currentShareId = doc.id;
      codeText.textContent = doc.data().code;
      shareLink.href = `${location.origin}/viewer.html?code=${doc.data().code}`;
      myCodeEl.classList.remove('hidden');
    } else {
      return;
    }
  }
  const items = await db.collection('galleries').doc(currentShareId).collection('items').orderBy('uploadedAt','desc').get();
  items.forEach(snap => {
    const data = snap.data();
    const el = document.createElement('div');
    el.className = 'item';
    if(data.type && data.type.startsWith('video')){
      el.innerHTML = `<video controls src="${data.url}"></video><div class="muted small">${escapeHtml(data.caption)}</div>`;
    } else {
      el.innerHTML = `<img src="${data.url}" alt="${escapeHtml(data.caption)}"><div class="muted small">${escapeHtml(data.caption)}</div>`;
    }
    itemsEl.appendChild(el);
  });
}

function escapeHtml(s){ if(!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }