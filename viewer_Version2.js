// viewer.js — view a gallery by code
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const codeInput = document.getElementById('code-input');
const openBtn = document.getElementById('open-btn');
const sharedGallery = document.getElementById('shared-gallery');
const sharedItems = document.getElementById('shared-items');

openBtn.addEventListener('click', ()=> {
  const code = codeInput.value.trim();
  if(!code) return alert('Enter a code');
  openGallery(code);
});

async function openGallery(code){
  sharedItems.innerHTML = '';
  const q = await db.collection('galleries').where('code','==',code).limit(1).get();
  if(q.empty){ alert('No gallery found for that code'); return; }
  const galleryDoc = q.docs[0];
  const items = await db.collection('galleries').doc(galleryDoc.id).collection('items').orderBy('uploadedAt','desc').get();
  items.forEach(snap => {
    const data = snap.data();
    const el = document.createElement('div');
    el.className = 'item';
    if(data.type && data.type.startsWith('video')){
      el.innerHTML = `<video controls src="${data.url}"></video><div class="muted small">${escapeHtml(data.caption)}</div>`;
    } else {
      el.innerHTML = `<img src="${data.url}" alt="${escapeHtml(data.caption)}"><div class="muted small">${escapeHtml(data.caption)}</div>`;
    }
    sharedItems.appendChild(el);
  });
  sharedGallery.classList.remove('hidden');
}

function escapeHtml(s){ if(!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// If code present in query string, auto open
const params = new URLSearchParams(location.search);
if(params.get('code')){
  codeInput.value = params.get('code');
  openGallery(params.get('code'));
}