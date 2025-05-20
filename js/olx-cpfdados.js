const axios = require("axios");
const fs = require("fs");
const cheerio = require("cheerio"); // Adicione esta linha para importar cheerio

// Função para criar a configuração com ID personalizado
function criarConfig(listId) {
  return {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://comprasegura.olx.com.br/?listId=${listId}&source=ADVIEW`,
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,/;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      priority: "u=0, i",
      referer: "https://sp.olx.com.br/",
      "sec-ch-ua":
        '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-site",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      Cookie:
        "r_id=e642bdc5-7cb8-49cb-8673-46bcc2624e4f; nl_id=bdb118fa-8da1-4a5f-a160-b655738346c7; sf_utm_source=direct; l_id=eed898de-a41c-4358-880f-c99431544058; gcl_au=1.1.307155130.1742223381; AdoptVisitorId=KYRgLAnADBCssFoBMBjMBDBYwDMDsCEAHAGwoIo6gogDMRxSeQA=; _tt_enable_cookie=1; _ttp=01JPJ9P620DG8CBJXBK00B57FG.tt.2; fbp=fb.2.1742223383027.533845336158188670; _cc_id=c38da927d5bbc30857ce5417277833e0; intercom-device-id-wuvmjbzt=14511982-e835-471e-a5ff-04288ce2d418; __gsas=ID=8b378ebdcbf74ee5:T=1742231473:RT=1742231473:S=ALNI_MbSWhFmBqKXpRxYca5ve4UHYsNRBA; _hjSessionUser_3507498=eyJpZCI6IjBjZmIzOGFkLWM4MzYtNTE0YS05YzZjLWI3MjViNzUzYjM5ZiIsImNyZWF0ZWQiOjE3NDIyMjQ5Mzc2MzIsImV4aXN0aW5nIjp0cnVlfQ==; FCCDCF=%5Bnull%2Cnull%2Cnull%2C%5B%22CQOdysAQOdysAEsACBENBhFoAP_gAEPgAAKIJ4JD7C7FbSFC4H53aLsEMAhHRtAAQoQgAASBAmABQAKQIBQCgkAYFAygBCACAAAAICRBIQIECAAAAUAAQAAAAAAEAAAAAAAIIAAAgEEAAAAIAAACAIAAEAAIAAAAEAAAmAgAAIIACAAAgAAAAACAAAAAAAAAAACAAAAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBPBIPYXYraQoXQ8K7BdghgEK6NoACFCEAACQIEwAKABSBACAUkgCAIkUAAQAAAAABASIJAABAAEAAAgAKAAAAAAAgAAAAAABBAAAEAAgAAAAAAAAQBAAAgABAAAAAgAAESEAABBAAQAAAAAABAAQAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAA%22%2C%222~70.89.93.108.122.149.184.196.236.259.311.313.323.358.385.415.442.486.494.495.540.574.609.864.981.1029.1048.1051.1067.1095.1097.1126.1205.1276.1301.1329.1365.1415.1449.1514.1516.1570.1577.1598.1616.1651.1716.1735.1753.1765.1782.1870.1878.1889.1917.1958.1960.1985.2072.2253.2299.2328.2331.2373.2415.2501.2506.2526.2531.2567.2568.2571.2575.2624.2677.2778.2878.2898.3234~dv.%22%2C%22F8040876-0676-4017-B2D1-7EE520A9ADB1%22%5D%5D; _hjSessionUser_736533=eyJpZCI6IjkwNDdlMTBiLWZhZWItNTJjYi1iMzliLWI3ZWJkODI5NjZjMyIsImNyZWF0ZWQiOjE3NDIzMDE2MDIwMjUsImV4aXN0aW5nIjp0cnVlfQ==; _ga_XGTQKQB3GG=GS1.3.1744663112.1.0.1744663112.0.0.0; _ga=GA1.1.1263717581.1742223382; sf_utm_medium=shared_link; sf_utm_campaign=; sf_utm_content=; sf_utm_term=; panoramaId_expiry=1747682057944; panoramaId=b933a307ec1a13b63418278994654945a702c520f8ca79b711328045d14a60d8; panoramaIdType=panoIndiv; __spdt=d8c546e9ee6a4135a4d62cf3079308e5; _clck=gixek%7C2%7Cfvu%7C0%7C1902; SMART_LOCK_STATUS=off; nvg83482=15f326fdae4fcb1f41094f0d3a10|0_135; ACC_LL=0|cnMyNTA4MDE4QGdtYWlsLmNvbQ==; loginIdentifier=N2QxOTFlMTQyMTFkMjUwYWUwZGI3MTBlY2VmMDUzZjQ6ZmViZTQyZTcwYjE2YWE2ZGExNzUyYTZlODVkNjY0MTk1NTE5ZDcxYjU3NDgzMTYyYjQ4OTgyOTI0M2Q2NzU0ZTljODFhMDQyNDZiZjg3ODA2YWVhMjg5YjRjMTIzNjBmMWY2YTAyYWQ0ZjlkZjVhZjUzYWMxNDAyNWI0MTk3ODYxZThjNDQ2MmY2ODM2MDJkMGU2ZWViOTlhNmRhM2JlNzRlMjA2NDBmY2U4NjM1OGJkYjQyMDIxZDg4ZDNhZjhiNzMwODQ2N2FiOTMzZWNmOTFhNGUwMjMxMGQ5ZTJhODA5MjkwNzQ5MDQ5ZmFkZjU2MGIyNjI1NDQ0YTZjMTY1YzRlYjdkZDFhOTA4YmM0YThmNjQzZDQzNDllNmUwMDk5; session_id=INCOGNIA-WEB:ZoWZWt00OQ06T1oFtuka7Nduj_Q6xsJbvh55ebuv0jwYTvGCZ23lG6H4HuNkuBBDgzj4r_IJumUGl5_HV-Oi1w; fp_id=INCOGNIA-WEB:ZoWZWt00OQ06T1oFtuka7Nduj_Q6xsJbvh55ebuv0jwYTvGCZ23lG6H4HuNkuBBDgzj4r_IJumUGl5_HV-Oi1w; userID=10b5da72-c724-460a-95cb-1aacdec6ff1c; is-webview=false",
    },
  };
}

