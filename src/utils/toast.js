/**
 * Toasts da agenda (Sonner). Mantém a mesma API que o app já usava
 * (toast.success / error / info / warn / warning / dismiss) para não mexer nas telas.
 */
import { toast as sonner } from "sonner";

const toast = (msg, opts) => sonner(msg, opts);
toast.success = (msg, opts) => sonner.success(msg, opts);
toast.error = (msg, opts) => sonner.error(msg, opts);
toast.info = (msg, opts) => sonner.info(msg, opts);
toast.warning = (msg, opts) => sonner.warning(msg, opts);
toast.warn = toast.warning;
toast.dismiss = (id) => sonner.dismiss(id);
toast.promise = (p, opts) => sonner.promise(p, opts);

export { toast };
export default toast;
