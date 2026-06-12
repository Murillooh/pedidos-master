# Forms Portal Master

Este é um sistema de solicitação de pedidos de dispositivos, projetado para facilitar o envio e o registro de pedidos de forma automatizada.

## 🛠️ Tecnologias e Linguagens Utilizadas

O projeto é desenvolvido utilizando as seguintes linguagens e ferramentas:

*   **HTML5 & CSS3**: Estrutura e estilização da interface web, oferecendo um portal responsivo, moderno e limpo.
*   **JavaScript (Vanilla/ES6+)**: Lógica da interface, manipulação do formulário passo a passo, máscaras de campos (CNPJ, CEP, Telefone), busca automática de endereço (ViaCEP) e envio de dados para o processador do pedido.
*   **Google Apps Script (JavaScript)**: Lógica de retaguarda (backend) que roda na nuvem do Google, responsável pelo processamento dos pedidos enviados.
*   **Capacitor**: Plataforma utilizada para empacotar e converter a aplicação web em um aplicativo nativo para Android.

## 📋 Para que serve

O sistema serve para automatizar o processo de captação e registro de novos pedidos de dispositivos (como rastreadores e bloqueadores). O fluxo de funcionamento consiste em:

1.  **Portal de Solicitação (Web/Android):**
    *   O usuário preenche os dados cadastrais do cliente, endereço de entrega, o nível de urgência do pedido e adiciona os dispositivos desejados com suas respectivas versões e quantidades.
2.  **Automação e Integração (Google Apps Script):**
    *   **Registro no Google Sheets**: Os dados enviados são adicionados de forma estruturada em uma linha de controle da planilha.
    *   **Geração de Documento Oficial**: É gerado um PDF do pedido oficial, formatado e personalizado, contendo os detalhes preenchidos.
    *   **Armazenamento**: O PDF gerado é salvo automaticamente em uma pasta do Google Drive.
    *   **Envio de E-mails**: O sistema envia automaticamente a confirmação de recebimento com o PDF anexo para o e-mail do cliente, além de alertar o administrador sobre o novo pedido.
