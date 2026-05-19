import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function useBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "bookings"),
      (snap) => {
        setBookings(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }))
        );
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("[useBookings]: Snapshot failed", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { bookings, loading, error };
}
