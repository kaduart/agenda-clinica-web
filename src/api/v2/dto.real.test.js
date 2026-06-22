import { describe, it, expect } from "vitest";
import { mapAppointmentResponseDTO } from "./appointment.response.dto.js";

describe("DTO com objeto real do backend", () => {
    it("deve mapear Davi Felipe sem retornar null", () => {
        const backendDto = {
            id: "6a1dc25cd889944391d42eea",
            _id: "6a1dc25cd889944391d42eea",
            operationalStatus: "pre_agendado",
            clinicalStatus: "pending",
            status: "pre_agendado",
            date: "2026-06-22T19:00:00.000Z",
            time: "16:00",
            duration: 40,
            patient: {
                _id: "692da1e37a66901c8975db66",
                fullName: "Davi Felipe Araújo",
                phone: "66984449284",
                email: "522@gmai.com",
                birthDate: "2023-03-04T00:00:00.000Z"
            },
            patientId: "692da1e37a66901c8975db66",
            patientName: "Davi Felipe Araújo",
            patientInfo: {
                fullName: "Davi Felipe Araújo",
                phone: "66984449284",
                email: "522@gmai.com",
                birthDate: "2023-03-04T00:00:00.000Z"
            },
            doctor: {
                _id: "684072213830f473da1b0b0b",
                fullName: "Lorrany Siqueira Marques",
                specialty: "fonoaudiologia"
            },
            doctorId: "684072213830f473da1b0b0b",
            doctorName: "Lorrany Siqueira Marques",
            professionalName: "Lorrany Siqueira Marques",
            specialty: "fonoaudiologia",
            serviceType: null,
            sessionType: null,
            sessionValue: 140,
            serviceTypeLabel: "Sessão",
            paymentStatus: "pending",
            paymentMethod: "convenio",
            billingType: "particular",
            insuranceProvider: "unimed-campinas",
            insuranceValue: 140,
            authorizationCode: null,
            package: null,
            payment: "6a1dc25d4bafb710ab160f34",
            session: "6a1dc25d4bafb710ab160f40",
            appointmentId: null,
            liminarContract: null,
            notes: "Sessão de convênio gerada pelo plano",
            observations: "Sessão de convênio gerada pelo plano",
            responsible: "",
            metadata: { origin: { source: "outro" } },
            visualFlag: "pending",
            createdAt: "2026-06-01T17:33:16.487Z",
            updatedAt: "2026-06-09T13:33:18.751Z",
            importedAt: null,
            source: "outro"
        };

        const result = mapAppointmentResponseDTO(backendDto);
        expect(result).not.toBeNull();
        expect(result.date).toBe("2026-06-22");
        expect(result.time).toBe("16:00");
        expect(result.operationalStatus).toBe("pre_agendado");
    });
});
