// ============================================
// UNIFICAR PACIENTES DAVI FELIPE
// ============================================
// Mantém: Davi Felipe Araújo (692da1e37a66901c8975db66)
// Telefone: 62 8191-5479 | CPF: 12374198162
// Remove: Os outros 3 duplicados
// ============================================

const ID_PRINCIPAL = ObjectId("692da1e37a66901c8975db66");
const IDs_DUPLICADOS = [
    ObjectId("699314bf03d5cc171cf018d5"), // Davi Felipe
    ObjectId("699316b803d5cc171cf02036"), // Davi Felipe Araujo
    ObjectId("69931dde03d5cc171cf03c57")  // Davi Felipe SAraujo
];

print("🚀 Iniciando consolidação de Davi Felipe...");
print("==========================================");

// Mostrar paciente principal
const principal = db.patients.findOne({ _id: ID_PRINCIPAL });
print("\n✅ PACIENTE PRINCIPAL (MANTER):");
print(`   ID: ${ID_PRINCIPAL}`);
print(`   Nome: ${principal.fullName}`);
print(`   Telefone: ${principal.phone}`);
print(`   CPF: ${principal.cpf || 'N/A'}`);
print(`   Endereço: ${principal.address?.street || 'N/A'}`);

// Mostrar duplicados
print("\n🗑️  PACIENTES DUPLICADOS (REMOVER):");
IDs_DUPLICADOS.forEach((id, i) => {
    const p = db.patients.findOne({ _id: id });
    if (p) {
        print(`   ${i+1}. ${p.fullName} (${id})`);
        print(`       Tel: ${p.phone || 'N/A'}`);
    } else {
        print(`   ${i+1}. ${id} (não encontrado)`);
    }
});

// ============================================
// 1. MIGRAR AGENDAMENTOS
// ============================================
print("\n📅 MIGRANDO AGENDAMENTOS...");

let totalMigrados = 0;
IDs_DUPLICADOS.forEach(idDuplicado => {
    const antes = db.appointments.countDocuments({ patientId: idDuplicado });
    if (antes > 0) {
        const resultado = db.appointments.updateMany(
            { patientId: idDuplicado },
            { 
                $set: { 
                    patientId: ID_PRINCIPAL,
                    patientName: "Davi Felipe Araújo"
                }
            }
        );
        print(`   ✅ ${idDuplicado}: ${resultado.modifiedCount} agendamentos migrados`);
        totalMigrados += resultado.modifiedCount;
    } else {
        print(`   ℹ️  ${idDuplicado}: sem agendamentos`);
    }
});
print(`   📊 Total: ${totalMigrados} agendamentos migrados`);

// ============================================
// 2. MIGRAR PRÉ-AGENDAMENTOS
// ============================================
print("\n📨 MIGRANDO PRÉ-AGENDAMENTOS...");

let totalPreMigrados = 0;
IDs_DUPLICADOS.forEach(idDuplicado => {
    const antes = db.preagendamentos.countDocuments({ 'patientInfo.patientId': idDuplicado });
    if (antes > 0) {
        const resultado = db.preagendamentos.updateMany(
            { 'patientInfo.patientId': idDuplicado },
            { 
                $set: { 
                    'patientInfo.patientId': ID_PRINCIPAL,
                    'patientInfo.fullName': "Davi Felipe Araújo"
                }
            }
        );
        print(`   ✅ ${idDuplicado}: ${resultado.modifiedCount} pré-agendamentos migrados`);
        totalPreMigrados += resultado.modifiedCount;
    }
});
if (totalPreMigrados === 0) {
    print("   ℹ️  Nenhum pré-agendamento para migrar");
}

// ============================================
// 3. REMOVER DUPLICADOS
// ============================================
print("\n🗑️  REMOVENDO PACIENTES DUPLICADOS...");

const resultadoDelete = db.patients.deleteMany({
    _id: { $in: IDs_DUPLICADOS }
});

print(`   ✅ ${resultadoDelete.deletedCount} pacientes duplicados removidos`);

// ============================================
// 4. RESUMO FINAL
// ============================================
print("\n==========================================");
print("✅ CONSOLIDAÇÃO CONCLUÍDA!");
print("==========================================");

const agendamentosFinais = db.appointments.countDocuments({ patientId: ID_PRINCIPAL });
print(`\n📊 RESUMO:`);
print(`   🎯 Paciente: Davi Felipe Araújo (${ID_PRINCIPAL})`);
print(`   📱 Telefone: ${principal.phone}`);
print(`   🏠 Endereço: ${principal.address?.street}, ${principal.address?.number}`);
print(`   📅 Total de agendamentos: ${agendamentosFinais}`);
print(`   🗑️  Duplicados removidos: ${resultadoDelete.deletedCount}`);

// Verificar se ainda existem duplicados
const restantes = db.patients.countDocuments({
    _id: { $in: IDs_DUPLICADOS }
});

if (restantes === 0) {
    print("\n✨ Todos os duplicados foram removidos com sucesso!");
} else {
    print(`\n⚠️  Atenção: ${restantes} duplicado(s) ainda presente(s)`);
}
