# Changelog

## Não lançado — sessão de correções (23–24/08/2026)
Este changelog não era atualizado desde a v0.4.0; a versão instalada (`package.json`) já está em
0.6.8, então há um período anterior não documentado aqui. Esta seção cobre apenas os 11 commits da
sessão de investigação/correção mais recente, do mais antigo ao mais novo.

**Masmorras**
- Corrigido crédito de vitória/chefe na sub-região errada em algumas rotas de masmorra.
- Chefe de masmorra (a cada 5º andar) agora só conta como o chefe real da sub-região se a
  exploração normal dela já tiver sido cumprida — antes ficava liberado sem esse requisito.
- Bestiário deixou de fragmentar o mesmo monstro em várias entradas por causa de variantes
  (Veterano/Elite/Campeão) ou prefixos de masmorra/vingança no nome.
- Adicionados os materiais de região que faltavam para as sub-regiões de Steelmere.

**Talentos e especializações**
- Corrigidas quatro especializações que não tinham efeito nenhum no jogo (bônus mortos).
- Bônus de ouro/Forja de certas especializações não eram somados em lugar nenhum; agora entram
  no cálculo de recompensa e na chance de sucesso da Forja.
- Cooperativo não aplicava bônus de especialização nenhum; agora replica os mesmos bônus do modo
  solo.

**Equipamentos e Forja**
- Corrigido bug em que o bônus de atributo/efeito de uma receita podia ser aplicado na cópia
  errada de um item duplicado (bolsa em vez do equipado).
- Comparação de equipamentos (popup de troca) e os cards de item na tela de Equipamentos
  ignoravam bônus de Forja/pedra e aprimoramento — agora mostram o total real, com o detalhe de
  quanto vem de cada fonte (normal / forja / pedra).
- Bloco de materiais da Forja agora lista os três tipos (região, desmontagem, pedras) com a
  quantidade que o jogador tem e onde conseguir cada um.
- Aprimoramento (+1/+2/+3) deixou de ser 100% garantido: agora custa materiais além de ouro, tem
  chance de sucesso decrescente por nível-alvo, e pode regredir o nível em caso de falha nos
  níveis +2/+3.
- Aprimoramento passou a conceder XP de Forja como qualquer outra tentativa (antes não concedia
  nenhum) e a avisar o resultado — antes, sucesso/falha/regressão aconteciam em silêncio total,
  sem nenhum aviso na tela.
- Resultado da forja e do aprimoramento agora aparece numa janela modal centralizada (visível de
  qualquer ponto da rolagem da página), em vez de um banner que piscava no topo da tela e podia
  passar despercebido.
- Serviço de sintonia elemental agora também oferece resistência elemental para armadura e
  acessórios equipados, não só troca do elemento de dano da arma (a função já suportava isso, mas
  não tinha nenhum botão na interface).

**Combate**
- Ataque das feras invocadas pelo Conjurador não fazia o card do inimigo tremer nem mostrava o
  número de dano flutuante (só o ícone de arma da fera aparecia); agora cada fera ataca em sua
  própria "vez", com a mesma animação de dano usada pelo resto do combate. Corrigido também no
  cooperativo, que não tinha nem o ícone.
- Layout de combate no celular (≤760px) mostrava os botões de ação antes do card do inimigo,
  obrigando a decidir a ação sem ter visto a vida/intenção do inimigo na tela.

**Ficha do personagem**
- Pontos de atributo disponíveis para distribuir ganharam um aviso em destaque bem ao lado dos
  botões "+" no painel de Atributos (antes só existia uma indicação discreta, sem destaque, no
  card de retrato).

## v0.4.0 — Exploração de Havendown
- Regiões do mapa agora abrem uma tela de sub-regiões antes do combate.
- Adicionados Labirinto de Kholgard, Templo do Minotauro, Ninho do Dragão Vermelho, Caverna de Gelo e Mina dos Anões Caídos.
- Cada sub-região possui nível recomendado, progresso próprio, desafios, tema de loot, inimigos e chefe exclusivo.
- Adicionadas variantes de inimigos: Comum, Veterano, Elite e Campeão.
- A dificuldade agora acompanha a sub-região e parcialmente o nível do herói, preservando áreas iniciais mais fáceis e criando desafios progressivos.
- Chefes são liberados após completar os encontros necessários em cada sub-região.
- Progresso, chefes derrotados e exploração são salvos automaticamente e são compatíveis com saves anteriores.
- Fuga e tela de espólios retornam à sub-região atual.


