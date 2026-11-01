// Fila simples de confirmações (uma por vez), usada por confirmToast/confirmDialog.
let current = null;
const queue = [];
const listeners = new Set();
const emit = () => listeners.forEach((l) => l(current));

export function subscribe(fn) {
    listeners.add(fn);
    fn(current);
    return () => listeners.delete(fn);
}

export function requestConfirm(opts) {
    return new Promise((resolve) => {
        queue.push({ ...opts, resolve });
        if (!current) next();
    });
}

function next() {
    current = queue.shift() || null;
    emit();
}

export function answer(value) {
    if (!current) return;
    current.resolve(value);
    next();
}
