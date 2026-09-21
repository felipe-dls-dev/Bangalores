# Battle Sprite Prompts -- KOF-style Fighter Sprites

Brief de arte para a mecânica "flip de batalha": a carta do herói vira automaticamente no início do combate (e puxa a carta do inimigo junto), revelando um personagem em pixel art animado -- estilo *King of Fighters '99* -- no lugar do retrato estático. Este arquivo contém os prompts prontos para colar em qualquer gerador de imagem (Antigravity, etc.). O registro de pipeline (ids, paths, status) fica em `docs/VISUAL_DEVELOPMENT_HANDOFF.md`, entrada **ART-030** -- leia aquela entrada primeiro para o contrato de entrega.

Os prompts abaixo estão em inglês de propósito (é onde os geradores de imagem têm melhor fidelidade a termos de estilo como "pixel art", "cel-shaded", "sprite sheet"). O resto do documento está em português para facilitar a leitura.

> **Nota de sincronismo:** enquanto este brief era escrito, já apareceu no repositório um scaffold de código consumindo exatamente esse contrato -- `src/battleSprites.ts` e `src/components/BattleSpriteActor.tsx` (ainda não commitados, ainda não plugados na tela de combate). As tabelas de estados/paths abaixo foram **alinhadas a esse código já existente**, e não ao rascunho original deste documento -- se você (ou o Antigravity) já tinha visto uma versão anterior com nomes de estado diferentes (`hit_heavy`, `hit_light`, `item_use`, `buff`...), ignore-a: a versão abaixo é a autoritativa, extraída direto de `BATTLE_ANIMATION_CONFIG` em `src/battleSprites.ts`.

## Conceito da mecânica (resumo)

1. Combate começa → a carta do herói gira em Y (flip 3D) e revela, no lugar do retrato pintado estático, o sprite animado em modo "idle" (respirando/pronto para lutar).
2. Um instante depois, a carta do inimigo vira também, automaticamente (efeito "showdown").
3. Durante o combate, a área de arte da carta passa a tocar a animação correspondente ao que está acontecendo -- ver `resolveFighterAnimationState()` em `src/battleSprites.ts` para a hierarquia exata (derrota > vitória > dano recebido > esquiva > bloqueio/reforço > Supremo > habilidade > poção > ataque/crítico > postura > parado).
4. Se um frame não existir ainda (404), `BattleSpriteActor` já cai de volta para a carta estática atual (`fallbackCard`) -- então dá para lançar a mecânica com sprites parciais sem quebrar nada.
5. Barra de vida, nome, emblema, badges de status e o restante da moldura da carta continuam exatamente como hoje; só a arte interna muda de imagem estática para sprite animado.

## Escopo desta leva (Fase 1)

O scaffold de código já lista os **9 heróis jogáveis** mais **8 inimigos nomeados** que já têm retrato próprio (não reaproveitado) no bestiário -- ver `ENEMY_NAME_TO_SPRITE_ID` em `src/battleSprites.ts`. Chefes (os 15 já ilustrados individualmente) e monstros comuns sem arte própria ficam para uma fase futura.

**Atenção ao tamanho real disto**: o código já define 13 estados de animação, alguns com até 12 frames cada (ver tabela abaixo). Somando os frames de todos os estados dá **95 frames por personagem**. Para os 17 personagens já escopados (9 heróis + 8 inimigos), isso é **~1.615 imagens individuais**. Gerar esse volume via prompt, mantendo o personagem consistente frame a frame, é o maior risco prático deste pedido -- geradores de imagem erram proporção/paleta entre gerações separadas com muita frequência.

Recomendação forte: **não pedir a matriz completa de uma vez**. Comece por um subconjunto mínimo que já prova a mecânica de ponta a ponta:

- **Onda 1 (MVP)**: `idle`, `attack`, `hit`, `victory`, `defeat` -- 5 dos 13 estados, só para os 9 heróis primeiro. Já dá pra ver o flip funcionando em combate real antes de investir nos outros 8 estados e nos 8 inimigos.
- **Onda 2**: completa os 13 estados dos 9 heróis.
- **Onda 3**: os 8 inimigos nomeados, nos mesmos 13 estados (ou num subconjunto reduzido, já que inimigos aparecem menos tempo em tela que o próprio herói -- considere pular `stance_offensive`/`stance_defensive`/`skill` para eles se quiser cortar escopo).

