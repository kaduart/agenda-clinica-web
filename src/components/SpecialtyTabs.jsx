import { SPECIALTIES } from "../config/specialties";

export default function SpecialtyTabs({ activeTab, onTabChange }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(SPECIALTIES).map(([key, specialty]) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                ${
                  isActive
                    ? `${specialty.bgColor} text-white shadow-sm` // fundo escuro, texto branco
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <i
                className={`fas ${specialty.icon} ${
                  isActive ? 'text-white' : specialty.textColor // ícone colorido quando inativo
                }`}
              ></i>
              <span>{specialty.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}