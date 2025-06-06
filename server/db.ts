import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { ServiceAccount } from 'firebase-admin';
import serviceAccountJson from '../portofolio-a0a0b-firebase-adminsdk-fbsvc-81638f3220.json' assert { type: "json" };

const serviceAccount = serviceAccountJson as ServiceAccount;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();

export { db };