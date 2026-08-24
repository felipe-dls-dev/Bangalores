# Bangalore's

## Jogar online

**[Abrir Bangalore's no navegador](https://felipe-dls-dev.github.io/Bangalores/)**

O jogo roda diretamente no navegador e salva o progresso localmente no dispositivo do jogador.

## Documentação

- [docs/GAME_MECHANICS.md](docs/GAME_MECHANICS.md) — como os sistemas do jogo funcionam (combate, elementos, forja, aprimoramento, talentos, masmorras, dificuldade, cooperativo).
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — arquitetura do código, convenções e armadilhas conhecidas (referências de instância de equipamento, duplicação solo/coop, cascata do CSS).
- [docs/COOP_SETUP.md](docs/COOP_SETUP.md) — como ativar o cooperativo online (Supabase).
- [CHANGELOG.md](CHANGELOG.md) — histórico de mudanças.

## Catálogo das cartas

A planilha com os dados das cartas e os endereços de suas artes está disponível em
[docs/catalogo-cartas-bangalores.xlsx](docs/catalogo-cartas-bangalores.xlsx).

**Versão web atual: v0.3.0 — Premium UI** — Web RPG

Versão web experimental do jogo de cartas/RPG, construída com React + TypeScript + Vite + Zustand + Framer Motion.

## Recursos desta versão

- Nome do jogo alterado para **Bangalore's**.
- Seleção de heróis com imagens.
- Equipamentos iniciais coerentes por classe.
- Mapa interativo de Havendown.
- Ficha com vida, ataque, defesa, XP, níveis e pontos de atributo.
- 1 ouro ganho em combate = 1 XP. Ouro de vendas não concede XP.
- Mochila com consumíveis e limite de 8 equipamentos não equipados.
- Slots: Amuleto/Capacete, Anel 1/Peitoral, Anel 2/Calças, Mão esquerda/Mão direita e Botas.
- Loja com compra e venda.
- Galeria de cartas; navegação da biblioteca existe apenas nessa tela.
- Combate com cara ou coroa, animações simples, registro e bloqueio de ações durante animações.
- Habilidade do herói e habilidade do equipamento limitadas a uma vez por combate.
- Monstros de elite, chefes por região, fases de chefe e loot final.
- Auto-save no navegador via Zustand persist/localStorage.
- Layout responsivo para desktop, tablet e celular.

## Rodar no VS Code

Requer Node.js 20+.

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite.

## Build

```bash
npm run build
npm run preview
```

## Publicar no GitHub Pages

O projeto inclui `.github/workflows/deploy-pages.yml`. Crie um repositório, faça push para a branch `main` e em **Settings > Pages** selecione **GitHub Actions** como fonte.

O `vite.config.ts` usa `base: './'`, permitindo publicação em um subdiretório do GitHub Pages.

## Save

O save fica no navegador do jogador (`localStorage`, chave `bangalores-save-v1`). Nesta primeira versão, ele não sincroniza entre dispositivos.


## v0.1.1
- Corrigido o encerramento de combate: vitória abre imediatamente os espólios e o botão **Voltar ao mapa** encerra o estado de combate por completo.
- Limpeza segura de inimigo, moeda, animações e flags de turno ao voltar ao mapa.

## v0.2.0 — Moldura oficial de cartas

- Nova moldura dinâmica oficial do Bangalore's na Galeria.
- Artes separadas das imagens completas das cartas.
- Raridade visual com molduras próprias.
- Equipamentos equipados agora mostram atributos e habilidade.
- Itens da mochila, loja e espólios usam a arte do item em vez da carta completa.
- Inimigos em combate passam a usar a arte extraída da carta.
- Ajustes de responsividade para manter a batalha inteira visível em notebooks comuns, reduzindo a necessidade de rolagem.

## Exploração por sub-regiões (v0.4.0)
O mapa agora funciona em duas etapas: escolha uma região principal e, em seguida, selecione uma sub-região. Cada sub-região tem faixa de nível, progresso, eventos de exploração, inimigos próprios, variantes de dificuldade e um chefe desbloqueado após completar a exploração necessária.

Destaques: Labirinto de Kholgard, Templo do Minotauro, Mina dos Anões Caídos, Caverna de Gelo e Ninho do Dragão Vermelho.
