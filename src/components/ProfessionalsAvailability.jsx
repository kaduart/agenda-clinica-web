/**
 * 👩‍⚕️ Disponibilidade dos Profissionais por Especialidade
 * 
 * Mostra os horários livres de cada profissional da especialidade ativa.
 * Integrado no SpecialtyDashboard.
 */

import React, { useState, useEffect } from 'react';
import { fetchWeeklyAvailability } from '../services/crmApi';
import { SPECIALTIES } from '../config/specialties';

// Pega segunda-feira da semana atual
const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

// Formata data para YYYY-MM-DD
const formatDateISO = (date) => date.toISOString().split('T')[0];

// Formata data para exibição (DD/MM)
const formatDateDisplay = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
};

// Dia da semana abreviado
const DAY_LABELS = {
    monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua',
    thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom'
};

export default function ProfessionalsAvailability({ activeSpecialty }) {
    const [startDate, setStartDate] = useState(formatDateISO(getMonday(new Date())));
    const [availability, setAvailability] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const specialty = SPECIALTIES[activeSpecialty];

    const specialtyKeyMap = {
        fonoaudiologia: 'fonoaudiologia',
        psicologia: 'psicologia',
        psicomotricidade: 'psicomotricidade',
        psicopedagogia: 'psicopedagogia',
        terapia_ocupacional: 'terapia_ocupacional',
        fisioterapia: 'fisioterapia',
        todas: null
    };

    const loadAvailability = async () => {
        const apiSpecialty = specialtyKeyMap[activeSpecialty];
        if (!apiSpecialty) return;

        setLoading(true);
        setError(null);
        try {
            const data = await fetchWeeklyAvailability(startDate, apiSpecialty, 7);
            setAvailability(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isExpanded && activeSpecialty !== 'todas') {
            loadAvailability();
        }
    }, [activeSpecialty, startDate, isExpanded]);

    const goToPreviousWeek = () => {
        const current = new Date(startDate);
        current.setDate(current.getDate() - 7);
        setStartDate(formatDateISO(current));
    };

    const goToNextWeek = () => {
        const current = new Date(startDate);
        current.setDate(current.getDate() + 7);
        setStartDate(formatDateISO(current));
    };

    const goToCurrentWeek = () => {
        setStartDate(formatDateISO(getMonday(new Date())));
    };

    if (activeSpecialty === 'todas') return null;

    return (
        <div className="mt-4">
            {/* Header clicável */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${specialty?.bgColor || 'bg-gray-600'} text-white hover:opacity-90`}
            >
                <div className="flex items-center gap-3">
                    <i className="fas fa-calendar-check"></i>
                    <span className="font-semibold">
                        Ver Horários Livres - {specialty?.name}
                    </span>
                    {availability?.daysWithAvailability > 0 && (
                        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                            {availability.daysWithAvailability} dias com vaga
                        </span>
                    )}
                </div>
                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} transition-transform duration-200`}></i>
            </button>

            {/* Conteúdo expansível */}
            {isExpanded && (
                <div className={`mt-2 rounded-xl border overflow-hidden ${specialty?.lightBg || 'bg-gray-50'} ${specialty?.borderColor || 'border-gray-200'}`}>
                    <div className="p-4">
                        {/* Navegação */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={goToPreviousWeek}
                                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                    title="Semana anterior"
                                >
                                    <i className="fas fa-chevron-left text-gray-600"></i>
                                </button>
                                <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                                    {formatDateDisplay(startDate)}
                                </span>
                                <button
                                    onClick={goToNextWeek}
                                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                    title="Próxima semana"
                                >
                                    <i className="fas fa-chevron-right text-gray-600"></i>
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={goToCurrentWeek}
                                    className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Hoje
                                </button>
                                <button
                                    onClick={loadAvailability}
                                    className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    disabled={loading}
                                >
                                    <i className={`fas fa-refresh ${loading ? 'fa-spin' : ''}`}></i> Atualizar
                                </button>
                            </div>
                        </div>

                        {/* Loading */}
                        {loading && (
                            <div className="flex items-center justify-center py-8 text-gray-500">
                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                Carregando...
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                <p className="text-red-600 text-sm">{error}</p>
                                <button onClick={loadAvailability} className="mt-2 text-xs px-3 py-1 bg-red-100 text-red-700 rounded-lg">
                                    Tentar novamente
                                </button>
                            </div>
                        )}

                        {/* Grid de disponibilidade */}
                        {!loading && !error && availability?.days?.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {availability.days.map((day) => (
                                    <div key={day.date} className="bg-white rounded-lg border border-gray-200 p-3">
                                        {/* Header do dia */}
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${specialty?.bgColor} text-white`}>
                                                {DAY_LABELS[day.dayOfWeek]}
                                            </span>
                                            <span className="text-sm text-gray-600">
                                                {formatDateDisplay(day.date)}
                                            </span>
                                        </div>

                                        {/* Profissionais */}
                                        <div className="space-y-2">
                                            {day.professionals.map((prof) => (
                                                <div key={prof.doctorId} className="text-sm">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-medium text-gray-800">
                                                            {prof.name.split(' ')[0]}
                                                        </span>
                                                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                                            {prof.availableSlots.length} vagas
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {prof.availableSlots.slice(0, 5).map((slot) => (
                                                            <span
                                                                key={slot}
                                                                className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded"
                                                            >
                                                                {slot}
                                                            </span>
                                                        ))}
                                                        {prof.availableSlots.length > 5 && (
                                                            <span className="text-xs text-gray-500">
                                                                +{prof.availableSlots.length - 5}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Vazio */}
                        {!loading && !error && availability?.days?.length === 0 && (
                            <div className="text-center py-6 text-gray-500">
                                <i className="fas fa-calendar-xmark text-2xl mb-2 opacity-50"></i>
                                <p className="text-sm">Nenhum horário livre encontrado</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
