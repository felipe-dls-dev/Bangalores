# Cenas das Crônicas no ChatGPT (as 24 que faltam)

O Codex entregou as 4 cinemáticas de ato e 6 cenas de capítulo (ART-037 e ART-038) antes de a cota acabar. Estes são os prompts das **24 cenas que faltam**, para gerar no ChatGPT web. Os caminhos de referência são deste repositório.

## Como fazer

1. **Abra uma conversa nova no ChatGPT** e mande a mensagem de abertura abaixo, anexando as 3 imagens indicadas. Fazer todas as cenas na mesma conversa ajuda a manter o estilo igual.
2. **Para cada cena:** anexe as referências indicadas (quando houver), cole o prompt e gere. Se não gostar, peça ajustes na mesma conversa ("mais escuro à esquerda", "o personagem mais parecido com a referência" etc.).
3. **Baixe a imagem e salve com o nome indicado** (ex.: `reflexo_que_mente.png`) numa pasta só para isso, por exemplo `Downloads/cenas-cronicas/`. O nome é o que liga a imagem ao capítulo; `nome (1).png` também serve.
4. **Rode o importador** na raiz do projeto:
   ```
   python scripts/import_story_art.py "C:\Users\Felipe\Downloads\cenas-cronicas"
   ```
   Ele corta para 16:9, redimensiona para 1280×720, converte para WebP, põe no lugar certo e atualiza a lista de cenas que o jogo usa. No fim, mostra quais capítulos ainda faltam. Pode rodar quantas vezes quiser, com poucas ou com todas as imagens.
5. Me avise para eu conferir e subir.

O ChatGPT gera em 1536×1024. O corte para 16:9 tira um pouco de cima e de baixo, por isso os prompts pedem margem nas bordas.

## Mensagem de abertura

Anexe: `public/assets/story/cinematics/act-01-havendown.webp`, `public/assets/story/cinematics/chapters/agua_que_brilha.webp` e `public/assets/story/cinematics/chapters/selos_de_latao.webp`.

```
I'm illustrating the chapters of a dark-fantasy RPG called Bangalore's. The attached images are finished scenes from the same series. In every image I ask for in this conversation, match their painterly digital-painting style, cinematic lighting, rich color and level of detail. Every image must be a wide landscape image with no text, letters, numbers, logos, watermarks or UI. Keep the left third of each image calmer and darker, with no faces or focal point there (game text is placed over it), put the main subject in the center-right, and keep everything important away from the edges, especially the top and bottom 10%, because I will crop to 16:9. Reply "ok" and wait for the first scene.
```

## As 24 cenas

### 1. O Reflexo que Mente · Ato 2, Floresta de Abdendriel
Anexe: `public/assets/npcs/lyriel_noite.webp` · Salve como: `reflexo_que_mente.png`
```
Scene: the Mirror Lake in an ancient enchanted forest at night, under a silver moon. The water is perfectly still and its reflection shows a BLACK SUN where the moon should be: the only wrong thing in the picture, eerie and quiet. Mestra Lyriel, a dreamy forest guardian (keep her face and outfit like the attached portrait), kneels at the shore on the right with one hand hovering over the water. Silver-blue moonlight, faint mist, glowing moss. Same style and framing rules as before; no text.
```

### 2. Neve com Gosto de Óleo · Ato 2, Serra de Kaldrum
Anexe: `public/assets/npcs/torvald_barbaneve.webp` · Salve como: `neve_com_gosto_de_oleo.png`
```
Scene: a snowy mountain pass at night. Strange foreign drilling machines of riveted brass and black iron, lit by harsh work lamps, bite into the rock, and the snow around them is stained black with oil. On a rock ledge to the right, Torvald Barbaneve, a stout dwarf mine superintendent (match the attached portrait), and a few dwarf miners with pickaxes watch the machines, furious. Cold blue night, warm lamp glow, falling snow. Same style and framing rules as before; no text.
```

### 3. O Céu Tem Opinião · Ato 2, Serra de Kaldrum
Sem referência · Salve como: `o_ceu_tem_opiniao.png`
```
Scene: the summit of a mountain peak in a lightning storm at night. An astronomer's brass telescope on a tripod and star charts held down by stones, flapping in the wind. In the sky the constellations are visibly out of place, as if something had pushed the stars, with faint glowing trails behind them. A small windswept figure of an eccentric astrologer nun, seen from behind with robes and scarves flying, stands at the telescope. Violet-blue storm light, white lightning. Same style and framing rules as before; no text.
```

