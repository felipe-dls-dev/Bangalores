# Atributos do Campeão, Energia, Armadura e Carta de Campeão (v0.9.x)

Documento de referência do novo modelo de atributos. Todos os números moram em um só lugar,
[`src/data/heroStatProfiles.ts`](../src/data/heroStatProfiles.ts); as fórmulas puras estão em
[`src/store/heroStats.ts`](../src/store/heroStats.ts). Trocar um coeficiente lá muda o jogo inteiro (solo, coop, ficha,
carta e seleção de heróis), porque tudo lê as mesmas funções.

## 1. Modelo

| Atributo | O que faz |
| --- | --- |
| **Força** | Alimenta os ataques físicos. |
| **Magia** | Alimenta ataques mágicos e a potência de curas, escudos, reforços e invocações. |
| **Vigor** | Vida Máxima **e** resistência a elementos e a efeitos negativos (não é só "Vida renomeada"). |
| **Destreza** | Esquiva derivada (com teto e retorno decrescente) e iniciativa. |

Derivados: **Vida Máxima** (vem de Vigor e bônus; a Vida atual é estado de combate), **Energia** (recurso das habilidades
ativas) e **Armadura** (só de equipamentos, gemas e efeitos de equipamento).

### Fórmulas

```
Vida Máxima      = vidaBase da classe + Vigor × 2 + bônus planos (itens, talentos, Vida permanente de poções)
Poder do ataque  = Força (físico) | Magia (mágico) | max(Força, Magia) (híbrido: só o Monge)
Mitigação física = 2 × A / (1 + A / 40)      A = Armadura total; teto 80; nunca invulnerável
Esquiva          = min(0,45, 0,35 × D / (D + 30) + passiva da classe + esquiva forjada)
Resist. elemento = 0,5 × V / (V + 40)  (+ resistência de equipamento, máx. 75%)
Resist. efeitos  = 0,5 × V / (V + 40)
Iniciativa       = min(0,20, 0,004 × Destreza)  (chance extra de agir primeiro no solo)
Potência da hab. = 1 + 0,04 × (atributo de escala − valor inicial da classe), entre 1 e 2
Poder (carta)    = round(10 × (Vida/2 + poder básico + 0,5 × poder secundário + mitigação + 0,25 × Destreza + 0,25 × Energia))
```

Cada ponto de atributo por nível continua sendo 1 (`pontosPorNivel`). O valor da classe cresce sozinho por nível
(`crescimento`, fracionário, usa o piso).

### Energia

A Energia é do herói (não zera a cada combate), começa **cheia** numa campanha nova e **não regenera sozinha**. Os números moram
em `ATTRIBUTE_RULES.energia` (`heroStatProfiles.ts`):

| Fonte | Energia |
| --- | --- |
| Ataque normal (`Ataque` e `Ataque direcionado`) | **+1** |
| Ataque normal que acerta **crítico** (rolagem 6) | **+2** |
| Descansar na fogueira (a cada tick de 6 s, junto com +1 de vida) | **+2** |
| Passiva do Monge (golpe forte, rolagem 5, 25%) | +1 |
| Golpe Supremo do Monge | +2 |

| Gasto | Energia |
| --- | --- |
| **Fervor de Combate** (o ataque crítico garantido; no lugar dos 3 críticos de antes) | **3** |
| Habilidade do herói (`custoEnergia` por classe, tabela abaixo) | 3 a 5 |

- O Fervor e as habilidades **não devolvem** Energia (só o ataque normal devolve), para não haver ciclo infinito.
- Sem Energia suficiente o botão fica bloqueado, o auto-combate não tenta e nada é gasto. O Conjurador paga por fera invocada.
- O auto-combate **guarda** a Energia para a habilidade enquanto ela ainda vale a pena naquele turno; só usa o Fervor quando a
  habilidade não é opção (em recarga, sem alvo útil) ou quando sobra Energia para as duas coisas.
- A barra do **Golpe Supremo** continua separada e não gasta Energia.
- No coop cada jogador tem a própria Energia: o ganho é aplicado no cliente de quem atacou depois que a jogada é publicada.
- A Energia máxima é a da classe (10 a 12, cresce um pouco com o nível): dá para juntar duas habilidades.

### Armadura

Vem **só** de equipamentos, gemas (Safira da Guarda) e efeitos de equipamento (aprimoramento da Forja, conjuntos). Talentos,
especializações, coleção e história não dão Armadura: o que era "Defesa" neles virou **Vigor**. Buffs e postura (%) agem sobre
a Armadura antes da curva. O escudo é outro recurso e continua separado.

## 2. As nove classes (nível 1, sem pontos)

