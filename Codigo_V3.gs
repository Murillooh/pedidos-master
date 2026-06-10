var PASTA_DRIVE_ID = '1saQazfevhpRNebPnfNZbCXT_JK5SN1US'; 

// =====================================================================
// FUNÇÃO PARA AUTORIZAR O GOOGLE A ENVIAR E-MAILS (EXECUTE-A UMA VEZ!)
// =====================================================================
function autorizarEmails() {
  var email = Session.getEffectiveUser().getEmail();
  Logger.log("Permissão concedida! O sistema agora pode enviar e-mails usando a conta: " + email);
}

function doPost(e) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Content-Type': 'application/json'
  };

  try {
    var dados = JSON.parse(e.postData.contents);
    var protocolo = processarPedidoV2(dados);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', protocolo: protocolo }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'erro', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function processarPedidoV2(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Pedidos V2");
  
  var cabecalhos = [
    "Protocolo", "Data/Hora", "CNPJ", "Razão Social", "Responsável", 
    "Telefone", "E-mail", "Cidade", "Estado", "CEP", "Endereço", 
    "Número", "Bairro", "Complemento", "Urgência", "Pagamento", 
    "Validade Proposta", "Vendedor", "E-mail Aprovador", "Qtd Total", 
    "Valor Total", "Produtos", "Observações"
  ];

  if (!sheet) {
    sheet = ss.insertSheet("Pedidos V2");
    
    var maxRows = sheet.getMaxRows();
    var maxCols = sheet.getMaxColumns();
    var allRange = sheet.getRange(1, 1, maxRows, maxCols);
    allRange.setBackground("#0B1B3D"); 
    allRange.setFontColor("#C9A84C"); 
    allRange.setVerticalAlignment("middle");
    allRange.setBorder(true, true, true, true, true, true, "#1E3050", SpreadsheetApp.BorderStyle.SOLID);
    
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 120);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(4, 200);
    sheet.setColumnWidth(22, 350); 
  }
  
  var headerRange = sheet.getRange(1, 1, 1, cabecalhos.length);
  headerRange.setValues([cabecalhos]); 
  headerRange.setBackground("#000000"); 
  headerRange.setFontColor("#C9A84C"); 
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  headerRange.setBorder(true, true, true, true, true, true, "#C9A84C", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.setRowHeight(1, 40); 
  
  var agora = new Date();
  var ano = agora.getFullYear();
  
  var lastRow = sheet.getLastRow();
  var num = 1;
  if (lastRow > 1) {
    var lastProtocol = sheet.getRange(lastRow, 1).getValue();
    if (lastProtocol && lastProtocol.toString().indexOf("PED-" + ano) !== -1) {
      var partes = lastProtocol.toString().split('-');
      if (partes.length === 3) {
        num = parseInt(partes[2], 10) + 1;
      }
    }
  }
  
  var numStr = num.toString();
  while (numStr.length < 5) numStr = "0" + numStr;
  var protocolo = "PED-" + ano + "-" + numStr;
  
  var produtosHtml = "";
  var produtosStr = "";
  if (d.produtos && d.produtos.length > 0) {
    d.produtos.forEach(function(p) {
      produtosStr += p.qtd + "x " + p.modelo + (p.versao ? " ("+p.versao+")" : "") + " | ";
      
      produtosHtml += "<tr>";
      produtosHtml += "<td>" + p.modelo + "</td>";
      produtosHtml += "<td style='text-align:center'>" + (p.versao ? p.versao : "—") + "</td>";
      produtosHtml += "<td style='text-align:right'>" + p.qtd + "</td>";
      produtosHtml += "</tr>";
    });
    produtosStr = produtosStr.replace(/ \| $/, "");
  } else {
    produtosHtml = "<tr><td colspan='3' style='text-align:center'>Nenhum dispositivo adicionado.</td></tr>";
  }

  // GRAVAR NA PLANILHA
  sheet.appendRow([
    protocolo,
    Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
    d.cnpj || '',
    d.razaoSocial || '',
    d.responsavel || '',
    d.telefone || '',
    d.email || '',
    d.cidade || '',
    d.estado || '',
    d.cep || '',
    d.logradouro || '',
    d.numero || '',
    d.bairro || '',
    d.complemento || '',
    d.urgencia ? d.urgencia.toUpperCase() : 'NORMAL',
    d.pagamento || '',
    d.validade || '',
    d.vendedor || '',
    d.emailAprovador || '',
    d.totalQtd || '',
    d.totalValor || '',
    produtosStr,
    d.observacoes || ''
  ]);
  
  var insertedRow = sheet.getLastRow();
  sheet.getRange(insertedRow, 22).setWrap(false); 
  
  var insertedRowRange = sheet.getRange(insertedRow, 1, 1, 23);
  insertedRowRange.setBackground("#0B1B3D"); 
  insertedRowRange.setFontColor("#C9A84C"); 
  insertedRowRange.setVerticalAlignment("middle");
  insertedRowRange.setBorder(true, true, true, true, true, true, "#1E3050", SpreadsheetApp.BorderStyle.SOLID);

  // GERAR PDF COM O TEMPLATE NOVO (agora retorna o arquivo em si)
  var arquivoPDF = gerarEsalvarPDF_V4(protocolo, d, produtosHtml, agora);
  
  // =========================================================
  // ENVIAR E-MAILS WITH THE PDF ATTACHED
  // =========================================================
  try {
    var adminEmail = Session.getEffectiveUser().getEmail(); // Seu e-mail do Google
    var clienteEmail = d.email; // O e-mail que o cliente preencheu no formulário
    
    // 1. Enviando para o Cliente
    if (clienteEmail && clienteEmail.indexOf('@') !== -1) {
      var assuntoCliente = "Confirmação de Pedido - " + protocolo + " - Forms";
      var corpoCliente = "<h2>Olá, " + (d.responsavel || 'Cliente') + "!</h2>" +
                         "<p>Recebemos a sua solicitação de pedido com sucesso.</p>" +
                         "<p>Em anexo, você encontra a cópia oficial do seu pedido (<strong>" + protocolo + "</strong>) gerado pelo nosso sistema.</p>" +
                         "<br/><p>A equipe entrará em contato em breve.</p>" +
                         "<p><em>Portal Master - Forms</em></p>";
      
      MailApp.sendEmail({
        to: clienteEmail,
        subject: assuntoCliente,
        htmlBody: corpoCliente,
        attachments: [arquivoPDF.getBlob()]
      });
    }
    
    // 2. Enviando para o Administrador (Você)
    var assuntoAdmin = "NOVO PEDIDO: " + protocolo + " - " + (d.razaoSocial || 'Cliente Novo');
    var corpoAdmin = "<h2>Novo Pedido Recebido pelo Portal!</h2>" +
                     "<p>O cliente <strong>" + (d.razaoSocial || 'Não informado') + "</strong> gerou um novo pedido através do formulário.</p>" +
                     "<p>O documento em PDF contendo todos os detalhes está em anexo a este e-mail.</p>" +
                     "<br/><p>Para ver na planilha, acesse seu Google Sheets.</p>";
                     
    MailApp.sendEmail({
      to: adminEmail,
      subject: assuntoAdmin,
      htmlBody: corpoAdmin,
      attachments: [arquivoPDF.getBlob()]
    });
    
  } catch(e) {
    // Caso ocorra um erro no envio de e-mail, registramos no log, mas não quebramos o app
    console.log("Erro ao enviar e-mail: " + e.toString());
  }
  
  return protocolo;
}