## Direção de arte global (vale para todo prompt)

- Estilo: SNK Neo Geo, especificamente *King of Fighters '99* / *'98* -- contorno preto grosso e limpo, preenchimento cel-shaded chapado com 2-3 tons de sombra (nada de gradiente suave, nada de dithering ruidoso, nada de textura de pincel pintado).
- Luz vindo de cima-esquerda, com uma borda de luz (rim light) sutil no contorno oposto.
- Proporções levemente heroicas/exageradas, sempre priorizando silhueta legível mesmo em tamanho pequeno (a arte final aparece dentro de uma carta de ~300x300px na tela).
- Cada frame é desenhado à mão (aparência pixel-por-pixel), não vetorial nem suavizado por IA.
- Fundo **sempre transparente** (PNG RGBA real, sem checkerboard nem cor sólida).
- Personagem herói olhando/virado para a **direita** (o herói ataca em direção ao inimigo, que fica à direita na tela). Personagem inimigo virado para a **esquerda** (espelhado, mesma lógica já usada nos sprites de monstros do mapa).
- Sem sombra de chão desenhada (o componente já renderiza uma sombra própria via CSS -- `.battle-sprite-shadow`), sem UI, sem texto, sem marca d'água, sem numeração de frame writen na própria imagem, sem borda.

## Convenção técnica (arquivo e canvas)

- **Um arquivo PNG por frame** (não é mais uma tira/sprite-sheet -- o componente já escrito carrega frame a frame via `<img src>`, trocando a cada tick).
- Nome do arquivo: `<estado>_<NN>.png`, com `NN` = índice do frame com 2 dígitos e zero à esquerda, começando em `00` (ex.: `idle_00.png`, `idle_01.png`, ..., `attack_07.png`). Isso é extraído direto de `getBattleSpriteFramePath()` em `src/battleSprites.ts` -- não inventar outro padrão de nome.
- Caminho completo: `public/assets/battle/sprites/<heroes|enemies>/<id>/<estado>_<NN>.png` (o código referencia `assets/battle/sprites/...` relativo à raiz pública do Vite, ou seja, o arquivo físico mora em `public/assets/battle/sprites/...`).
- `<id>` para heróis = o id da classe (`guerreiro`, `cacadora`, etc.). Para os inimigos já mapeados, usar o id kebab-case já definido no código (ver tabela de inimigos abaixo) -- não o nome nem o id interno do bestiário.
- Canvas por frame: **proposta 96x128px**, nativo em pixel art (sem upscale prévio), retrato ~3:4 (bate com a região de arte da carta). Isso ainda não está fixado em nenhum CSS existente -- é a recomendação deste documento; confirmar antes de gerar o lote todo se alguém já decidiu um tamanho diferente.
- **Todos os frames de todos os estados de um mesmo personagem usam exatamente o mesmo canvas e o mesmo ponto de apoio dos pés (mesma linha de pixel em todo frame)** -- sem isso, trocar de frame ou de estado faz o personagem "pular" verticalmente, quebrando a ilusão de animação contínua. Este é o requisito técnico mais importante do pedido inteiro.

## Tabela de estados (extraída de `BATTLE_ANIMATION_CONFIG`)