// Função para extrair informações do vendedor do HTML
function extrairDadosVendedor(html) {
  try {
    const $ = cheerio.load(html);

    // Procura o texto que contém o nome do vendedor e CPF
    const vendedorElement = $(
      'span.olx-text.olx-text--body-small:contains("Vendedor:")'
    );
    const cpfElement = $('span.olx-text.olx-text--body-small:contains("CPF:")');

    // Extrair o texto completo
    const vendedorTextoCompleto = vendedorElement.text().trim();
    const cpfTextoCompleto = cpfElement.text().trim();

    // Extrair apenas o nome do vendedor e CPF
    const nomeVendedor = vendedorTextoCompleto.replace("Vendedor:", "").trim();
    const cpfVendedor = cpfTextoCompleto.replace("CPF:", "").trim();

    return {
      nome: nomeVendedor,
      cpf: cpfVendedor,
    };
  } catch (error) {
    console.error("Erro ao extrair dados do vendedor:", error);
    return null;
  }
}

// Nova função para formatar os dados no formato solicitado
function formatarDadosVendedor(dados) {
  if (!dados || !dados.nome || !dados.cpf) return "/Nome3 Indisponível";

  // Extrair componentes do nome
  const partsNome = dados.nome.split(" ");
  const primeiroNome = partsNome[0] || "";

  // Obter as iniciais dos demais nomes
  let iniciais = "";
  for (let i = 1; i < partsNome.length && i <= 4; i++) {
    if (partsNome[i] && partsNome[i].length > 0) {
      iniciais += " " + partsNome[i][0].toUpperCase();
    }
  }

  // Preencher com iniciais padrão se faltarem
  while (iniciais.split(" ").length <= 4) {
    iniciais += " ";
  }

  // Extrair números do CPF (primeiros 6 dígitos ou o que estiver disponível)
  const numerosCpf = dados.cpf.replace(/\D/g, "").substring(0, 6);

  return `/Nome3 ${primeiroNome}${iniciais}${numerosCpf}`;
}

// Nova função para buscar informações com ID personalizado
async function buscarInfoComId(listId) {
  try {
    const novaConfig = criarConfig(listId);
    const response = await axios.request(novaConfig);

    // Extrai os dados do vendedor
    const dadosVendedor = extrairDadosVendedor(response.data);

    if (dadosVendedor) {
      const dadosFormatados = formatarDadosVendedor(dadosVendedor);

      return {
        dadosOriginais: dadosVendedor,
        dadosFormatados: dadosFormatados,
      };
    } else {
      console.log(`Não foi possível extrair dados do anúncio ${listId}`);
      return null;
    }
  } catch (error) {
    console.error(
      `Erro ao buscar informações para o anúncio ${listId}:`,
      error.message
    );
    return null;
  }
}

// Exporta a função para ser usada por outros scripts
module.exports = {
  buscarInfoComId,
  formatarDadosVendedor,
  extrairDadosVendedor,
};