| Classe | Força | Magia | Vigor | Destreza | Vida | Energia | Ataque básico | Habilidade (custo) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guerreiro | 3 | 1 | 6 | 3 | 18 | 10 | Físico | Ímpeto Marcial (5) |
| Guardião | 2 | 1 | 7 | 2 | 20 | 10 | Físico | Provocar (5) |
| Caçadora (Ladino) | 5 | 1 | 3 | 5 | 20 | 10 | Físico | Ataque Duplo (5) |
| Arcanista (Mago) | 1 | 6 | 3 | 3 | 18 | 12 | Mágico | Ascensão Arcana (5) |
| Druida | 1 | 4 | 4 | 3 | 20 | 12 | Mágico | Brisa Revigorante (4) |
| Caçador | 5 | 1 | 4 | 5 | 18 | 10 | Físico | Marca do Predador (4) |
| Monge | 4 | 3 | 5 | 4 | 18 | 10 | Híbrido | Golpe Flamejante (5) |
| Sacerdotisa | 1 | 3 | 5 | 2 | 20 | 12 | Mágico | Bênção da Vida (5) |
| Conjurador | 1 | 4 | 3 | 3 | 22 | 12 | Mágico | Conjurar Fera Espectral (3 por fera) |

A tabela mostra a Vida da classe sem itens; com o kit inicial a Vida é a de antes (ver abaixo).

## 3. Decisões de balanceamento

1. **Ataque e Vida iniciais idênticos aos de antes.** Força/Magia principal = antigo Ataque da classe; `vidaBase` = Vida antiga −
   Vigor × 2. Verificado por teste para as nove classes (`attributeModel.test.ts`).
2. **Armadura no lugar da Defesa da classe.** A Defesa que a classe dava sem item deixou de existir (Armadura é só de itens).
   A curva `2·A/(1+A/40)` fica perto de 1:1 nas faixas de Armadura que os itens dão do meio do jogo (≈ 10–30) e achata depois,
   sem passar de 80. Para o começo do jogo não ficar mais duro, a peça inicial de cada classe dá 1 ou 2 pontos de Armadura extras
   só para aquela classe (`STARTER_ARMOR_BONUS` em `game.ts`, aplicado depois do balanceamento por raridade: não muda nível, preço
   nem ranking). A mitigação do kit inicial fica a **no máximo 1 ponto** do valor antigo nas nove classes (teste).
   Uma primeira calibração com `3·A/(1+A/24)` deixava a mitigação do nível 10 ao 40 até 60% acima da antiga (simulação:
   −34% de mortes); a curva atual corrige isso.
3. **Ponto de Vigor rende mais que o de Vida antigo** (+2 de Vida em vez de +1, mais resistência). É intencional: os pontos
   de Vida e de Defesa antigos agora vão para o mesmo atributo.
4. **Destreza é nova e pequena no começo** (esquiva ≈ 2–6%); só a Caçadora e o Caçador têm a passiva de 20% (teto total 45%).
5. **Habilidades** escalam por atributo (potência 1 = valor inicial; ver fórmulas). Classificação:
   física (Guerreiro, Caçadora, Caçador), mágica (Arcanista, Druida, Sacerdotisa), híbrida (Monge, Conjurador), utilidade
   (Guardião).
6. **Energia substitui o limite de "1 uso por combate"** da habilidade. Ela agora é conquistada (atacar, crítico, descansar) em vez de
   regenerar sozinha: com +1 por ataque (+2 no crítico), um combate de 3 a 4 ataques rende uns 4 a 5 de Energia, o custo de uma
   habilidade, então o ritmo fica perto de "uma habilidade por combate" e o Fervor (3) é o que se paga com o que sobrar.
   A recarga de 3 turnos da habilidade continua valendo no solo.
   Simulação (Havendown, 9 classes × 3 campanhas; média das classes): mortes 63,9 (código antigo) → 44,6 (0.9.0) → 46,0 (Energia por
   ganho, sem usar Fervor) → 43,6 (usando Fervor); chefes derrotados de 40: 33,7 → 35,0 → 35,0 → 35,7. A economia nova não muda o
   equilíbrio já medido; o Fervor melhora um pouco (o simulador só o usa depois da habilidade). O dano médio por golpe cai (76 → 69)
   porque a habilidade é usada menos vezes.

## 4. Migração de saves (`balanceVersion: 3`)

`normalizeAttributes` (em `game.ts`) roda ao carregar o save e ao abrir/continuar uma campanha guardada.

| Save antigo | Vira |
| --- | --- |
| `allocatedAttr.ataque` / `attr.ataque` | atributo ofensivo da classe (Força; Magia nas classes mágicas; Força no Monge) |
| `allocatedAttr.vida` + `allocatedAttr.defesa` | Vigor |
| Vida permanente de poções (`attr.vida` acima do gasto) | `permanentLife` (Vida exata preservada) |
| bônus permanentes de `attr.defesa` acima do gasto | Vigor |
| Vida atual | mesma **proporção** da Vida Máxima (cheia continua cheia; zero continua zero) |

