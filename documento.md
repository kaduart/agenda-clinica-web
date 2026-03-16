curl 'http://localhost:5000/api/import-from-agenda' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' \
  -H 'Authorization: Bearer agenda_export_token_fono_inova_2025_secure_abc123' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:5174' \
  -H 'Referer: http://localhost:5174/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36' \
  -H 'sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"' \
  -H 'sec-ch-ua-mobile: ?1' \
  -H 'sec-ch-ua-platform: "Android"' \
  --data-raw '{"patientId":"69406afd37ea03c055ca188b","isNewPatient":false,"patientInfo":{"fullName":"ANA CLARA TESTE","phone":"5561981694922","birthDate":"2012-02-03","email":""},"responsible":"","professionalName":"Doutor Teste","doctorId":"","specialty":"fonoaudiologia","date":"2026-03-16","time":"09:00","operationalStatus":"pre_agendado","observations":"","crm":{"serviceType":"evaluation","sessionType":"sessao","paymentMethod":"pix","paymentAmount":0,"usePackage":false}}'  -----{
    "success": true,
    "message": "Pré-agendamento criado com sucesso!",
    "preAgendamentoId": "69b84373376d6fdedf2d0bd7",
    "status": "novo",
    "urgency": "critica",
    "patientId": "69406afd37ea03c055ca188b",
    "nextStep": "Aguardando confirmação da secretária no painel de Pré-Agendamentos"
}  add como agednadno curl 'http://localhost:5000/api/pre-agendamento/69b84373376d6fdedf2d0bd7/importar' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' \
  -H 'Authorization: Bearer agenda_export_token_fono_inova_2025_secure_abc123' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:5174' \
  -H 'Referer: http://localhost:5174/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36' \
  -H 'sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"' \
  -H 'sec-ch-ua-mobile: ?1' \
  -H 'sec-ch-ua-platform: "Android"' \
  --data-raw '{"doctorId":"689815f43e7468e2d7faa2ef","date":"2026-03-16","time":"09:00","sessionValue":0,"serviceType":"evaluation","paymentMethod":"pix","notes":"","patientId":"69406afd37ea03c055ca188b","birthDate":"2012-02-03","phone":"5561981694922","email":"","responsible":""}'     repsonse --{
    "success": true,
    "message": "Importado com sucesso!",
    "appointmentId": "69b843c9376d6fdedf2d0c20",
    "patientId": "69406afd37ea03c055ca188b"
} ---  cancelei um aggendameot existente....curl 'http://localhost:5000/api/import-from-agenda/sync-update' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' \
  -H 'Authorization: Bearer agenda_export_token_fono_inova_2025_secure_abc123' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:5174' \
  -H 'Referer: http://localhost:5174/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36' \
  -H 'sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"' \
  -H 'sec-ch-ua-mobile: ?1' \
  -H 'sec-ch-ua-platform: "Android"' \
  --data-raw '{"_id":"69b843c9376d6fdedf2d0c20","patientId":"69406afd37ea03c055ca188b","patientInfo":{"fullName":"ANA CLARA TESTE","phone":"5561981694922","birthDate":"2012-02-03","email":""},"responsible":"","professionalName":"Doutor Teste","doctorId":"689815f43e7468e2d7faa2ef","specialty":"fonoaudiologia","date":"2026-03-16","time":"09:00","operationalStatus":"canceled","observations":"[IMPORTADO DO PRE-AGENDAMENTO]","billingType":"particular","paymentStatus":"pending","insuranceProvider":"","insuranceValue":0,"authorizationCode":"","crm":{"serviceType":"evaluation","sessionType":"avaliacao","paymentMethod":"dinheiro","paymentAmount":0,"usePackage":false}}'---{
    "success": true,
    "message": "Atualização sincronizada com sucesso",
    "appointmentId": "69b843c9376d6fdedf2d0c20",
    "updatedFields": {
        "date": "2026-03-16",
        "time": "09:00",
        "professionalName": "Doutor Teste",
        "specialty": "fonoaudiologia"
    }
}---- 


agiora irei cacnelar o pre curl 'http://localhost:5000/api/pre-agendamento/69b8430d376d6fdedf2d0b85/cancelar' \
  -X 'POST' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' \
  -H 'Authorization: Bearer agenda_export_token_fono_inova_2025_secure_abc123' \
  -H 'Connection: keep-alive' \
  -H 'Content-Length: 0' \
  -H 'Origin: http://localhost:5174' \
  -H 'Referer: http://localhost:5174/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36' \
  -H 'sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"' \
  -H 'sec-ch-ua-mobile: ?1' \
  -H 'sec-ch-ua-platform: "Android"'
  +
  acho qeu isso emsmo pre cacnelou nem precisa mostrar ...{"success":true,"message":"Pré-agendamento cancelado"}
  