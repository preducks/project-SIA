// ============================================================
//  server.js — Simulador local do site SIA
//  Reproduz as mesmas rotas que o ESP32_WebServer.ino serviria,
//  para rodar o site 100% no PC (VS Code) sem hardware.
// ============================================================
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
//  CONFIGURAÇÃO DA IA — Google Gemini
// ============================================================
// Cole sua chave da API do Gemini (Google AI Studio) aqui embaixo,
// entre as aspas, OU defina a variável de ambiente GEMINI_API_KEY
// (recomendado — evita deixar a chave exposta no código).
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "COLOQUE_AQUI_SUA_CHAVE_DO_GEMINI";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-2.5-flash"; // pode trocar pelo modelo que preferir
// ============================================================

// ------------------------------------------------------------
//  Cadastro de usuários (arquivo JSON local, sem banco de dados)
// ------------------------------------------------------------
const USERS_FILE = path.join(__dirname, 'data', 'usuarios.json');

function garantirArquivoUsuarios() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    // Usuários que já existiam antes (mantidos para não quebrar o acesso atual)
    const seed = [
      { nome: 'pedro', senha: '130724', email: null, origem: 'local' },
      { nome: 'vinicius', senha: 'vnz00', email: null, origem: 'local' }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(seed, null, 2));
  }
}

function lerUsuarios() {
  garantirArquivoUsuarios();
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function salvarUsuarios(lista) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(lista, null, 2));
}

// ------------------------------------------------------------
//  Páginas (mesmas rotas que o firmware original usava)
// ------------------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'home.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});
app.get('/cadastro', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'cadastro.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});
app.get('/relatorios', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'relatorios.html'));
});
app.get('/ia', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'ia.html'));
});

// ------------------------------------------------------------
//  Autenticação
// ------------------------------------------------------------

// Login local (usuário/senha)
app.post('/api/login', (req, res) => {
  const { nome, senha } = req.body || {};
  const usuarios = lerUsuarios();
  const n = (nome || '').trim().toLowerCase();
  const usuario = usuarios.find(u => u.nome.toLowerCase() === n && u.senha === senha);

  if (usuario) {
    res.json({ ok: true, nome: usuario.nome });
  } else {
    res.status(401).json({ ok: false, erro: 'Nome ou senha incorretos!' });
  }
});

// Cadastro local (usado quando não há nada cadastrado ainda / novo usuário)
app.post('/api/registrar', (req, res) => {
  const { nome, senha } = req.body || {};

  if (!nome || !senha) {
    return res.status(400).json({ ok: false, erro: 'Preencha usuário e senha.' });
  }

  const usuarios = lerUsuarios();
  const n = nome.trim().toLowerCase();

  if (usuarios.some(u => u.nome.toLowerCase() === n)) {
    return res.status(409).json({ ok: false, erro: 'Esse nome de usuário já está cadastrado.' });
  }

  usuarios.push({ nome: nome.trim(), senha, email: null, origem: 'local' });
  salvarUsuarios(usuarios);

  res.json({ ok: true });
});

// Login/cadastro automático via Google (cria a conta na primeira vez)
app.post('/api/google', (req, res) => {
  const { nome, email } = req.body || {};

  if (!email) {
    return res.status(400).json({ ok: false, erro: 'Não foi possível ler os dados da conta Google.' });
  }

  const usuarios = lerUsuarios();
  let usuario = usuarios.find(u => u.email === email);

  if (!usuario) {
    usuario = { nome: nome || email.split('@')[0], senha: null, email, origem: 'google' };
    usuarios.push(usuario);
    salvarUsuarios(usuarios);
  }

  res.json({ ok: true, nome: usuario.nome });
});

// ------------------------------------------------------------
//  "API" simulada — no ESP32 real esses dados vêm dos sensores.
//  Aqui geramos valores de mentira só para o site funcionar
//  visualmente sem o hardware conectado.
// ------------------------------------------------------------

// Sincronização de hora (o ESP32 usava isso pra ajustar o RTC)
app.get('/set_hora', (req, res) => {
  res.send('OK');
});

