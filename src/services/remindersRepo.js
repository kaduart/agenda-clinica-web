import { database } from "../config/firebase";

const remindersRef = () => database.ref("reminders");

export const listenReminders = (onData) => {
  const ref = database.ref("reminders");

  const handleSnapshot = (snap) => {
    const data = snap.val() || {};
    console.log("🔥 [listenReminders] Snapshot recebido:", data);

    const parsed = Object.entries(data).map(([id, value]) => ({
      id,
      ...value,
    }));

    onData(parsed);
  };

  ref.on("value", handleSnapshot);
  return () => ref.off("value", handleSnapshot); // ✅ IMPORTANTE
};


export const addReminder = async (payload) => {
    const text = String(payload?.text || "").trim();
    const dueDate = String(payload?.dueDate || "").trim();
    if (!text || !dueDate) return null;

    const ref = remindersRef().push();
    await ref.set({
        text,
        dueDate,
        dueTime: payload?.dueTime || "",
        appointmentId: payload?.appointmentId || null,
        patient: payload?.patient || "",
        professional: payload?.professional || "",
        status: "pending",
        createdAt: Date.now(),
    });

    return ref.key; // ✅
};

export const updateReminder = async (id, patch) => {
    if (!id) return;
    await remindersRef().child(id).update(patch || {});
};

export const markReminderDone = async (id) => {
    if (!id) return;
    await remindersRef().child(id).update({
        status: "done",
        doneAt: Date.now(),
    });
};

export const cancelReminder = async (id) => {
    if (!id) return;
    await remindersRef().child(id).update({
        status: "canceled",
        canceledAt: Date.now(),
    });
};

export const snoozeReminderDays = async (id, days = 7) => {
    if (!id) return;

    const snap = await remindersRef().child(id).get();
    const r = snap.val();
    if (!r?.dueDate) return;

    // soma dias no padrão YYYY-MM-DD
    const [y, m, d] = String(r.dueDate).split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setDate(dt.getDate() + Number(days || 0));

    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");

    await remindersRef().child(id).update({
        dueDate: `${yyyy}-${mm}-${dd}`,
        status: "pending",
        snoozedAt: Date.now(),
    });
};