| Estado (`BattleAnimationState`) | Frames | Loop? | Segura o último frame? | FPS | Gatilho no jogo | Ação a desenhar |
| --- | --- | --- | --- | --- | --- | --- |
| `idle` | 6 | Sim | -- | 8 | Padrão, fora de qualquer ação | Postura de combate pronta, respiração leve, balanço sutil da arma/capa |
| `stance_offensive` | 6 | Sim | -- | 8 | Postura Ofensiva ativa | Postura mais agressiva/inclinada para frente, arma erguida, peso nas pontas dos pés |
| `stance_defensive` | 6 | Sim | -- | 8 | Postura Defensiva ativa | Postura mais fechada/recuada, arma/braços mais protegendo o corpo |
| `attack` | 8 | Não | -- | 12 | Ataque normal | Antecipação → recuo → golpe/disparo → extensão total → follow-through → retorno à guarda |
| `heavy` | 10 | Não | -- | 12 | Ataque crítico (`attackCritical`) | Mesmo arco do `attack`, mas com mais impulso, uma rotação extra do corpo e um flash de impacto maior no frame de contato |
| `defend` | 5 | Não | -- | 10 | Bloqueio (`impactKind==='blocked'`) ou reforço ativo | Ergue arma/braços diante do golpe, absorve o impacto, mantém-se firme |
| `hit` | 4 | Não | -- | 10 | Recebendo dano (`shaking`) | Recuo abrupto do tronco, guarda momentaneamente quebrada, expressão de impacto |
| `dodge` | 5 | Não | -- | 12 | Esquiva (`impactKind==='dodged'`) | Passo lateral rápido, torso inclinado para fora da linha de ataque |
| `potion` | 7 | Não | -- | 10 | Usar consumível de cura | Pega o frasco na bolsa, leva à boca, bebe, breve brilho de recuperação ao redor do corpo |
| `skill` | 10 | Não | -- | 12 | Habilidade de classe ativa | Gesto/postura específico da habilidade do herói (ver coluna de habilidade na tabela de heróis) |
| `ultimate` | 12 | Não | -- | 12 | Golpe Supremo | Sequência mais longa e dramática -- carregamento de energia, golpe/explosão final, breve pose de aftermath |
| `victory` | 8 | Não | Sim | 8 | Combate vencido | Pose triunfante, arma erguida ou saudação de vitória; para no último frame |
| `defeat` | 8 | Não | Sim | 8 | Vida chega a 0 | Ajoelha ou cai, arma escorrega da mão; para no último frame (derrotado) |

## Tabela de heróis

| id | Conceito / silhueta | Arma principal | Habilidade ativa (referência p/ `skill`) | Paleta |
| --- | --- | --- | --- | --- |
| `guerreiro` | Legionário do Pico de Ignaris -- legionário pesado de montanha, armadura de placas com crista de leão | espada longa de fio "vento" | Ímpeto Marcial: brado de guerra, postura mais ereta e intimidadora | Aço polido, vermelho profundo e dourado, acabamento forjado nas montanhas |
| `cacadora` | Lâmina Mercenária de Kholgard -- mercenária ágil com capuz de raposa | duas adagas curvas ("facas do predador") | Ataque Duplo: preparação rápida, arma dupla erguida em posição de disparo consecutivo | Couro escuro com pele de raposa, paleta terrosa/preta, capuz/meia-máscara |
| `arcanista` | Mago do Sol Negro -- feiticeiro do conclave | cajado/orbe arcano ornamentado | Ascensão Arcana: braços erguidos, círculo de runas se abrindo ao redor | Vestes violeta-escuro e preto, detalhes dourados de eclipse, runas brilhantes |
| `guardiao` | Sentinela dos Portões Cinzentos -- sentinela pesadamente blindado | martelo de guerra pesado | Provocar: bate o martelo no chão/escudo, postura desafiadora | Placa cinza-ardósia, quase sem ornamento, silhueta de muralha imóvel |
| `druida` | Druida da Floresta de Abdendriel -- druida ligado à natureza | cajado de madeira viva com espinhos | Cura: gesto suave sobre o cajado, brilho verde ascendente | Verde musgo e marrom-casca, motivos de galhada/videira, paleta terrosa |
| `cacador` | Caçador das Terras de Morvath -- batedor das terras cinzentas | arco recurvo "Vigia das Cinzas" | Marca do Predador: mira fixa e prolongada, postura de foco predatório | Capa cinza-acastanhada, couro desgastado, pintura de guerra desbotada |
| `monge` | Monge do Pico de Ignaris -- monge temperado no fogo da montanha | punhos nus / manoplas envoltas em fogo | Golpe Flamejante: punhos se inflamam antes do golpe | Faixas açafrão e carvão, antebraços à mostra, brasas nos punhos |
| `sacerdotisa` | Sacerdotisa de Khar-Dur -- sacerdotisa de bênçãos de vida | cetro sagrado | Bênção da Vida: cetro erguido, luz dourada descendo sobre o corpo | Vestes branco e dourado cerimoniais, iconografia solar/vida, postura serena |
| `conjurador` | Conjurador do Sol Negro -- invocador de feras espectrais | totem "eco" | Conjurar Fera Espectral: totem erguido, silhueta espectral emergindo atrás | Traje ritualístico preto e violeta, adornos de osso/totem, névoa espectral |

