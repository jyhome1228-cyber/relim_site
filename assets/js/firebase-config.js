export const firebaseConfig = {
  apiKey: 'AIzaSyC91PYCqwYrNLscmtyghu7YX9cEOBFAuDE',
  authDomain: 'relim-d2f56.firebaseapp.com',
  projectId: 'relim-d2f56',
  storageBucket: 'relim-d2f56.firebasestorage.app',
  messagingSenderId: '645141140843',
  appId: '1:645141140843:web:6f04de93477e24d797e82e'
};

export const firebaseReady = Object.values(firebaseConfig).every(Boolean);
