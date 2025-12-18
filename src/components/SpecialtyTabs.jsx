import { SPECIALTIES } from "../config/specialties";

export default function SpecialtyTabs({
    activeTab,
    onTabChange,
    remindersPendingCount = 0,
    onOpenReminders
}) {
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-3">
            <div className="flex flex-wrap gap-2">
                {Object.entries(SPECIALTIES).map(([key, specialty]) => {
                    const isActive = activeTab === key;
                    return (
                        <button
                            key={key}
                            onClick={() => onTabChange(key)}
                            className={`group relative flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold transition-all duration-300 
                                ${isActive
                                    ? `text-white shadow-lg transform scale-[1.02] ${specialty.bgColor}`
                                    : `bg-gray-50 text-gray-700 hover:bg-gradient-to-r hover:from-white hover:to-${specialty.lightBg?.split('-')[1]}-50 hover:shadow-md hover:text-${specialty.textColor?.split('-')[1]}`
                                }`}
                        >
                            {/* Efeito de brilho para estado ativo */}
                            {isActive && (
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent"></div>
                            )}

                            {/* Ícone com efeito */}
                            <div className={`relative z-10 p-2 rounded-lg transition-all duration-300 ${isActive
                                ? 'bg-white/20 backdrop-blur-sm'
                                : 'bg-white shadow-sm group-hover:scale-110'}`}>
                                <i className={`fas ${specialty.icon} ${isActive ? 'text-white' : specialty.textColor}`}></i>
                            </div>

                            {/* Nome da especialidade */}
                            <span className="relative z-10">{specialty.name}</span>

                            {/* Indicador de hover */}
                            {!isActive && (
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                            )}
                        </button>
                    );
                })}

                {/* Botão de Lembretes - Fica sempre no final */}
                <div className="ml-auto self-center order-last">
                    <button
                        onClick={onOpenReminders}
                        type="button"
                        title="Ver lembretes"
                        className="group relative flex items-center gap-3 px-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 hover:border-amber-200 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
                    >
                        {/* Ícone com animação */}
                        <div className="relative">
                            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
                                <i className="fas fa-bell text-white text-sm"></i>
                            </div>

                            {/* Efeito pulsante se houver lembretes */}
                            {remindersPendingCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full animate-pulse shadow-md"></div>
                            )}
                        </div>

                        {/* Texto */}
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-gray-800 text-sm">Lembretes</span>
                            <span className="text-xs text-gray-500 mt-0.5">
                                {remindersPendingCount === 0
                                    ? "Todos em dia"
                                    : `${remindersPendingCount} pendente${remindersPendingCount !== 1 ? "s" : ""}`}
                            </span>
                        </div>

                        {/* Badge de contador */}
                        {remindersPendingCount > 0 && (
                            <div className="ml-2 px-2.5 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-extrabold rounded-full shadow-md transform group-hover:scale-110 transition-transform duration-300">
                                {remindersPendingCount}
                            </div>
                        )}

                        <i className="fas fa-chevron-right text-amber-400 text-sm ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300"></i>
                    </button>
                </div>

            </div>

            {/* Indicador de navegação */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <i className="fas fa-mouse-pointer text-gray-300"></i>
                    <span>Clique para alternar entre especialidades</span>
                    <div className="h-3 w-px bg-gray-200 mx-2"></div>
                    <i className="fas fa-info-circle text-amber-400"></i>
                    <span>Lembretes: {remindersPendingCount} pendentes</span>
                </div>
            </div>
        </div>
    );
}

// Estilos adicionais para animações e efeitos
const styles = `
@keyframes gentlePulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
}

.animate-gentlePulse {
    animation: gentlePulse 2s ease-in-out infinite;
}

@keyframes subtleFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
}

.hover\\:animate-subtleFloat:hover {
    animation: subtleFloat 1s ease-in-out infinite;
}

.tab-transition {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.border-hover-gradient {
    position: relative;
}

.border-hover-gradient::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 12px;
    padding: 1px;
    background: linear-gradient(45deg, #fbbf24, #f59e0b, #ea580c);
    -webkit-mask: 
        linear-gradient(#fff 0 0) content-box, 
        linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.border-hover-gradient:hover::after {
    opacity: 1;
}
`;

// Adicionar estilos ao documento
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}