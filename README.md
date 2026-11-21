# Bolha no navegador

Site conceitual independente. A seção **Experimente** contém o desktop “Meu desktop está mais feliz :)”, com a arte e as interações da Bolha.

## Abrir

Abra `index.html` no navegador. O arquivo `bolha-preview.html` que acompanha o ZIP reúne a página, os scripts e a arte da demonstração num único HTML. O playground funciona sem rede.

## Brincar

- Clique ou toque na Bolha para fazer carinho. Passe o cursor de um lado a outro sobre ela para repetir o gesto.
- Segure para mover a Bolha. Ao soltar, ela cai e quica. Solte enquanto estiver movendo para arremessar. Segurar por mais tempo aumenta a irritação. A roda do mouse serve para girar.
- Mude as expressões nos controles ou abra o menu com o botão direito na Bolha. A reação de sono inclui as marcas “zzz”.
- Escolha a **Bolinha** ou o **Amendoim**. Passe o cursor perto do brinquedo para empurrar ou lançar para cima. Também é possível segurar e arremessar.
- No **Pingue-pongue**, use ponteiro, toque ou setas para mover a raquete. A partida vai até cinco pontos. Use **Esc** para sair.
- Em **Embaixadinhas**, a Bolha sorteia um total entre 1 e 100 e conta os toques. O **Notebook** mostra a animação de digitação.
- Use **Chamar ao cursor**, ou toque duas vezes no Alt esquerdo com o desktop da demo focado. Mova o cursor dentro do desktop e clique para soltá-lo. **Pausar** congela a cena.

A física, as atividades e as reações desta demonstração rodam em JavaScript dentro da página. O aprendizado do aplicativo, o Spotify, o painel de baterias do Windows e os atalhos globais ficam nas versões instaláveis.

## Arte e código

A esfera, a bolinha, o amendoim e os quadros do notebook foram exportados do renderer Qt da [Bolha 0.5.9.0](https://github.com/kuky13/bolha/tree/v0.5.9.0). A geometria do rosto deriva de `bolha/character.py` e `bolha/facial_motion.py`, com desenho em Canvas para animar o olhar, a boca e as orelhas.

A Bolha é de André Ribeiro Lima (KukySolutions) e foi desenvolvida a partir do [Pestinha](https://github.com/mille-okws/pestinha), de [@mille-okws](https://github.com/mille-okws) e colaboradores. Recursos derivados da Bolha seguem a GPL-3.0-or-later. Consulte os [créditos](https://github.com/kuky13/bolha/blob/v0.5.9.0/NOTICE.md) e a [licença](https://github.com/kuky13/bolha/blob/v0.5.9.0/LICENSE).

### Gerar novamente

Com Python e PySide6 no ambiente e um checkout da Bolha 0.5.9.0, execute `python tools/export-native-art.py CAMINHO_DA_BOLHA`. Em seguida, use `python tools/make-preview.py ../bolha-preview.html` para criar o HTML único.
