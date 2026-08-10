# Sistema visual de cartas — Bangalore's v0.2.0

A partir da v0.2.0, as cartas exibidas na Galeria são montadas dinamicamente pela interface do jogo.

## Estrutura

Cada registro pode informar:

- `imagem`: imagem original da carta (mantida como fonte e referência);
- `arte`: recorte da ilustração usado pela nova interface;
- `raridade`: `comum`, `incomum`, `raro`, `epico`, `lendario`, `mitico` ou `heroico`.

A moldura, nome, categoria, texto de efeito e atributos são renderizados pelo React/CSS. Assim, expansões futuras não precisam de uma imagem completa de carta pronta.

## Arte

Os recortes atuais foram gerados automaticamente a partir das cartas já existentes e ficam em `public/assets/art/`.

Para novos conteúdos, prefira cadastrar uma ilustração limpa diretamente em `arte`. O sistema continua aceitando a imagem original em `imagem` como fallback.

## Raridades

- Comum: bronze
- Incomum: verde
- Raro: azul
- Épico: violeta
- Lendário: dourado
- Mítico: azul-ciano
- Heróico: dourado especial para heróis

## Compatibilidade

O save local existente continua usando a mesma chave e não precisa ser apagado para atualizar da v0.1.2.