- v1 (sem `balanceVersion`) primeiro reconstrói os pontos gastos pela regra antiga, depois migra.
- Todo o resto do save (ouro, inventário, equipamentos, talentos, progresso, campanhas) é preservado.
- Saves incompletos ou corrompidos (texto, `NaN`, negativos, campos ausentes) viram zeros: nunca `NaN`.
- Uma campanha v2 guardada dentro de `campaigns` é migrada ao ser carregada.
- Energia ausente no save vira **cheia** (não zerada).
- `scripts/detect-anomalies.mjs` entende as duas formas (soma todos os pontos alocados).

## 5. Carta de Campeão

`ChampionCard` (`src/ui/ChampionCard.tsx`) é dirigida por dados (`ChampionCardData`, `championCardData.ts`). Os dados vêm de
`championCardSources.ts` (herói ativo, kit inicial de cada classe, estado qualquer) e sempre passam por `championStats`,
a mesma função do combate. Usada na Ficha, na seleção Moderna (com `hideDetailsButton`), na Coleção (herói ativo) e
aceita qualquer dado (prévia). Não há cristais, losangos nem escalas 1–5; a moldura muda com a **raridade**, não com os valores.
Números de quatro dígitos são formatados, nomes longos são cortados com dica do texto inteiro, bônus têm sinal explícito e
seta (não dependem de cor), ícones são decorativos e o texto completo da habilidade abre em diálogo acessível.

Seleção de herói:

- **Moderna:** carta + função, dificuldade, "Boa para começar", ataque básico, habilidade e custo; texto longo, fórmulas e
  passivo/ativo em "Ver detalhes". Navegação por teclado (setas/Home/End), foco, `aria-live` e carrossel no celular mantidos.
- **Clássica:** cada classe mostra função, dificuldade, os 4 números, Vida/Energia/Armadura do kit, assinatura com até 3 etiquetas
  e "Ver detalhes"; o parágrafo longo saiu.

## 6. Coop

O coop usa as mesmas contas do solo. Cada membro publica `armor`, `dodgeChance`, `elementalResist`, `effectResist`, `vigor`,
`energyMax` (e mantém `defense` por compatibilidade). `coopMemberDefenseBase` aplica os percentuais sobre a **Armadura** antes da
curva; sem `armor` publicado (cliente antigo), cai na defesa já mitigada. A potência da habilidade e a Energia são as do herói.

## 7. Testes

`heroStats.test.ts` (fórmulas, teto de esquiva, retorno decrescente da Armadura, ganho/gasto de Energia, nove classes),
`attributeMigration.test.ts` (v1/v2→v3 e saves corrompidos), `attributeModel.test.ts` (equipamento, forja, gemas, talentos,
especializações, Energia no combate, paridade do início do jogo), `coopAttributes.test.ts`, `championCard.test.tsx`,
`heroSelect.test.tsx`, além dos ajustes nos testes existentes.

Simulação de balanceamento: `npm run test:balance` e `npm run test:balance:coop`. Para uma rodada reduzida use
`BALANCE_RUNS`, `BALANCE_HEROES`, `BALANCE_STEELMERE=0`, `BALANCE_OUT`, `BALANCE_PROGRESS` (progresso por sub-região) e, no coop,
`BALANCE_POOL_FILE` (reaproveita os marcos de um resultado solo).

## 8. Cores do tema (todo objeto acompanha a região)

Cada região tem um tema (`data-region-theme`). Antes só botões, painéis e alguns tokens (`--gold`, `--line`, `--panel`...) mudavam;
o resto do CSS tinha ouro/marrom escrito à mão. Agora [`scripts/postcss-theme-colors.mjs`](../scripts/postcss-theme-colors.mjs),
ligado no `vite.config.ts`, reescreve **toda cor quente** (matiz de ouro/marrom) em cor relativa que gira de matiz e ajusta o croma
com `--theme-hue` e `--theme-chroma`, definidos por região no fim de `styles.css`. No tema padrão a cor é a mesma de antes (comparação
de pixels: 0 diferença nas telas testadas); nos outros temas as bordas, fundos escuros, textos suaves, brilhos e a carta acompanham a região.

- O atributo `data-region-theme` também vai para o `<html>`: diálogos em portal (fora do `.app-shell`) seguem o tema.
- `--text` e `--muted` também mudam com a região (antes ficavam sempre no bege padrão).
- **Não giram** (significado do jogo): raridade, status, elemento, dano, perigo e terreno do mapa, além de cores que não são ouro/marrom
  (vermelho de vida, verde de cura). Para excluir um caso: comentário `/* theme:skip */` antes da regra ou da declaração.
- Código novo com cores quentes escritas à mão já sai temado; para cores frias use as variáveis (`var(--blue)`, `var(--red)`, `var(--green)`).
- O navegador sem cor relativa (Chrome < 119, Safari < 16.4, Firefox < 128) usa a cor original, que fica na declaração anterior.
