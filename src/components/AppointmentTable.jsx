import { useLayoutEffect, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { SPECIALTIES } from "../config/specialties";
import AppointmentRow from "./AppointmentRow";
import CycleWizardModal from "./CycleWizardModal";
import { QUICK_FILTERS } from "../utils/daySummary";

export default function AppointmentTable({
    activeSpecialty, appointments, isLoading,
    onEdit, onDelete, onReminder, onCancel,
    onConfirmCycle, onPostAppointment, quickFilterLabel, onClearQuickFilter }) {

    const [cycleWizardOpen, setCycleWizardOpen] = useState(false);
    const [baseAppointment, setBaseAppointment] = useState(null);

    function handleGenerateCycle(appointment) {
        setBaseAppointment(appointment);
        setCycleWizardOpen(true);
    }

    const specialty = SPECIALTIES[activeSpecialty] || SPECIALTIES.todas;

    return (
        <div className="bg-white rounded-xl border border-fi-line overflow-visible">
            {/* Cabeçalho */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-fi-line">
                <h3 className="font-head text-sm font-bold text-fi-ink">{specialty.name}</h3>
                <span className="text-xs font-semibold tabular-nums text-fi-muted">
                    {appointments.length} registro{appointments.length !== 1 ? 's' : ''}
                </span>
                {quickFilterLabel && QUICK_FILTERS[quickFilterLabel] && (
                    <span className="h-6 pl-2.5 pr-1 rounded-full bg-fi-soft text-fi-deep text-xs font-semibold inline-flex items-center gap-1">
                        Só: {QUICK_FILTERS[quickFilterLabel].label}
                        <button type="button" onClick={onClearQuickFilter} className="w-5 h-5 rounded-full hover:bg-white/70" aria-label="Mostrar todos">×</button>
                    </span>
                )}
            </div>

            {/* Lista */}
            <div>
                {isLoading ? (
                    <div aria-busy="true" aria-label="Carregando agendamentos" className="divide-y divide-fi-line">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-4 border-l-4 border-fi-line animate-pulse">
                                <div className="w-36 shrink-0 space-y-2">
                                    <div className="h-4 w-16 rounded bg-fi-line"></div>
                                    <div className="h-3 w-24 rounded bg-fi-bg"></div>
                                </div>
                                <div className="flex-[1.2] min-w-0 space-y-2">
                                    <div className="h-4 rounded bg-fi-line" style={{ width: `${45 + ((i * 17) % 30)}%` }}></div>
                                    <div className="h-3 w-32 rounded bg-fi-bg"></div>
                                </div>
                                <div className="w-36 shrink-0 hidden md:block"><div className="h-6 w-24 mx-auto rounded-full bg-fi-bg"></div></div>
                                <div className="w-32 shrink-0 hidden lg:block space-y-2"><div className="h-4 w-20 rounded bg-fi-line"></div><div className="h-4 w-16 rounded bg-fi-bg"></div></div>
                                <div className="w-28 shrink-0 hidden md:block"><div className="h-6 w-20 mx-auto rounded-full bg-fi-bg"></div></div>
                                <div className="w-64 shrink-0 hidden sm:flex justify-end gap-3">
                                    {[0, 1, 2, 3].map((j) => <div key={j} className="h-5 w-5 rounded bg-fi-bg"></div>)}
                                </div>
                            </div>
                        ))}
                        <span className="sr-only">Carregando agendamentos…</span>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <div className="max-w-sm mx-auto">
                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <i className="fas fa-calendar-times text-2xl text-gray-400"></i>
                            </div>
                            <h4 className="text-base font-semibold text-gray-900 mb-1">
                                Nenhum agendamento encontrado
                            </h4>
                            <p className="text-sm text-gray-500 mb-4">
                                Não há registros para esta especialidade ou filtros aplicados.
                            </p>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-fi-bg rounded-lg border border-fi-line">
                                <i className="fas fa-lightbulb text-xs text-fi-muted"></i>
                                <span className="text-xs text-fi-muted">Tente ajustar os filtros ou criar um novo agendamento</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header row — espelha as colunas do AppointmentRow */}
                        <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-b border-fi-line bg-fi-bg">
                            <div className="w-36 shrink-0 flex items-center">
                                <span className="text-[12px] font-semibold text-fi-muted flex items-center gap-1.5">
                                    <i className="fas fa-clock text-xs"></i> Horário / Profissional
                                </span>
                            </div>
                            <div className="flex-[1.2] min-w-0 flex items-center">
                                <span className="text-[12px] font-semibold text-fi-muted flex items-center gap-1.5">
                                    <i className="fas fa-user text-xs"></i> Paciente
                                </span>
                            </div>
                            <div className="w-36 shrink-0 hidden md:flex items-center justify-center">
                                <span className="text-[12px] font-semibold text-fi-muted flex items-center justify-center gap-1.5">
                                    <i className="fas fa-comment-check text-xs"></i> Confirmação
                                </span>
                            </div>
                            <div className="w-32 shrink-0 hidden lg:flex items-center">
                                <span className="text-[12px] font-semibold text-fi-muted flex items-center gap-1.5">
                                    <i className="fas fa-stethoscope text-xs"></i> Área / Tipo
                                </span>
                            </div>
                            <div className="w-32 shrink-0 hidden xl:flex items-center">
                                <span className="text-[12px] font-semibold text-fi-muted flex items-center gap-1.5">
                                    <i className="fas fa-comment-dots text-xs"></i> Anotações
                                </span>
                            </div>
                            <div className="w-28 shrink-0 text-center hidden md:flex items-center justify-center">
                                <span className="text-[12px] font-semibold text-fi-muted flex items-center justify-center gap-1.5">
                                    <i className="fas fa-flag text-xs"></i> Status do atendimento
                                </span>
                            </div>
                            <div className="w-64 shrink-0 flex items-center justify-end">
                                <span className="text-[12px] font-semibold text-fi-muted flex items-center justify-center gap-1.5">
                                    <i className="fas fa-cogs text-xs"></i> Ações
                                </span>
                            </div>
                        </div>

                        {/* Rows: lista curta anima entradas/saídas; lista longa (mês inteiro) é virtualizada */}
                        <RowList
                            appointments={appointments}
                            rowProps={{ onEdit, onDelete, onCancel, onReminder, onGenerateCycle: handleGenerateCycle, onPostAppointment }}
                        />
                    </>
                )}
            </div>

            {/* Modal de Ciclo */}
            <CycleWizardModal
                open={cycleWizardOpen}
                appointment={baseAppointment}
                onClose={() => setCycleWizardOpen(false)}
                onConfirm={(payload) => {
                    onConfirmCycle?.(payload, baseAppointment);
                    setCycleWizardOpen(false);
                }}
            />
        </div>
    );
}