### 4. Os Que Não Voltaram · Ato 2, Serra de Kaldrum
Anexe: `public/assets/npcs/torvald_barbaneve.webp` · Salve como: `os_que_nao_voltaram.png`
```
Scene: the entrance of an abandoned dwarven mine carved into a mountain: collapsed timber supports, broken rails, a mine cart on its side. A rescue team of dwarves with lanterns and ropes is heading down into the darkness, led by Torvald Barbaneve (match the attached portrait) holding up a lantern. Deep darkness inside the tunnel, warm lantern light, dust in the air, a tense and sad mood. Same style and framing rules as before; no text.
```

### 5. O Labirinto Tem Senha · Ato 2, Kholgard
Anexe: `public/assets/npcs/borin-fenrick.webp` e `public/assets/art/hd/named-bosses/boss-016.jpg` · Salve como: `o_labirinto_tem_senha.png`
```
Scene: a long stone labyrinth corridor deep inside a dwarven city, walls carved with runes, and a glowing blue rune lock on the right wall. Borin Fenrick, a grumpy dwarf rune-smith (match the first attached portrait), squints at the runes holding a hammer. At the far end of the corridor, in shadow, waits the huge silhouette of an ancient Minotaur (match the second attached image). Cold blue rune light against warm torchlight. Same style and framing rules as before; no text.
```

### 6. O Cofre dos Reis Anões · Ato 2, Kholgard
Anexe: `public/assets/npcs/borin-fenrick.webp` · Salve como: `cofre_dos_reis.png`
```
Scene: a vast dwarven royal vault with heaps of gold, stone tombs of dwarf kings with carved faces, and massive pillars. In the center-right, on a stone pedestal, lies HALF of a broken crown, cold and dark, with a faint whispering violet glow. Borin Fenrick (match the attached portrait) stands at the threshold holding his hat in his hand, respectful and wary. Gold reflections, violet glow from the crown, deep shadows. Same style and framing rules as before; no text.
```

### 7. Fogo de Segunda Mão · Ato 3, Pico de Ignaris
Anexe: `public/assets/npcs/ophira_vane.webp` · Salve como: `fogo_de_segunda_mao.png`
```
Scene: the slope of a volcano where the lava has cooled to a dull, tired red, as if its heat were being sucked away into deep cracks (show faint heat trails flowing down into the ground). Ophira Vane, an eccentric alchemist (match the attached portrait), crouches measuring the lava with a strange brass thermometer full of dials while a nervous young apprentice holds a notebook. Ash in the air, orange and grey palette. Same style and framing rules as before; no text.
```

### 8. Aço que Respira · Ato 3, Pico de Ignaris
Anexe: `public/assets/npcs/cassian_draye.webp` e `public/assets/art/hd/named-bosses/boss-030.jpg` · Salve como: `aco_que_respira.png`
```
Scene: a forge inside a volcano run by draconians (reptilian dragon-folk, match the second attached image). They hammer a glowing sword on an anvil and the blade itself exhales a breath of fire. Cassian Draye, an arrogant master of rare weapons (match the first attached portrait), watches from the right with crossed arms, pretending not to be impressed. Molten orange light, sparks, dark stone. Same style and framing rules as before; no text.
```

### 9. A Fênix que Não Queria Voltar · Ato 3, Pico de Ignaris
Anexe: `public/assets/art/hd/named-bosses/boss-031.jpg` · Salve como: `fenix_presa.png`
```
Scene: a crater of dead volcanic rock under a dim, dying sun. The Phoenix of the Dead Sun (match the attached image) is rising again from its own ashes, but each rebirth is darker: its flames are smoky and dim, and chains made of fire bind it to its endless cycle. A small dramatic figure of a master armorer in a heavy cape, seen from behind, reaches toward the flames from the right. Embers, ash, orange and black. Same style and framing rules as before; no text.
```

