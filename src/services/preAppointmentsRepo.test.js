import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import * as v2 from "../api/v2/agendaV2Client";
import { mapAppointmentListResponseDTO } from "../api/v2/appointment.response.dto";

vi.mock("../api/v2/agendaV2Client");
vi.mock("../api/v2/appointment.response.dto");

import { fetchPreAppointments } from "./preAppointmentsRepo";

describe("preAppointmentsRepo", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        console.log.mockRestore?.();
        console.error.mockRestore?.();
    });

    it("deve buscar pré-agendamentos pelo endpoint /api/v2/pre-appointments", async () => {
        const rawFromApi = [{ _id: "abc", operationalStatus: "pre_agendado" }];
        const mapped = [{
            id: "abc",
            _id: "abc",
            operationalStatus: "pre_agendado",
            status: "Pré-agendado",
        }];

        vi.mocked(v2.listPreAppointments).mockResolvedValue(rawFromApi);
        vi.mocked(mapAppointmentListResponseDTO).mockReturnValue(mapped);

        const result = await fetchPreAppointments({ specialty: "fonoaudiologia" });

        expect(v2.listPreAppointments).toHaveBeenCalledTimes(1);
        expect(v2.listPreAppointments).toHaveBeenCalledWith({ specialty: "fonoaudiologia" });
        expect(v2.getAppointments).not.toHaveBeenCalled();
        expect(mapAppointmentListResponseDTO).toHaveBeenCalledWith(rawFromApi);
        expect(result).toEqual(mapped);
    });

    it("deve retornar array vazio quando o endpoint falhar", async () => {
        vi.mocked(v2.listPreAppointments).mockRejectedValue(new Error("Network Error"));

        const result = await fetchPreAppointments({});

        expect(result).toEqual([]);
        expect(v2.getAppointments).not.toHaveBeenCalled();
    });

    it("deve manter compatibilidade com filtros vazios", async () => {
        vi.mocked(v2.listPreAppointments).mockResolvedValue([]);
        vi.mocked(mapAppointmentListResponseDTO).mockReturnValue([]);

        const result = await fetchPreAppointments();

        expect(v2.listPreAppointments).toHaveBeenCalledWith({});
        expect(result).toEqual([]);
    });
});