## Tabela de inimigos (já mapeados em `ENEMY_NAME_TO_SPRITE_ID`)

| Nome no jogo | `id` do sprite | Referência de arte existente |
| --- | --- | --- |
| Sentinela Menor das Runas | `sentinela-runas` | procurar `arte` em `src/data/subregioes.json` |
| Grumnak, o Cobrador do Pedágio / Mestre do Pedágio | `grumnak` | mesmo boss de `boss-mestre-pedagio.webp` (ART-018) |
| Cabra Amaldiçoada de Malgor | `cabra-malgor` | `assets/art/monsters/cabra_malgor.webp` |
| Ilusionista das Areias | `ilusionista-areias` | procurar `arte` em `src/data/subregioes.json` |
| Guardiã da Seiva Negra | `guardia-seiva` | procurar `arte` em `src/data/subregioes.json` |
| Fanático do Orgulho | `fanatico-orgulho` | `assets/art/monsters/fanatico_orgulho.webp` |
| Corvo de Ignaroth | `corvo-ignaroth` | `assets/art/monsters/corvo_ignaroth.webp` |
| Espectro da Rainha Perdida | `espectro-rainha` | procurar `arte` em `src/data/subregioes.json` |

Mesma regra dos heróis: não redesenhar, só traduzir a arte de carta já existente de cada um para pose de perfil em pixel art.

## Fluxo de geração recomendado (âncora + referência)

Como a entrega agora é **um PNG por frame** (não mais uma tira única), a forma mais confiável de manter consistência entre frames com um gerador de imagem é encadear por referência, não descrever todos os frames num texto só:

1. **Frame-âncora**: gere primeiro um único frame de referência (sugestão: `idle_00`) com o prompt-molde completo abaixo. Esse frame fixa proporção, paleta, contorno e canvas.
2. **Frames seguintes**: para cada novo frame (do mesmo estado ou de outro), envie o frame-âncora (ou o frame anterior) como **imagem de referência/entrada** junto com um prompt curto de delta: "usando esta imagem de referência, mantenha exatamente o mesmo personagem, paleta, contorno e canvas de 96x128px com o mesmo ponto de apoio dos pés; mude apenas a pose para: {descrição específica deste frame}."
3. Isso vale tanto entre frames de um mesmo estado quanto entre estados diferentes do mesmo personagem -- sempre reusar o frame-âncora (ou o `idle_00` já aprovado) como imagem de referência para manter o mesmo personagem em todos os 95 frames.

## Prompt-molde (frame-âncora)

```
Pixel art fighting-game sprite, single frame, in the visual style of SNK's King of Fighters '99 (Neo Geo era): bold clean black outlines, flat cel-shaded color fills with 2-3 shading bands, no soft gradients, no dithering noise, no painterly blending. Light source from the upper-left with a subtle rim light on the opposite edge. Slightly heroic/exaggerated proportions with strong silhouette readability at small size. Hand-drawn pixel-by-pixel look, not vector-traced, not AI-smoothed.

Character: {CHARACTER_DESCRIPTION}, wielding {WEAPON}. {PALETTE_NOTES}. Match the established design from this game's existing character portrait and top-down overworld sprite -- do not redesign the costume, armor, weapon or color scheme, only reinterpret it as a side-view fighting stance.

Pose: {FRAME_ACTION_DESCRIPTION}

Canvas: exactly 96x128px, fully transparent background (RGBA PNG). Character faces {right for a hero / left for an enemy}, toward an opponent off-frame. Centered horizontally with consistent margins. The character's feet/ground-contact point must sit at a fixed baseline near the bottom of the canvas -- this exact baseline row must be reused for every future frame of this character. No background, no ground shadow, no UI, no text, no watermark, no frame numbers, no border.

Negative: extra limbs, extra fingers, distorted proportions, soft blurry anti-aliasing, painterly brush texture, 3D render, photo-real shading, semi-transparent edges, visible sprite seams, watermark, text, signature.
```

