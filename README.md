# No Radar BSB

Agenda cultural do Distrito Federal inteiro (Plano Piloto e as 35 regiões administrativas), com antecedência, em JSON aberto. Atualizada toda segunda-feira. No Instagram: [@noradarbsb](https://www.instagram.com/noradarbsb/).

**Site com a agenda completa:** https://chicodevbr.github.io/no-radar-bsb/ (página estática em `index.html`, `estilo.css` e `agenda.js`, sem build: lê o `eventos.json` direto).

O arquivo é [`eventos.json`](eventos.json): os eventos que ainda não passaram, mais os projetos culturais com fomento público que ainda não têm data.

## De onde vem

A coleta e o tratamento são feitos pela Pheme, uma ferramenta de automação de pautas. As fontes são públicas:

- **Diário Oficial do DF:** projetos aprovados no Fundo de Apoio à Cultura (FAC), na Lei Aldir Blanc e em termos de fomento.
- **Equipamentos culturais:** CCBB, Caixa Cultural, Clube do Choro, Sesc DF, Sesi Lab e a Secretaria de Cultura do DF.

Cada evento traz o link das fontes em que foi encontrado. **Datas, preços e locais podem mudar: confira sempre na fonte.**

## Campos

| Campo | O que é |
| --- | --- |
| `id` | Identificador estável do evento no radar. |
| `titulo` | Como a fonte mais oficial escreve. |
| `categoria` | `musica`, `teatro`, `danca`, `cinema`, `exposicao`, `literatura`, `infantil`, `festival`, `cultura_popular` ou `outro`. |
| `status` | `previsto_fomento` (projeto aprovado, ainda sem data), `anunciado`, `confirmado` (data e local), `ingressos_a_venda`, `esgotado`, `adiado`, `cancelado`. |
| `inicio`, `fim` | Data e hora no fuso de Brasília (ISO 8601). `fim` só em temporadas. Projetos de fomento vêm sem data. |
| `datas_extra` | Outras sessões, quando a fonte lista. |
| `local_id`, `local` | O local da tabela do radar (ver `locais`), ou só o nome como a fonte escreve. |
| `ras` | Regiões administrativas. Projeto de fomento pode ter várias. |
| `gratuito`, `preco_min`, `preco_max` | Preço em reais, quando a fonte diz. |
| `link_ingresso` | Link de ingresso ou inscrição. |
| `classificacao_etaria`, `acessibilidade` | Como a fonte escreve. |
| `fontes` | Nome e link de cada fonte em que o evento apareceu. |
| `historico` | Cada mudança de status, com a data. |
| `primeira_deteccao`, `ultima_atualizacao` | Quando o radar viu o evento pela primeira vez e quando ele mudou por último. |

A lista `locais` traz o nome, a RA e o endereço dos locais citados. A RA de um endereço fora da tabela sai dos limites oficiais das regiões administrativas, publicados pelo IPEDF.

## Licença

Os dados deste repositório estão sob a licença [Creative Commons Atribuição 4.0 Internacional (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/deed.pt-br) (texto completo em [`LICENSE`](LICENSE)). Pode usar, copiar, adaptar e redistribuir, inclusive para fins comerciais, desde que cite a fonte. Por exemplo: "Fonte: No Radar BSB (github.com/chicodevbr/no-radar-bsb), CC BY 4.0".

A licença vale para a compilação (a agenda, os campos e a organização). Os textos, imagens e páginas das fontes de cada evento continuam com os seus donos: o radar só aponta para eles.
