import React from "react";
import { toast } from "react-toastify";

export default function ProfessionalsModal({ professionals, onAdd, onDelete, onClose }) {
    const [newName, setNewName] = React.useState("");

    const handleAdd = async (e) => {
        e.preventDefault();
        const trimmed = newName.trim();
        if (!trimmed) {
            toast.error("Digite um nome");
            return;
        }
        onAdd(trimmed);
        setNewName("");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800">Gerenciar Profissionais</h3>
                </div>

                <form onSubmit={handleAdd} className="px-6 py-4 border-b border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Adicionar</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Nome do profissional"
                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold"
                        >
                            <i className="fas fa-plus"></i>
                        </button>
                    </div>
                </form>

                <div className="px-6 py-4 max-h-96 overflow-y-auto">
                    {professionals.length === 0 && (
                        <p className="text-gray-500 text-sm">Nenhum profissional cadastrado</p>
                    )}

                    {professionals.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <span className="text-gray-900 font-medium">{p}</span>
                            <button
                                type="button"
                                onClick={() => onDelete(p)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                                title="Excluir"
                            >
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}