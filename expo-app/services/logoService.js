import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "./firebase";

export async function uploadLogoToFirebase(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const logoRef = ref(storage, "business/logo.png");

  await uploadBytes(logoRef, blob, {
    contentType: "image/png"
  });

  return await getDownloadURL(logoRef);
}

export async function updateLogoInConfig(url) {
  const refDoc = doc(db, "systemConfig", "business");

  await updateDoc(refDoc, {
    "logo.url": url,
    updatedAt: serverTimestamp()
  });
}
