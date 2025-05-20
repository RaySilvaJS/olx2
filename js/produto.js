const puppeteer = require("puppeteer");

async function extrairDadosProdutoOLX(url) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const dados = await page.evaluate(() => {
      const obterTexto = (seletor) =>
        document.querySelector(seletor)?.innerText || null;
      const obterImagens = () =>
        Array.from(document.querySelectorAll("img"))
          .map((img) => img.src)
          .filter((src) => src.includes("olx"));

      return {
        titulo: obterTexto("h1"),
        preco: obterTexto(
          "#price-box-container > div.ad__sc-q5xder-1.hoJpM > div:nth-child(1) > span"
        )
          .replace("R$", "")
          .replace(".", "")
          .trim(),
        nomeDono: obterTexto(
          "[class='olx-text olx-text--body-large olx-text--block olx-text--regular ad__sc-ypp2u2-4 TTTuh']"
        ),
        vendasConcluidas: obterTexto(
          "span[class='olx-text olx-text--body-large olx-text--block olx-text--semibold ad__sc-7hykp4-9 kzZAIY']"
        ),
        descricao: obterTexto(
          "#description-title > div > div.ad__sc-2mjlki-0.cbbFAE.olx-d-flex.olx-ai-flex-start.olx-fd-column > div > span > span"
        ),
        localizacao: `${obterTexto(
          "#location > div > div.ad__sc-o5hdud-1.jvsEyX.olx-d-flex.olx-ai-center > div > span.olx-text.olx-text--body-medium.olx-text--block.olx-text--semibold"
        )} - ${obterTexto(
          "#location > div > div.ad__sc-o5hdud-1.jvsEyX.olx-d-flex.olx-ai-center > div > span.olx-text.olx-text--body-small.olx-text--block.olx-text--semibold.olx-color-neutral-110"
        )}`,
        imagens: obterImagens(),
        url: window.location.href,
        dataExtracao: new Date().toISOString(),
      };
    });

    await browser.close();
    console.log("Dados extraídos com sucesso:", dados);
    return { sucesso: true, dados };
  } catch (erro) {
    await browser.close();
    return {
      sucesso: false,
      erro: erro.message,
    };
  }
}

module.exports = { extrairDadosProduto: extrairDadosProdutoOLX };
