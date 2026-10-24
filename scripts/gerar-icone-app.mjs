// Gera os ícones do app "Área Verde" (folha dentro de um polígono de medição).
//
// Uso: node scripts/gerar-icone-app.mjs
//
// Saídas em assets/:
// - icon.png                     ícone geral (fundo verde + desenho), 1024x1024
// - adaptive-icon.png            camada da frente do ícone adaptativo Android (fundo transparente)
// - adaptive-icon-monochrome.png versão de uma cor para ícones temáticos (Android 13+)
//
// Sem dependências: as formas são desenhadas por amostragem (anti-aliasing 4x4)
// e o PNG é codificado com o zlib do Node.

import { Buffer } from 'node:buffer';
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const TAMANHO = 1024;
const AMOSTRAS = 4;

// Cores do tema (src/presentation/theme.ts).
const FUNDO = [0x1e, 0x4d, 0x34, 255]; // primaryDark
const CLARO = [0xdc, 0xeb, 0xdd, 255]; // primarySoft
const CONTORNO = [0xa9, 0xcb, 0xb0, 255]; // primaryBorder
const BRANCO = [255, 255, 255, 255];
const TRANSPARENTE = [0, 0, 0, 0];

// O desenho usa a grade de 108 unidades do ícone adaptativo. Ele é reduzido em 10%
// em torno do centro para caber na área segura (círculo de 66 unidades de diâmetro),
// já que o Android recorta o ícone em círculo, quadrado ou outras formas.
const ESCALA = TAMANHO / 108;
const REDUCAO = 0.9;
const p = (x, y) => [(54 + (x - 54) * REDUCAO) * ESCALA, (54 + (y - 54) * REDUCAO) * ESCALA];
const u = (v) => v * REDUCAO * ESCALA;

const VERTICES = [p(30, 40), p(70, 28), p(82, 62), p(52, 82), p(26, 68)];
const CONTORNO_LARGURA = u(3);
const TRACO = u(6);
const ESPACO = u(5);
const PONTO_RAIO = u(4);

function cubica(a, b, c, d, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const m = 1 - t;
    pts.push([
      m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * d[0],
      m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * d[1],
    ]);
  }
  return pts;
}

// Folha: M40 66 C40 46 56 38 72 40 C72 58 62 70 42 68 Z
const FOLHA = [
  ...cubica(p(40, 66), p(40, 46), p(56, 38), p(72, 40), 80),
  ...cubica(p(72, 40), p(72, 58), p(62, 70), p(42, 68), 80),
];
const NERVURA = [p(42, 67), p(64, 46)];
const NERVURA_LARGURA = u(2.5);

/** Segmentos tracejados ao longo do perímetro, com o padrão contínuo entre os lados. */
function tracejado(vertices) {
  const segmentos = [];
  let restante = TRACO;
  let desenhando = true;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const comprimento = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let pos = 0;
    while (pos < comprimento) {
      const passo = Math.min(restante, comprimento - pos);
      if (desenhando) {
        const t0 = pos / comprimento;
        const t1 = (pos + passo) / comprimento;
        segmentos.push([
          [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0],
          [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1],
        ]);
      }
      pos += passo;
      restante -= passo;
      if (restante <= 1e-6) {
        desenhando = !desenhando;
        restante = desenhando ? TRACO : ESPACO;
      }
    }
  }
  return segmentos;
}
const TRACOS = tracejado(VERTICES);

function distanciaAoSegmento(x, y, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}

function dentroDoPoligono(x, y, pts) {
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/** Cor de um ponto, pintando as formas em ordem (a última vence). */
function corNoPonto(x, y, paleta) {
  let cor = paleta.fundo;
  if (TRACOS.some(([a, b]) => distanciaAoSegmento(x, y, a, b) <= CONTORNO_LARGURA / 2)) cor = paleta.contorno;
  if (VERTICES.some(([vx, vy]) => Math.hypot(x - vx, y - vy) <= PONTO_RAIO)) cor = paleta.ponto;
  if (dentroDoPoligono(x, y, FOLHA)) cor = paleta.folha;
  if (distanciaAoSegmento(x, y, NERVURA[0], NERVURA[1]) <= NERVURA_LARGURA / 2) cor = paleta.nervura;
  return cor;
}

function desenhar(paleta) {
  const pixels = Buffer.alloc(TAMANHO * TAMANHO * 4);
  for (let py = 0; py < TAMANHO; py++) {
    for (let px = 0; px < TAMANHO; px++) {
      // Média com alfa pré-multiplicado, para bordas suaves também sobre transparência.
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < AMOSTRAS; sy++) {
        for (let sx = 0; sx < AMOSTRAS; sx++) {
          const c = corNoPonto(px + (sx + 0.5) / AMOSTRAS, py + (sy + 0.5) / AMOSTRAS, paleta);
          const alfa = c[3] / 255;
          r += c[0] * alfa;
          g += c[1] * alfa;
          b += c[2] * alfa;
          a += alfa;
        }
      }
      const i = (py * TAMANHO + px) * 4;
      const n = AMOSTRAS * AMOSTRAS;
      pixels[i] = a ? Math.round(r / a) : 0;
      pixels[i + 1] = a ? Math.round(g / a) : 0;
      pixels[i + 2] = a ? Math.round(b / a) : 0;
      pixels[i + 3] = Math.round((a / n) * 255);
    }
  }
  return pixels;
}

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloco(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}

function png(pixels) {
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(TAMANHO, 0);
  cabecalho.writeUInt32BE(TAMANHO, 4);
  cabecalho[8] = 8; // bits por canal
  cabecalho[9] = 6; // RGBA
  const linhas = Buffer.alloc(TAMANHO * (TAMANHO * 4 + 1));
  for (let y = 0; y < TAMANHO; y++) {
    linhas[y * (TAMANHO * 4 + 1)] = 0; // sem filtro
    pixels.copy(linhas, y * (TAMANHO * 4 + 1) + 1, y * TAMANHO * 4, (y + 1) * TAMANHO * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', cabecalho),
    bloco('IDAT', deflateSync(linhas, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

const desenhoColorido = { contorno: CONTORNO, ponto: CLARO, folha: CLARO, nervura: FUNDO };

mkdirSync('assets', { recursive: true });
writeFileSync('assets/icon.png', png(desenhar({ fundo: FUNDO, ...desenhoColorido })));
writeFileSync('assets/adaptive-icon.png', png(desenhar({ fundo: TRANSPARENTE, ...desenhoColorido })));
// No monocromático o Android usa só a transparência: a nervura vira um recorte na folha.
writeFileSync(
  'assets/adaptive-icon-monochrome.png',
  png(desenhar({ fundo: TRANSPARENTE, contorno: BRANCO, ponto: BRANCO, folha: BRANCO, nervura: TRANSPARENTE }))
);
console.log('Ícones gerados em assets/: icon.png, adaptive-icon.png, adaptive-icon-monochrome.png');
