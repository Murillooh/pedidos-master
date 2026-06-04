var PASTA_DRIVE_ID = '1saQazfevhpRNebPnfNZbCXT_JK5SN1US'; 

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
  
  if (!sheet) {
    sheet = ss.insertSheet("Pedidos V2");
    
    // Configurar Cabeçalhos Bonitos
    var cabecalhos = [
      "Protocolo", "Data/Hora", "CNPJ", "Razão Social", "Responsável", 
      "Telefone", "E-mail", "Cidade", "Estado", "CEP", "Endereço", 
      "Número", "Bairro", "Complemento", "Urgência", "Pagamento", 
      "Validade Proposta", "Vendedor", "E-mail Aprovador", "Qtd Total", 
      "Valor Total", "Produtos", "Observações"
    ];
    
    sheet.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
    
    // Estilizar Cabeçalho
    var headerRange = sheet.getRange(1, 1, 1, cabecalhos.length);
    headerRange.setBackground("#080808");
    headerRange.setFontColor("#C9A84C");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    
    // Congelar a primeira linha para facilitar a rolagem
    sheet.setFrozenRows(1);
    
    // Ajustar larguras das colunas
    sheet.setColumnWidth(1, 120); // Protocolo
    sheet.setColumnWidth(2, 120); // Data
    sheet.setColumnWidth(4, 200); // Razão Social
    sheet.setColumnWidth(22, 350); // Produtos (lista)
  }
  
  var agora = new Date();
  var ano = agora.getFullYear();
  
  // Pegar último número do protocolo
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
  
  // Formatar Produtos para a Planilha e PDF
  var produtosHtml = "";
  var produtosStr = "";
  if (d.produtos && d.produtos.length > 0) {
    d.produtos.forEach(function(p) {
      produtosStr += p.qtd + "x " + p.modelo + (p.versao ? " ("+p.versao+")" : "") + " - R$ " + p.precoUnit + "\n";
      
      produtosHtml += "<tr>";
      produtosHtml += "<td style='padding:8px 0;border-bottom:1px solid #EAEAEA'>" + p.modelo + (p.versao ? " <small style='color:#777'>("+p.versao+")</small>" : "") + "</td>";
      produtosHtml += "<td style='padding:8px 0;border-bottom:1px solid #EAEAEA;text-align:center'>R$ " + p.precoUnit + "</td>";
      produtosHtml += "<td style='padding:8px 0;border-bottom:1px solid #EAEAEA;text-align:center'>" + p.qtd + "</td>";
      produtosHtml += "<td style='padding:8px 0;border-bottom:1px solid #EAEAEA;text-align:right'>R$ " + p.total + "</td>";
      produtosHtml += "</tr>";
    });
  } else {
    produtosHtml = "<tr><td colspan='4' style='text-align:center;padding:16px;color:#999'>Nenhum dispositivo adicionado.</td></tr>";
  }

  // GRAVAR NA PLANILHA (SEM CAMPOS ANTIGOS)
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
    produtosStr.trim(),
    d.observacoes || ''
  ]);
  
  // Fazer a célula dos produtos quebrar linha bonitinho
  var insertedRow = sheet.getLastRow();
  sheet.getRange(insertedRow, 22).setWrap(true); 

  // GERAR PDF COM O TEMPLATE
  var pdfUrl = gerarEsalvarPDF_V2(protocolo, d, produtosHtml, agora);
  
  return protocolo;
}