### 10. O Tesouro de Ignaroth · Ato 3, Pico de Ignaris
Anexe: `public/assets/art/hd/named-bosses/boss-011.jpg` · Salve como: `tesouro_de_ignaroth.png`
```
Scene: inside a colossal dragon's nest in a volcanic mountain. Ignaroth, an ancient red dragon (match the attached image), lies coiled around a hoard of gold, crowns and treasures from ten kingdoms. His great head is lowered toward the viewer: calm, ancient and wise, eyes glowing. Molten light from cracks in the rock, gold reflections, smoke. Same style and framing rules as before; no text.
```

### 11. Os Mortos Não Pagam Aluguel · Ato 3, Terras de Morvath
Anexe: `public/assets/npcs/gideon_mascarado.webp` · Salve como: `mortos_nao_pagam_aluguel.png`
```
Scene: a foggy village street in a cursed land at night, where translucent ghosts go about their daily lives: a ghost baker, ghost children playing, a ghost hanging laundry. In the foreground right, Gideon Mascarado, a sly masked relic merchant (match the attached portrait), presents three strange relics on a velvet cloth with a showman's smile. Cold violet-grey fog, pale ghost light, a single warm lantern. Same style and framing rules as before; no text.
```

### 12. O Prefeito Sem Face · Ato 3, Terras de Morvath
Anexe: `public/assets/art/hd/named-bosses/boss-032.jpg` · Salve como: `prefeito_sem_face.png`
```
Scene: a grim village square at dusk where the villagers have smooth, blank faces with no features. On the steps of the town hall stands the Faceless Mayor (match the attached image). In the foreground right, a somber gravedigger priest, seen from behind or in shadow, writes names by candlelight in a big, nearly empty book. Cold grey-violet light, fog, candles. Same style and framing rules as before; no text.
```

### 13. Os Selos Rompidos · Ato 3, Terras de Morvath
Sem referência · Salve como: `selos_rompidos.png`
```
Scene: ancient catacombs deep underground. Huge stone seals carved with holy symbols have been cracked open by drill marks: clean, round mechanical holes that don't belong in this ancient place. Pale skeletal hands reach through the gaps. A circle of vigil candles has been placed on the floor around the broken seals. Deep shadows, warm candlelight, cold violet glow from the cracks. Same style and framing rules as before; no text.
```

### 14. Quem Paga os Necromantes · Ato 3, Terras de Morvath
Anexe: `public/assets/npcs/gideon_mascarado.webp` · Salve como: `quem_paga_os_necromantes.png`
```
Scene: the library at the top of a necromancers' tower: shelves of dark tomes, bones and candles, and a desk covered in account ledgers and piles of brass coins stamped with a foreign seal. Through a tall window, a grey sea stretches to the horizon. Gideon Mascarado (match the attached portrait) reads one of the ledgers with a mischievous smile. Green-violet necromantic light, candlelight. Same style and framing rules as before; no text.
```

### 15. O Porteiro do Fim do Mundo · Ato 4, Reino do Sol Negro
Anexe: `public/assets/npcs/oraculo_danika.webp` e `public/assets/art/hd/named-bosses/boss-017.jpg` · Salve como: `porteiro_do_fim.png`
```
Scene: colossal black gates under a black sun in a violet void sky, the edge of the world. Asterion, the gigantic guardian of the Black Sun (match the second attached image), stands before the gates. In the foreground right, the Oracle Danika (match the first attached portrait) stands calm and unmoved next to a small cloaked traveler seen from behind. Violet void light, the black sun's glowing corona, drifting dust. Same style and framing rules as before; no text.
```

### 16. O Que Vaelora Viu · Ato 4, Reino do Sol Negro
Anexe: `public/assets/art/hd/named-bosses/boss-018.jpg` · Salve como: `o_que_vaelora_viu.png`
```
Scene: the top of a ruined tower hung with torn veils. Vaelora, Lady of the Veil (match the attached image), stands before a great tear in the sky itself. Through the tear, far away across a sea, thick brass cables descend from the clouds into the land. Violet and cyan light, flowing veils and fabric in the wind. Same style and framing rules as before; no text.
```