function gerarEsalvarPDF_V4(protocolo, dados, produtosHtml, agora) {
  var dataStr = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  
  var urgClass = 'normal';
  var urgText = 'NORMAL';
  if (dados.urgencia === 'urgente') { urgClass = 'urgente'; urgText = 'URGENTE'; }
  if (dados.urgencia === 'prioritario') { urgClass = 'prioritario'; urgText = 'PRIORIDADE'; }
  
  var html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Pedido Oficial — Forms</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --gold:#C9A84C;--gold-light:#F0D080;--gold-dim:#7A6030;
  --bg:#080808;--s1:#111111;--s2:#181818;--s3:#1F1F1F;
  --border:#252525;--border-gold:#3A3020;
  --text:#E8E4DC;--muted:#5A5650;--muted2:#8A8580;
  --red:#E05245;--red-bg:#1A0C0B;
}
@media print{body{background:#fff!important}.page{box-shadow:none!important;border:none!important}
  :root{--bg:#fff;--s1:#fff;--s2:#f7f7f5;--s3:#f0efe9;--border:#ddd;--border-gold:#d4c5a0;
    --text:#1C1C1C;--muted:#999;--muted2:#666;--gold:#B8963E;--gold-light:#C9A84C;--gold-dim:#B8963E}}
body{font-family:'DM Sans',sans-serif;background:var(--bg);min-height:100vh;display:flex;
  align-items:flex-start;justify-content:center;padding:48px 20px;color:var(--text)}
.page{background:var(--s1);width:740px;max-width:100%;padding:60px 68px;position:relative;
  overflow:hidden;border:1px solid var(--border);
  box-shadow:0 0 0 1px #000,0 32px 80px rgba(0,0,0,.7),inset 0 1px 0 rgba(201,168,76,.08)}
.page::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%;
  background:linear-gradient(180deg,var(--gold-dim) 0%,var(--gold) 40%,var(--gold-light) 55%,var(--gold) 70%,var(--gold-dim) 100%)}
.page::after{content:'';position:absolute;top:0;left:4px;right:0;height:1px;
  background:linear-gradient(90deg,var(--gold) 0%,transparent 60%)}

/* HEADER */
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
.brand-tag{font-size:9px;font-weight:600;letter-spacing:3.5px;text-transform:uppercase;color:var(--gold-dim);margin-bottom:8px}
.brand-name{font-family:'Playfair Display',serif;font-size:42px;font-weight:700;color:var(--gold-light);
  line-height:1;letter-spacing:-1.5px;text-shadow:0 0 40px rgba(201,168,76,.15)}
.protocol-block{text-align:right}
.protocol-label{font-size:9px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:var(--muted);margin-bottom:5px}
.protocol-number{font-family:'Playfair Display',serif;font-size:19px;font-weight:600;color:var(--gold);letter-spacing:1px}
.protocol-date{font-size:11.5px;color:var(--muted);margin-top:5px}
.urgencia-badge{display:inline-block;margin-top:8px;padding:3px 10px;font-size:9px;font-weight:700;
  letter-spacing:2px;text-transform:uppercase;border:1px solid}
.urgencia-badge.normal{color:var(--muted);border-color:var(--border)}
.urgencia-badge.prioritario{color:#E8A930;border-color:#E8A930}
.urgencia-badge.urgente{color:var(--red);border-color:var(--red)}

/* DIVIDER */
.divider{height:1px;background:linear-gradient(90deg,var(--gold) 0%,var(--border-gold) 50%,transparent 100%);margin-bottom:36px}

/* SECTION TITLE */
.section-title{font-size:8.5px;font-weight:700;letter-spacing:3.5px;text-transform:uppercase;
  color:var(--gold);margin-bottom:14px;display:flex;align-items:center;gap:12px}
.section-title::after{content:'';flex:1;height:1px;background:var(--border)}

/* CLIENT GRID */
.client-grid{border:1px solid var(--border);margin-bottom:32px;overflow:hidden}
.client-row{display:flex;border-bottom:1px solid var(--border)}
.client-row:last-child{border-bottom:none}
.client-label{width:200px;flex-shrink:0;padding:12px 18px;font-size:9.5px;font-weight:700;
  letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);
  border-right:1px solid var(--border);background:var(--s2)}
.client-value{padding:12px 18px;font-size:13px;color:var(--text)}

/* ADDRESS */
.address-box{border:1px solid var(--border);border-left:3px solid var(--gold);
  padding:15px 20px;background:var(--s2);margin-bottom:32px;font-size:13px;
  line-height:1.8;color:var(--text)}

/* TABLE */
.table-wrap{margin-bottom:0}
table{width:100%;border-collapse:collapse}
thead th{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  color:var(--gold);padding:13px 16px;border-bottom:1px solid var(--gold-dim);
  background:var(--s2);text-align:left}
thead th:last-child{text-align:right}
tbody tr{border-bottom:1px solid var(--border)}
tbody td{padding:14px 16px;font-size:13.5px;color:var(--text)}
tbody td:nth-child(2){text-align:center;color:var(--muted2);font-size:12px}
tbody td:last-child{text-align:right;font-weight:600}
.total-section{background:var(--s3)!important;border-top:1px solid var(--gold-dim)!important}
.total-section td{padding:16px!important}
.total-section td:first-child{font-size:9px!important;letter-spacing:2.5px;
  text-transform:uppercase;color:var(--muted)!important;font-weight:700!important}
.total-section td:last-child{font-family:'Playfair Display',serif;font-size:26px!important;
  color:var(--gold-light)!important;font-weight:700!important;
  text-shadow:0 0 20px rgba(201,168,76,.2)}

/* INFO BOXES */
.info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--border);
  border:1px solid var(--border);margin-bottom:32px}
.info-cell{background:var(--s1);padding:14px 18px}
.info-cell-label{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--muted);margin-bottom:5px}
.info-cell-value{font-size:13px;color:var(--text)}