function gerarEsalvarPDF_V2(protocolo, dados, produtosHtml, agora) {
  var dataStr = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  
  // Mapa de urgência para cores no PDF
  var urgColor = '#5A5650';
  var urgText = 'NORMAL';
  if (dados.urgencia === 'urgente') { urgColor = '#E05245'; urgText = 'URGENTE'; }
  if (dados.urgencia === 'prioritario') { urgColor = '#C9A84C'; urgText = 'PRIORIDADE'; }
  
  var html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 40px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #C9A84C; padding-bottom: 20px; margin-bottom: 30px; }
  .header-left h1 { font-family: 'Times New Roman', serif; color: #7A6030; font-size: 32px; margin: 0; }
  .header-left p { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #8A8580; margin: 5px 0 0 0; }
  .header-right { text-align: right; }
  .header-right h2 { font-size: 16px; margin: 0 0 5px 0; color: #333; }
  .header-right p { font-size: 12px; color: #777; margin: 0; }
  
  .section { margin-bottom: 25px; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #7A6030; border-bottom: 1px solid #EAEAEA; padding-bottom: 5px; margin-bottom: 15px; font-weight: bold; }
  
  .grid { width: 100%; border-collapse: collapse; }
  .grid td { padding: 8px; vertical-align: top; }
  .label { font-size: 9px; text-transform: uppercase; color: #8A8580; letter-spacing: 1px; display: block; margin-bottom: 2px; }
  .value { font-size: 13px; font-weight: 500; color: #222; }
  
  .box { border: 1px solid #D0CCC5; padding: 15px; border-radius: 4px; background: #FAFAFA; }
  
  .table-produtos { width: 100%; border-collapse: collapse; margin-top: 10px; }
  .table-produtos th { text-align: left; font-size: 10px; text-transform: uppercase; color: #7A6030; border-bottom: 2px solid #C9A84C; padding: 8px 0; }
  .table-produtos td { font-size: 12px; }
  .total-row td { font-size: 16px; font-weight: bold; color: #7A6030; border-top: 2px solid #C9A84C; padding-top: 15px; margin-top: 15px; }
  
  .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #EAEAEA; padding-top: 20px; }
  
  .signature-block { width: 100%; margin-top: 50px; border-collapse: collapse; }
  .signature-block td { width: 50%; text-align: center; vertical-align: bottom; }
  .sign-line { border-top: 1px solid #333; width: 80%; margin: 0 auto; padding-top: 5px; font-size: 10px; text-transform: uppercase; color: #555; }
</style>
</head>
<body>

  <div class="header">
    <table style="width:100%"><tr>
      <td class="header-left" style="width:50%">
        <p>Portal Master — Pedido Oficial</p>
        <h1>\${dados.razaoSocial || 'Cliente'}</h1>
      </td>
      <td class="header-right" style="text-align:right">
        <p style="font-size:10px;text-transform:uppercase;color:#8A8580;letter-spacing:1px;margin-bottom:4px">Protocolo</p>
        <h2>\${protocolo}</h2>
        <p>\${dataStr}</p>
      </td>
    </tr></table>
  </div>

  <div class="section">
    <div class="section-title">Dados do Cliente</div>
    <div class="box">
      <table class="grid">
        <tr>
          <td style="width:60%"><span class="label">Razão Social</span><span class="value">\${dados.razaoSocial || '—'}</span></td>
          <td style="width:40%"><span class="label">CNPJ</span><span class="value">\${dados.cnpj || '—'}</span></td>
        </tr>
        <tr>
          <td><span class="label">Responsável</span><span class="value">\${dados.responsavel || '—'}</span></td>
          <td><span class="label">Contato</span><span class="value">\${dados.telefone || '—'} <br> <span style="font-size:11px;color:#555">\${dados.email || ''}</span></span></td>
        </tr>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Logística e Entrega</div>
    <div class="box">
      <table class="grid">
        <tr>
          <td colspan="2"><span class="label">Endereço de Entrega</span>
            <span class="value">\${dados.logradouro || '—'}, \${dados.numero || 'S/N'} \${dados.complemento ? ' - '+dados.complemento : ''}<br>
            \${dados.bairro || '—'} | \${dados.cidadeEntrega || '—'} - \${dados.ufEntrega || '—'} | CEP: \${dados.cep || '—'}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2"><span class="label">Urgência</span><span class="value" style="color:\${urgColor};font-weight:bold">\${urgText}</span></td>
        </tr>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Resumo do Pedido</div>
    <table class="table-produtos">
      <thead>
        <tr>
          <th style="width:50%">Produto / Versão</th>
          <th style="width:20%;text-align:center">V. Unit.</th>
          <th style="width:10%;text-align:center">Qtd.</th>
          <th style="width:20%;text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        \${produtosHtml}
        <tr class="total-row">
          <td colspan="3" style="text-transform:uppercase;font-size:11px;letter-spacing:1px">Valor Total do Pedido (\${dados.totalQtd || '0'} un.)</td>
          <td style="text-align:right">R$ \${dados.totalValor || '0,00'}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section" style="margin-top:30px">
    <div class="section-title">Condições Comerciais</div>
    <div class="box">
      <table class="grid">
        <tr>
          <td style="width:33%"><span class="label">Pagamento</span><span class="value">\${dados.pagamento || '—'}</span></td>
          <td style="width:33%"><span class="label">Validade</span><span class="value">\${dados.validade || '—'}</span></td>
          <td style="width:33%"><span class="label">Vendedor</span><span class="value">\${dados.vendedor || '—'}</span></td>
        </tr>
      </table>
    </div>
  </div>

  \${dados.observacoes ? \`
  <div class="section" style="margin-top:20px">
    <div class="section-title">Observações</div>
    <div style="font-size:12px;color:#444;line-height:1.5">\${dados.observacoes}</div>
  </div>
  \` : ''}

  <table class="signature-block">
    <tr>
      <td><div class="sign-line">Assinatura do Cliente</div></td>
      <td><div class="sign-line">Aprovação / Portal Master</div></td>
    </tr>
  </table>

  <div class="footer">
    PORTAL MASTER — DOCUMENTO AUTOGERADO PELO SISTEMA — VALIDAÇÃO ELETRÔNICA
  </div>

</body>
</html>
  \`;

  var blob = Utilities.newBlob(html, 'text/html', protocolo + '.html').getAs('application/pdf');
  blob.setName(protocolo + '.pdf');
  
  var arquivo = DriveApp.getFolderById(PASTA_DRIVE_ID).createFile(blob);
  return arquivo.getUrl();
}
