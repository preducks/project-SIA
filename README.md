# SIA — Simulador Local (VS Code)

Este pacote contém o site completo (HTML/CSS/JS) mais um pequeno servidor
Node.js que reproduz as rotas que o ESP32 forneceria (`/`, `/login`,
`/dashboard`, `/relatorios`, `/ia`, `/dados`, etc). Assim o site roda
inteiro no seu PC, com navegação e dados de sensores simulados.

## Como rodar

1. Abra a pasta `sia_project` no VS Code.
2. Abra o terminal integrado (Ctrl+`) e rode:
   ```
   npm install
   npm start
   ```
3. Acesse **http://localhost:3000** no navegador.

## Login

- usuário: `pedro` — senha: `130724`
- usuário: `vinicius` — senha: `vnz00`

## Estrutura

```
sia_project/
├── server.js          → servidor Express (rotas + dados simulados)
├── package.json
├── public/             → CSS e JS (servidos como /style.css, /dash.js...)
│   ├── style.css, login.css, home.css, dash.css, rel.css, ia.css
│   └── dash.js, rel.js, ia.js
└── views/               → páginas HTML
    ├── home.html, login.html, dashboard.html
    ├── relatorios.html, ia.html
```

## Observação

Os dados do dashboard (umidade, temperatura, UV, nível de água, bomba) e do
assistente de IA são **simulados aleatoriamente** pelo `server.js`, já
que aqui não há um ESP32 real com sensores conectados. Quando for subir
para o hardware de verdade, essas rotas (`/dados`, `/dados_rel`,
`/perguntar_ia`) devem voltar a ser implementadas no firmware, lendo os
sensores reais — o HTML/CSS/JS front-end pode continuar exatamente o
mesmo.