## Prompt-molde (frame seguinte, com referência)

```
Using the attached reference image as the exact character design to preserve: same proportions, same palette, same outline weight, same 96x128px canvas, same foot/ground-contact baseline row.

Change only the pose to: {FRAME_ACTION_DESCRIPTION}

Keep the transparent background, the same facing direction, and the same centered framing. No background, no ground shadow, no UI, no text, no watermark, no frame numbers, no border.
```

## Exemplo preenchido -- `guerreiro`, estado `idle` (6 frames)

Frame-âncora (`idle_00`):

```
Pixel art fighting-game sprite, single frame, in the visual style of SNK's King of Fighters '99 (Neo Geo era): bold clean black outlines, flat cel-shaded color fills with 2-3 shading bands, no soft gradients, no dithering noise, no painterly blending. Light source from the upper-left with a subtle rim light on the opposite edge. Slightly heroic/exaggerated proportions with strong silhouette readability at small size. Hand-drawn pixel-by-pixel look, not vector-traced, not AI-smoothed.

Character: a heavy mountain legionnaire in burnished steel plate armor with a lion-crest emblem, deep red and gold cloth accents, forged-in-the-mountains look, wielding a wind-etched one-handed longsword held low and ready. Match the established design from this game's existing character portrait and top-down overworld sprite -- do not redesign the costume, armor, weapon or color scheme, only reinterpret it as a side-view fighting stance.

Pose: standing battle-ready stance, weight balanced on both feet, sword held low in front, chest at the neutral point of a breathing cycle, eyes alert, looking right.

Canvas: exactly 96x128px, fully transparent background (RGBA PNG). Character faces right, toward an opponent off-frame. Centered horizontally with consistent margins. The character's feet/ground-contact point must sit at a fixed baseline near the bottom of the canvas -- this exact baseline row must be reused for every future frame of this character. No background, no ground shadow, no UI, no text, no watermark, no frame numbers, no border.

Negative: extra limbs, extra fingers, distorted proportions, soft blurry anti-aliasing, painterly brush texture, 3D render, photo-real shading, semi-transparent edges, visible sprite seams, watermark, text, signature.
```

Frames seguintes (`idle_01` a `idle_05`), cada um enviando `idle_00` como referência:

- `idle_01`: "chest slightly risen, mid-inhale, cape drifting slightly backward."
- `idle_02`: "chest at the peak of the inhale, shoulders very slightly raised."
- `idle_03`: "chest beginning to lower, mid-exhale, cape settling back down."
- `idle_04`: "chest near the bottom of the exhale, near the neutral resting point again."
- `idle_05`: "back to the exact neutral resting pose of idle_00, ready to loop seamlessly into frame 0."

## Exemplo preenchido -- `cacadora`, frame 1 de `attack` (8 frames)

```
Pixel art fighting-game sprite, single frame, in the visual style of SNK's King of Fighters '99 (Neo Geo era): bold clean black outlines, flat cel-shaded color fills with 2-3 shading bands, no soft gradients, no dithering noise, no painterly blending. Light source from the upper-left with a subtle rim light on the opposite edge. Slightly heroic/exaggerated proportions with strong silhouette readability at small size. Hand-drawn pixel-by-pixel look, not vector-traced, not AI-smoothed.

Character: an agile mercenary rogue in dark leather armor trimmed with fox fur, hood and half-mask, muted russet-and-black palette, wielding a pair of curved predator daggers, one in each hand. Match the established design from this game's existing character portrait and top-down overworld sprite -- do not redesign the costume, armor, weapon or color scheme, only reinterpret it as a side-view fighting stance.

Pose (attack, frame 1 of 8): crouched lean into a forward dash, both daggers pulled back at the hips, about to lunge.

Canvas: exactly 96x128px, fully transparent background (RGBA PNG). Character faces right, toward an opponent off-frame. Centered horizontally with consistent margins. The character's feet/ground-contact point must sit at a fixed baseline near the bottom of the canvas -- this exact baseline row must be reused for every future frame of this character. No background, no ground shadow, no UI, no text, no watermark, no frame numbers, no border.

Negative: extra limbs, extra fingers, distorted proportions, soft blurry anti-aliasing, painterly brush texture, 3D render, photo-real shading, semi-transparent edges, visible sprite seams, watermark, text, signature.
```

