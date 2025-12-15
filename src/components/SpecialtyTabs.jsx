import { SPECIALTIES } from "../config/specialties";

export default function SpecialtyTabs({ activeTab, onTabChange }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
            <div className="flex flex-wrap gap-1">
                {Object.entries(SPECIALTIES).map(([key, specialty]) => (
                    <button
                        key={key}
                        onClick={() => onTabChange(key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === key
                                ? `${specialty.bgColor} text-white shadow`
                                : `bg-white text-gray-600 hover:${specialty.lightBg} hover:${specialty.textColor}`
                            }`}
                    >
                        <i className={`fas ${specialty.icon}`}></i>
                        <span>{specialty.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
