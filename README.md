# Kizuna Arena

**Kizuna Arena** é um **Auto-Battler 3v3 em tempo real em Pixel Art** com tema de heróis de anime, construído para rodar direto no navegador.

## Funcionalidades
- **Combate 3v3 Simultâneo em Arena 2.5D:** movimentação livre em X/Y, projéteis, golpes em área, teleporte na retaguarda, curas, escudos, *hitstop*, *screen shake* e banners de Ultimate estilo anime.
- **Customização Pré-Batalha:**
  - 6 heróis distintos (**Ren**, **Lyra**, **Bram**, **Kage**, **Sora**, **Hana**).
  - **Formação 3×3** (Retaguarda, Meio, Frente × Topo, Centro, Base).
  - **Moveset configurável** por herói (escolha 2 habilidades ativas entre 4 + 1 Ultimate entre 2).
- **Modos de Jogo:**
  - **Torre de Batalha:** 10 andares progressivos contra times de IA (com chefes nos andares 5 e 10) e progresso salvo no `localStorage`.
  - **Modo Treino (Sandbox):** configure os dois times livremente para testar sinergias e composições.
- **Controles de Espectador:** velocidade `1x / 2x`, pausar/retomar, revanche instantânea e relatório completo de dano/cura/abates ao final.

## Como rodar localmente

```bash
npm install
npm run dev
```

Para gerar o build de produção:

```bash
npm run build
```

## Substituindo / Editando Sprites em Pixel Art
Os assets ficam em `public/assets/`:
- `public/assets/arena_bg.png` (960×540)
- `public/assets/sprites/{ren,lyra,bram,kage,sora,hana}.png` (sprites com fundo transparente voltados para a direita)

Você pode substituir qualquer PNG diretamente por sprites feitos no Aseprite ou regenerar a base com `python scripts/generate_pixel_assets.py`.
