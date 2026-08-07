import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { doc, getDoc, getFirestore, setDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

if (firebaseReady) {
  const app = getApps()[0] || initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const syncMember = async (user) => {
    if (!user) return;
    const key = `relim-member-synced:${user.uid}`;
    if (sessionStorage.getItem(key) === '1') return;

    const ref = doc(db, 'users', user.uid);
    const now = Timestamp.now();
    const provider = user.providerData?.[0]?.providerId || 'password';
    const snapshot = await getDoc(ref);
    const payload = {
      uid: user.uid,
      name: user.displayName || '리림 회원',
      email: user.email || '',
      provider,
      lastLoginAt: now,
      updatedAt: now
    };
    if (!snapshot.exists()) payload.createdAt = now;

    await setDoc(ref, payload, { merge: true });
    sessionStorage.setItem(key, '1');
  };

  onAuthStateChanged(auth, (user) => {
    syncMember(user).catch((error) => console.error('[RE:LIM MEMBER SYNC]', error));
  });
}