### 17. O Cronista do Fim · Ato 4, Reino do Sol Negro
Anexe: `public/assets/art/hd/named-bosses/boss-039.jpg` · Salve como: `cronista_do_fim.png`
```
Scene: the Archive of Lost Ages: endless towering bookshelves vanishing into darkness, dust floating in the air. The Chronicler of the End (match the attached image) holds out an open book of possible endings toward the viewer, while some loose pages around him burn by themselves and drift like embers. Candle gold and violet shadows. Same style and framing rules as before; no text.
```

### 18. Carga Não Declarada · Ato 5, Cumes de Frostgard
Sem referência · Salve como: `carga_nao_declarada.png`
```
Scene: a steampunk drilling convoy crossing a frozen glacier in a blizzard: huge treaded machines with brass pipes and searchlights. One sealed cargo container glows green from within, and through a porthole you can glimpse something from a forest trapped inside: leaves, roots and a faint spirit face. A stern ship captain in a fur-lined naval coat, small and seen from behind, stands in front of it. Icy blue, amber lamps, green glow. Same style and framing rules as before; no text.
```

### 19. Flores de Cobre · Ato 5, Bosque de Engrenverde
Anexe: `public/assets/npcs/garrick_laton.webp` · Salve como: `flores_de_cobre.png`
```
Scene: a steam-powered greenhouse full of brass pipes, glass panels and warm fog. Copper roses whose stems turn tiny gears grow everywhere, and one of them is biting a leather glove. Garrick Engrenafolha, an enthusiastic botanist-engineer (match the attached portrait), laughs delighted. A glowing pipe brings bright green sap from far away into the plants. Warm greenhouse light, copper and green. Same style and framing rules as before; no text.
```

### 20. Greve nos Trilhos · Ato 5, Campos de Trilhouro
Anexe: `public/assets/npcs/silas_sterling.webp` · Salve como: `greve_nos_trilhos.png`
```
Scene: a steampunk railway yard among golden grain fields, with trains stopped on the tracks and steam rising. Workers hold a picket line with banners that have NO readable text. A passionate young female labor organizer stands on a crate with her fist raised, seen from behind or in profile. In front of her, a nervous railway inspector (match the attached portrait) clutches a clipboard. Late-afternoon light, dust and steam. Same style and framing rules as before; no text.
```

### 21. A Caldeira no Vermelho · Ato 6, Caldeira de Vulcannis
Sem referência · Salve como: `caldeira_no_vermelho.png`
```
Scene: inside a colossal steampunk foundry. An enormous pressure gauge with its needle far past the red zone dominates the scene, with no numbers or letters on its dial; steam jets burst from valves and molten metal glows. A cheerful, stout engineer with a big mustache and a huge wrench, small in the frame, grins in front of it as if it were a party. Red and orange light, steam, sparks. Same style and framing rules as before; no text.
```

### 22. Os Que Foram Desligados · Ato 6, Charco de Ferrujal
Sem referência · Salve como: `os_que_foram_desligados.png`
```
Scene: a graveyard of switched-off automatons in a rusty toxic marsh: rows of robots sitting or lying half-sunk in poisonous green water, covered in rust and moss. One of them has its eyes lit and is sitting up, looking straight at the viewer with curiosity. Sickly green water glow, grey sky, rust orange. Same style and framing rules as before; no text.
```

### 23. O Baile do Magnata · Ato 7, Cidade de Coroferro
Sem referência · Salve como: `baile_do_magnata.png`
```
Scene: a lavish ballroom in a steampunk city: crystal chandeliers, clockwork decorations, aristocrats in rich clothes dancing. A pompous magnate raises a toast in the center-right. In a corner, a nervous woman architect in simple clothes secretly passes a folded note to a hand reaching out from the shadows. Warm golden light, brass and velvet. Same style and framing rules as before; no text.
```

### 24. A Consciência no Reator · Ato 7, Núcleo de Aetherium
Anexe: `public/assets/npcs/diretor_vane.webp` · Salve como: `consciencia_no_reator.png`
```
Scene: the heart of a colossal ether reactor: a vast violet-cyan core pulsing inside a ring of giant pistons and brass rings. It looks alive, like an imprisoned mind. Corvin Vane, the grave custodian of the reactor (match the attached portrait), stands before it, and the core's light bends toward him as if it were listening. Violet and cyan light, brass, mist. Same style and framing rules as before; no text.
```