Frames 2-8, sempre enviando o frame anterior como referência: dash para frente → primeira adaga corta na altura do peito → pivô baixo → segunda adaga corta na direção oposta → as duas adagas se cruzam em X na extensão total → início da recuperação → volta para uma postura baixa de guarda, pronta para o próximo golpe.

Para os demais heróis, inimigos e estados: seguir exatamente este padrão (frame-âncora completo + frames seguintes por referência), puxando `{CHARACTER_DESCRIPTION}`/`{WEAPON}`/`{PALETTE_NOTES}` das tabelas acima e descrevendo a progressão de pose de acordo com a arma/estado (ex.: `furo` do `cacador` = puxar a flecha, mirar, soltar a corda, recuo do disparo, retorno à guarda; `martelo` do `guardiao` = erguer o martelo, girar o tronco, impacto no chão/alvo, recuo).

## Checklist de aceite antes de integrar

- [ ] Fundo realmente transparente (alpha real, não checkerboard nem cor sólida).
- [ ] Todos os frames de um mesmo personagem (em todos os estados) têm o mesmo canvas 96x128px e o mesmo ponto de apoio dos pés.
- [ ] Nenhum frame muda a escala/proporção do personagem em relação aos outros.
- [ ] O traço/paleta bate com o retrato de carta e o sprite de mapa já existentes do personagem.
- [ ] `idle` realmente parece "vivo" em loop (o frame 5 encaixa de volta no frame 0 sem salto).
- [ ] `attack`/`heavy` leem claramente a arma daquele personagem.
- [ ] Nome de arquivo exatamente `<estado>_<NN>.png` (2 dígitos, começando em 00), na pasta `public/assets/battle/sprites/<heroes|enemies>/<id>/`.
- [ ] Sem texto, marca d'água, numeração ou borda dentro da própria imagem.

## Fora do escopo desta leva

- Chefes (os 15 já ilustrados individualmente em ART-016 a ART-020) e monstros comuns sem arte própria.
- `fxOverlay` (`impact_slash`, `block_spark`, `heal_glow`, `status_fire`, já previstos como prop em `BattleSpriteActor`) -- ainda não têm contagem de frames nem convenção de path definida no código; tratar como um pedido de arte separado quando esse contrato for fechado.
- Variantes de arma por herói (hoje cada herói usa só a animação da sua arma "assinatura", independente do que está equipado) -- revisitar depois de validar o efeito visual com o FX de arma já existente por cima.

---

## Status de Integração Técnica (v0.8.50)

Todas as diretrizes e especificações deste documento foram implementadas e validadas:

1. **Motor de Sprites e Estados (`src/battleSprites.ts`)**:
   - Tabela oficial `BATTLE_ANIMATION_CONFIG` cobrindo todos os 13 estados de ação (`idle`, `stance_offensive`, `stance_defensive`, `attack`, `heavy`, `defend`, `hit`, `dodge`, `potion`, `skill`, `ultimate`, `victory`, `defeat`).
   - Normalizador de slugs de inimigos (`normalizeEnemySpriteId`).
   - Resolução reativa de estado em tempo real com prioridade de combate (`resolveFighterAnimationState`).
   - Gerador de paths canônicos de frame (`getBattleSpriteFramePath`).

2. **Componente de Ator de Batalha (`src/components/BattleSpriteActor.tsx`)**:
   - Controle de taxa de quadros (FPS) por estado com `requestAnimationFrame` ou timer de tick.
   - Sombra projetada em CSS (`.battle-sprite-shadow`) e suporte a arena lateral.
   - Espelhamento de inimigos via CSS `scaleX(-1)`.
   - Fallback gracioso imediato para a carta tradicional (`CardFrame`) em caso de erro 404 de imagem ou frame ausente.