## v0.3.4
- Área útil do Registro de combate ampliada de forma significativa.
- A linha superior da grade de combate agora recebe aproximadamente dois terços da altura disponível em notebooks e até 70% em telas mais altas.
- Painel de Ações permanece imediatamente abaixo do registro, com altura suficiente para os quatro comandos principais.
- Linha de iniciativa foi compactada para liberar mais espaço para as mensagens do combate.
- Rolagem continua disponível apenas quando o histórico realmente ultrapassa a nova área visível; a página inteira permanece sem rolagem durante o combate em desktop.
- Mantidos consumíveis na coluna direita, efeitos abaixo do herói, auto-save e compatibilidade com saves da v0.3.3.

## v0.3.3
- Tela de combate reorganizada conforme o último modelo aprovado.
- Registro de combate subiu para o topo da coluna central e agora ocupa a maior parte da altura útil.
- Medalhão de turno e iniciativa foram incorporados ao painel de registro, eliminando o espaço central desperdiçado pelo antigo bloco VS.
- Painel de Ações foi ampliado e permanece imediatamente abaixo do registro.
- Coluna direita mantém inimigo no topo e lista vertical de consumíveis abaixo.
- Consumíveis usam cartões horizontais maiores com imagem, quantidade, nome, descrição e botão USAR.
- Efeitos ativos permanecem abaixo do herói.
- Mantida a dica discreta no rodapé, o auto-save e a compatibilidade do save existente.
- Ajustes responsivos específicos para notebooks, tablets e telas menores.

## v0.3.2
- Tela de combate atualizada para a disposição aprovada: herói à esquerda, combate no centro e inimigo/consumíveis à direita.
- Painel de Ações movido para baixo do Registro de combate.
- Painel de Itens consumíveis movido para a coluna direita e ampliado.
- Consumíveis agora usam cartões horizontais com imagem, quantidade, nome, efeito e botão USAR sem cortar informações.
- Campo de dica lateral removido para liberar espaço útil.
- Registro de combate ganhou mais altura e rolagem interna.
- Efeitos ativos permanecem abaixo do herói e ocupam o espaço vertical disponível.
- Mantida a dica discreta no rodapé e a compatibilidade com o save da v0.3.1.
- Ajustes responsivos específicos para notebooks e resoluções menores.

## v0.3.1
- Tela de combate reorganizada conforme o mockup aprovado.
- Consumíveis agora têm uma faixa própria e permanecem totalmente visíveis.
- Cada consumível mostra arte, quantidade, nome, efeito e botão USAR.
- Painéis de Efeitos, Registro e Ações foram redistribuídos para melhor leitura.
- Layout adaptativo para notebooks, Full HD e telas menores.
- Nenhuma mudança nas regras de save ou progressão.

# Bangalore's — Changelog

## v0.3.0

- Novo tema visual premium aplicado às telas principais, baseado no mockup aprovado.
- Molduras em bronze escurecido, detalhes dourados, botões ornamentados e tipografia hierárquica.
- Tela de combate reconstruída para caber em uma única tela em notebooks comuns.
- Cartões de herói e inimigo com arte, habilidade, ATQ, DEF, VIDA e barra de vida.
- Medalhão de turno, moeda de iniciativa e painel VS central.
- Novo painel de efeitos ativos durante a batalha.
- Registro de combate compacto com rolagem interna, sem aumentar a página.
- Área de ações no mesmo padrão visual do mockup aprovado.
- Nova faixa de consumíveis durante o combate, com arte, quantidade e descrição.
- Uso de consumível durante combate agora consome o turno e inicia a resposta do inimigo.
- Mochila, equipamentos, ficha, mapa, loja e galeria receberam espaçamento e dimensionamento responsivos.
- Layouts principais usam a altura disponível do navegador e evitam rolagem da página em desktop/notebook.
- Mantida compatibilidade com o save local da versão anterior.
