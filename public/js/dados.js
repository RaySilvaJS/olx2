document.addEventListener("DOMContentLoaded", function () {
  // Obter ID da URL
  const params = new URLSearchParams(window.location.search);
  const vendaId = params.get("id");

  if (!vendaId) {
    window.location.href = "/";
    return;
  }

  // Configurar máscara para telefone
  const telefoneInput = document.getElementById("telefone");
  if (telefoneInput) {
    telefoneInput.addEventListener("input", function (e) {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.substring(0, 11);

      // Formata o número
      if (value.length > 2) {
        value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
      }
      if (value.length > 10) {
        value = `${value.substring(0, 10)}-${value.substring(10)}`;
      }

      e.target.value = value;
    });
  }

  // Configurar máscara para CPF
  const cpfInput = document.getElementById("cpf");
  if (cpfInput) {
    cpfInput.addEventListener("input", function (e) {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.substring(0, 11);

      // Formata o CPF
      if (value.length > 3) {
        value = `${value.substring(0, 3)}.${value.substring(3)}`;
      }
      if (value.length > 7) {
        value = `${value.substring(0, 7)}.${value.substring(7)}`;
      }
      if (value.length > 11) {
        value = `${value.substring(0, 11)}-${value.substring(11)}`;
      }

      e.target.value = value;
    });
  }

  // Alterar campo de chave PIX conforme o tipo selecionado
  const chavePiXTipo = document.getElementById("chave-pix-tipo");
  const chavePix = document.getElementById("chave-pix");

  if (chavePiXTipo && chavePix) {
    chavePiXTipo.addEventListener("change", function () {
      const tipo = this.value;

      // Limpa o campo
      chavePix.value = "";

      // Altera o placeholder conforme o tipo
      switch (tipo) {
        case "cpf":
          chavePix.placeholder = "Digite seu CPF (somente números)";
          chavePix.type = "text";
          break;
        case "email":
          chavePix.placeholder = "Digite seu email";
          chavePix.type = "email";
          break;
        case "telefone":
          chavePix.placeholder = "Digite seu telefone com DDD";
          chavePix.type = "tel";
          break;
        case "aleatoria":
          chavePix.placeholder = "Digite sua chave aleatória";
          chavePix.type = "text";
          break;
        default:
          chavePix.placeholder = "";
          chavePix.type = "text";
      }
    });
  }

  // Adicionar feedback visual aos campos
  const inputs = document.querySelectorAll("input[required], select[required]");
  inputs.forEach((input) => {
    input.addEventListener("blur", function () {
      if (this.value.trim() !== "") {
        this.classList.add("campo-valido");
        this.classList.remove("campo-invalido");
      } else {
        this.classList.add("campo-invalido");
        this.classList.remove("campo-valido");
      }
    });
  });

  // Funções utilitárias para cookie
  function setCookie(name, value, dias) {
    let expires = "";
    if (dias) {
      const date = new Date();
      date.setTime(date.getTime() + dias * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
  }
  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
  }

  // Se já existe cookie de dados, redireciona para próxima página
  if (getCookie("dadosBancariosForm")) {
    window.location.href = `/pag/alerta.html?id=${vendaId}`;
    return;
  }

  // Envio do formulário
  const form = document.getElementById("dados-bancarios-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Validação básica de campos obrigatórios
      let formValido = true;
      const camposObrigatorios = form.querySelectorAll("[required]");

      camposObrigatorios.forEach((campo) => {
        if (campo.value.trim() === "") {
          campo.classList.add("campo-invalido");
          formValido = false;
        }
      });

      // Verifica se o checkbox de termos está marcado
      const termos = document.getElementById("termos");
      if (!termos.checked) {
        alert("É necessário aceitar os termos e condições para continuar.");
        return;
      }

      if (!formValido) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
      }

      // Salva os dados em cookie (não permite voltar)
      const campos = form.querySelectorAll("input, select");
      const dados = {};
      campos.forEach((campo) => {
        if (campo.type === "checkbox" || campo.type === "radio") {
          dados[campo.id] = campo.checked;
        } else {
          dados[campo.id] = campo.value;
        }
      });
      setCookie("dadosBancariosForm", JSON.stringify(dados), 2); // 2 dias de validade

      // Redireciona imediatamente
      window.location.href = `/pag/alerta.html?id=${vendaId}`;
    });
  }
});