// Dados em tempo real do dashboard
let contadorRegas = 12;

// Guarda a última leitura dos sensores para a IA poder consultar
// (no ESP32 real, isso viria direto dos sensores conectados).
let ultimosDados = null;

function gerarDadosSensores() {
  ultimosDados = {
    umidade: Math.floor(30 + Math.random() * 60),
    umidadeAr: Math.floor(35 + Math.random() * 55),
    temperatura: (18 + Math.random() * 17).toFixed(1),
    uv: (Math.random() * 11).toFixed(1),
    agua: Math.floor(20 + Math.random() * 80),
    bomba: Math.random() > 0.7 ? 'Ligada' : 'Desligada',
    regas: contadorRegas
  };
  return ultimosDados;
}

app.get('/dados', (req, res) => {
  res.json(gerarDadosSensores());
});

// Dados da página de Relatórios
app.get('/dados_rel', (req, res) => {
  res.json({
    totalRegas: 48,
    regasHoje: 3,
    mediaDiaria: 4.6,
    nivelAgua: 72,
    historico: [
      { data: '30/08/2026', hora: '14:32', umidade: 45, nivel: 70 },
      { data: '29/08/2026', hora: '09:10', umidade: 38, nivel: 65 },
      { data: '28/08/2026', hora: '18:05', umidade: 52, nivel: 78 }
    ],
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    regasPorDia: [3, 5, 2, 4, 6, 1, 3]
  });
});

// Assistente IA — agora usando o Google Gemini, com acesso aos dados dos sensores
app.get('/perguntar_ia', async (req, res) => {
  const q = req.query.q || '';

  if (!q.trim()) {
    return res.send('Digite uma pergunta.');
  }

  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'COLOQUE_AQUI_SUA_CHAVE_DO_GEMINI') {
    return res.send(
      'A chave da API do Gemini ainda não foi configurada. ' +
      'Defina a variável de ambiente GEMINI_API_KEY ou cole a chave em server.js.'
    );
  }

  // Sempre manda para a IA a leitura mais recente dos sensores.
  // Se ninguém abriu o dashboard ainda, gera uma leitura na hora.
  const sensores = ultimosDados || gerarDadosSensores();

  const contextoSensores =
    `Dados atuais dos sensores do SIA:\n` +
    `- Umidade do solo: ${sensores.umidade}%\n` +
    `- Umidade do ar: ${sensores.umidadeAr}%\n` +
    `- Temperatura: ${sensores.temperatura}°C\n` +
    `- Índice UV: ${sensores.uv}\n` +
    `- Nível de água no reservatório: ${sensores.agua}%\n` +
    `- Bomba d'água: ${sensores.bomba}\n` +
    `- Total de regas até agora: ${sensores.regas}`;

  try {
    const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text:
              'Você é o assistente do SIA (Sistema de Irrigação Automatizado). ' +
              'Responda de forma curta, clara e útil sobre irrigação, sensores, ' +
              'umidade do solo, umidade do ar, temperatura e recomendações de rega. ' +
              'Sempre que a pergunta permitir, use os dados reais dos sensores abaixo ' +
              'para basear sua resposta.\n\n' + contextoSensores
          }]
        },
        contents: [
          { role: 'user', parts: [{ text: q }] }
        ]
      })
    });

    if (!resposta.ok) {
      const erroTexto = await resposta.text();
      console.error('Erro na API do Gemini:', resposta.status, erroTexto);
      return res.send(`Erro ao consultar a IA (Gemini): ${resposta.status}`);
    }

    const dados = await resposta.json();
    const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || 'A IA não retornou uma resposta.';
    res.send(texto);

  } catch (erro) {
    console.error('Falha ao chamar o Gemini:', erro);
    res.send('Erro na conexão com a IA (Gemini). Verifique sua internet e a chave da API.');
  }
});

app.listen(PORT, () => {
  console.log(`\n🌱 SIA rodando em http://localhost:${PORT}`);
  console.log(`   Login: pedro / 130724   ou   vinicius / vnz00\n`);
});