3. **Experiência de Giro 3D da Carta (`src/styles.css` e `src/main.tsx`)**:
   - Combate inicia no modo clássico de cartas.
   - Clique em qualquer carta (ou no botão `LUTADORES 2D / CARTAS` do painel de controle) ativa o giro síncrono 3D de 180° das cartas.
   - Suporte a acessibilidade (`effectsReduced()` / `prefers-reduced-motion`): substitui a rotação 3D por cross-fade suave e exibe fallback seguro.
   - Segundo clique desvira as cartas instantaneamente para consulta de atributos, magias e descrições sem pausar o combate.

4. **Piloto de Assets Gerados (`scripts/generate-battle-sprites.cjs`)**:
   - Mais de 400 frames transparentes PNG gerados em conformidade com o contrato visual em `public/assets/battle/`:
     - Heróis: `guerreiro` (95 frames), `cacadora` (95 frames), `monge` (95 frames).
     - Inimigos: `sentinela-runas` (49 frames), `grumnak` (49 frames).
     - Efeitos FX: `impact-slash`, `block-spark`, `heal-glow`, `status-fire` (25 frames).

5. **Garantia de Qualidade e Testes**:
   - `src/battleSprites.test.ts` (16 novos testes unitários adicionados).
   - 100% da suíte de testes passando (191 testes em 7 arquivos).
   - Zero erros de TypeScript (`tsc -b`), ESLint limpo e build de produção aprovado (`vite build`).

## Guerreiro em alta fidelidade (folhas grandes em `Bases/`)

O `guerreiro` **não** segue o canvas 96x128 acima. Ele usa arte gerada em folhas de 1536x1024
(`public/assets/battle/sprites/heroes/guerreiro/Bases/`) e recortada por `scripts/extract_warrior_bases.py`
(`pip install pillow numpy scipy`; `python scripts/extract_warrior_bases.py --preview <pasta>` grava tiras/GIFs de conferência).

| Folha | Estado | Quadros | Layout |
|---|---|---|---|
| `Descanso.png` | `idle` | 12 | 4+4+4 |
| `Ataque.png` | `attack` | 12 | 4+4+4 |
| `Defesa.png` | `defend` e `hit` (`hit` não tem arquivos: `SPRITE_STATE_FRAME_ALIAS` aponta para `defend_*.png`) | 12 | 4+4+4 |
| `Critico.png` | `heavy` | 17 | 5+4+4+4 |
| `Ultimate.png` | `ultimate` | 17 | 5+4+4+4 |

- **Canvas único de 448x332** para todos os quadros de todos os estados, com o centro dos pés em x=196 e a sola das botas em y=301. Precisa bater com `HERO_SPRITE_CANVAS` em `src/battleSprites.ts` (um teste confere os PNGs no disco).
- **Escala normalizada**: cada folha tem um fator `scale` em `SHEETS` para o guerreiro ter o mesmo tamanho em todas as animações (Crítico/Ultimate foram geradas com 4 linhas e o personagem sai ~30% menor que nas de 3 linhas).
- **Ao gerar folhas novas**: mantenha o layout em grade com o personagem inteiro em cada célula (efeitos podem passar da célula, mas não devem ser cortados em linha reta na borda da folha), a mesma linha de chão dentro de cada linha da folha e fundo transparente ou xadrez uniforme de 12px. Se um feixe de luz for cortado pela folha, liste o quadro em `TOP_CUT_FRAMES` para ganhar degradê no topo.
- **Estados sem folha nova** (`dodge`, `potion`, `skill`, `stance_*`, `victory`, `defeat`) continuam com os quadros antigos de `bkp/` (96x128), reenquadrados no canvas novo pelo script para não mudarem de tamanho.
- **Exibição**: a carta é estreita, então o canvas não usa `object-fit: contain`. `getSpriteFrameStyle()` + `.battle-sprite-stage.framed` posicionam o quadro pelos pés (corpo com `SPRITE_STAGE_VIEW.bodyFraction` da altura da carta); efeitos largos passam da carta e são cortados pela borda dela.
- **Ritmo**: `frameWeights` em `WARRIOR_ANIMATION_OVERRIDES` reparte `durationMs` (preparação lenta, corte rápido, recuperação).
