import { toast } from "react-toastify";

export function confirmToast(message) {
    return new Promise((resolve) => {
        const id = toast(
            ({ closeToast }) => (
                <div>
                    <div className="font-semibold text-gray-800 flex ">{message}</div>
                    <div className="mt-3 flex gap-2 justify-end">
                        <button
                            className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 font-semibold"
                            onClick={() => {
                                toast.dismiss(id);
                                closeToast?.();
                                resolve(false);
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            className="px-3 py-1.5 rounded bg-red-600 text-white font-semibold"
                            onClick={() => {
                                toast.dismiss(id);
                                closeToast?.();
                                resolve(true);
                            }}
                        >
                            Excluir
                        </button>
                    </div>
                </div>
            ),
            {
                autoClose: false,
                closeOnClick: false,
                closeButton: false,
            }
        );
    });
}