/* NOTES */
.notes-box{border:1px solid var(--border);padding:14px 18px;margin-bottom:20px;background:var(--s2)}
.notes-label{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--muted);margin-bottom:7px}
.notes-text{font-size:13px;color:var(--text);line-height:1.6}

/* ALERT */
.alert{border:1px solid #3A1A18;border-left:4px solid var(--red);background:var(--red-bg);
  padding:14px 18px;font-size:12px;line-height:1.7;color:#D4907A;
  margin-bottom:52px;display:flex;gap:12px;align-items:flex-start}
.alert-icon{font-size:15px;flex-shrink:0;margin-top:1px}
.alert strong{color:var(--red);font-weight:600}

/* SIGNATURES */
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:56px;margin-bottom:44px}
.sig-block{display:flex;flex-direction:column;align-items:center}
.sig-line{width:100%;height:1px;background:var(--border);margin-bottom:11px}
.sig-label{font-size:10px;font-weight:400;letter-spacing:.5px;color:var(--muted);text-align:center}

/* FOOTER */
.footer{text-align:center;font-size:9.5px;color:var(--muted);letter-spacing:2px;
  text-transform:uppercase;border-top:1px solid var(--border);padding-top:18px}

/* spacer */
.mb{margin-bottom:32px}
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="brand-block">
      <div class="brand-tag">Portal Master — Pedido Oficial</div>
      <div class="brand-name">Forms</div>
    </div>
    <div class="protocol-block">
      <div class="protocol-label">Protocolo</div>
      <div class="protocol-number">${protocolo}</div>
      <div class="protocol-date">${dataStr}</div>
      <div class="urgencia-badge ${urgClass}">${urgText}</div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- CLIENTE -->
  <div class="section-title">Dados do Cliente</div>
  <div class="client-grid mb">
    <div class="client-row">
      <div class="client-label">Razão Social</div>
      <div class="client-value">${dados.razaoSocial || '—'}</div>
    </div>
    <div class="client-row">
      <div class="client-label">CNPJ</div>
      <div class="client-value">${dados.cnpj || '—'}</div>
    </div>
    <div class="client-row">
      <div class="client-label">Responsável</div>
      <div class="client-value">${dados.responsavel || '—'}</div>
    </div>
    <div class="client-row">
      <div class="client-label">Cidade / Estado</div>
      <div class="client-value">${dados.cidade || '—'} — ${dados.estado || '—'}</div>
    </div>
    <div class="client-row">
      <div class="client-label">Telefone</div>
      <div class="client-value">${dados.telefone || '—'}</div>
    </div>
    <div class="client-row">
      <div class="client-label">E-mail</div>
      <div class="client-value">${dados.email || '—'}</div>
    </div>
  </div>

  <!-- ENTREGA -->
  <div class="section-title">Endereço de Entrega</div>
  <div class="address-box mb">
    ${dados.logradouro || '—'}, ${dados.numero || 'S/N'}${dados.complemento ? ' · '+dados.complemento : ''} · ${dados.bairro || '—'}<br/>
    ${dados.cidade || '—'} — ${dados.estado || '—'} · CEP: ${dados.cep || '—'}
  </div>

  <!-- PRODUTOS -->
  <div class="section-title">Dispositivos Solicitados</div>
  <div class="table-wrap mb">
    <table>
      <thead>
        <tr>
          <th>Modelo / Dispositivo</th>
          <th style="text-align:center">Versão</th>
          <th style="text-align:right">Qtd.</th>
        </tr>
      </thead>
      <tbody>
        ${produtosHtml}
        <tr class="total-section">
          <td colspan="2">Total de Dispositivos</td>
          <td style="text-align:right">${dados.totalQtd || '0'}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- OBSERVACOES -->
  ${dados.observacoes ? `
  <div class="notes-box">
    <div class="notes-label">Observações</div>
    <div class="notes-text">${dados.observacoes}</div>
  </div>
  ` : ''}

  <!-- ALERT -->
  <div class="alert">
    <span class="alert-icon">⚠</span>
    <span><strong>Atenção:</strong> Este pedido foi validado com a equipe técnica quanto ao modelo correto do dispositivo antes do envio.</span>
  </div>

  <!-- ASSINATURAS -->
  <div class="signatures" style="grid-template-columns: 1fr; max-width: 350px; margin: 0 auto 44px;">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Assinatura / Responsável Master</div>
    </div>
  </div>

  <div class="footer">
    Portal Master &nbsp;·&nbsp; Documento autogerado pelo sistema &nbsp;·&nbsp; Validação Eletrônica
  </div>
</div>
</body>
</html>
  `;

  var blob = Utilities.newBlob(html, 'text/html', protocolo + '.html').getAs('application/pdf');
  blob.setName(protocolo + '.pdf');
  
  var arquivo = DriveApp.getFolderById(PASTA_DRIVE_ID).createFile(blob);
  return arquivo; // Agora retorna o objeto File do Drive
}
