import { database } from "../config/firebase";

export const listenProfessionals = (onData) => {
  const ref = database.ref("professionals");

  const handler = (snapshot) => {
    const data = snapshot.val();
    const list = data ? Object.values(data) : [];
    list.sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
    onData(list);
  };

  ref.on("value", handler);
  return () => ref.off("value", handler);
};

export const addProfessional = async (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return;

  const ref = database.ref("professionals").push();
  await ref.set(trimmed);
};

export const deleteProfessionalByName = async (name) => {
  const target = (name || "").trim();
  if (!target) return;

  const snap = await database.ref("professionals").get();

  snap.forEach((child) => {
    if (child.val() === target) {
      database.ref(`professionals/${child.key}`).remove();
    }
  });
};