// Acima disso a lista é virtualizada (só desenha as linhas visíveis na tela).
const VIRTUALIZE_FROM = 60;

function RowList({ appointments, rowProps }) {
    if (appointments.length >= VIRTUALIZE_FROM) {
        return <VirtualRows appointments={appointments} rowProps={rowProps} />;
    }
    return <AnimatedRows appointments={appointments} rowProps={rowProps} />;
}

function AnimatedRows({ appointments, rowProps }) {
    const [ref] = useAutoAnimate({ duration: 180 });
    return (
        <div ref={ref} className="divide-y divide-fi-line">
            {appointments.map((appointment, index) => (
                <AppointmentRow key={appointment.id} appointment={appointment} index={index} {...rowProps} />
            ))}
        </div>
    );
}

function VirtualRows({ appointments, rowProps }) {
    const listRef = useRef(null);
    // distância da lista até o topo da página (a rolagem é a da janela)
    const [scrollMargin, setScrollMargin] = useState(0);
    useLayoutEffect(() => {
        const el = listRef.current;
        if (!el) return;
        const measure = () => setScrollMargin(el.getBoundingClientRect().top + window.scrollY);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(document.body);
        return () => ro.disconnect();
    }, []);
    const virtualizer = useWindowVirtualizer({
        count: appointments.length,
        estimateSize: () => 76,
        overscan: 8,
        scrollMargin,
        getItemKey: (i) => appointments[i]?.id ?? i,
    });
    const items = virtualizer.getVirtualItems();
    return (
        <div ref={listRef} style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {items.map((item) => (
                <div
                    key={item.key}
                    data-index={item.index}
                    ref={virtualizer.measureElement}
                    // "top" em vez de transform: transform quebraria o fundo "fixed" que fecha os menus da linha.
                    // focus-within/hover sobem a linha para o menu de ações não ficar por baixo da próxima.
                    className="absolute left-0 right-0 border-b border-fi-line hover:z-20 focus-within:z-20"
                    style={{ top: item.start - scrollMargin }}
                >
                    <AppointmentRow appointment={appointments[item.index]} index={item.index} {...rowProps} />
                </div>
            ))}
        </div>
    );
}
