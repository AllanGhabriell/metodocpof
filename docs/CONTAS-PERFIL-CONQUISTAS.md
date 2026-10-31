# Contas, nomes únicos, fotos e conquistas — Academia CPOF

## Ativação no Supabase

**Uma única vez:** Supabase → SQL Editor → New query → cole o conteúdo de [CFOP_PERFIS_ATUALIZACAO_COMPLETA.sql](../supabase/CFOP_PERFIS_ATUALIZACAO_COMPLETA.sql) → Run. Este é o arquivo atualizado e já inclui a correção anterior de nomes únicos, foto e moderação: não é preciso executar o SQL antigo separadamente. As migrações básicas de contas, atividade e administração precisam estar aplicadas. O site não consegue ativar as regras no banco apenas pelo commit GitHub.

O SQL preserva as contas e os dados existentes. Apelidos genéricos e duplicados anteriores ganham nomes provisórios individuais (“Cubista-…”), para a regra de unicidade poder ser criada. Usuários podem escolher um novo apelido em **Meu espaço → Perfil**, até 36 caracteres e realizar **até 3 mudanças efetivas por dia**, com **30 minutos entre mudanças**. O banco impede nomes iguais desconsiderando maiúsculas, minúsculas e espaços nas pontas. “Cubista Anônimo” é reservado a visitantes.

## Visita sem login
Visitantes são mostrados como **Cubista Anônimo**. Treinos, conquistas e tempos funcionam localmente neste navegador; dados podem desaparecer ao limpar o armazenamento e não sincronizam automaticamente para outro dispositivo. O botão **Exportar dados** disponibiliza backup JSON. A conta autenticada é necessária para salvar o apelido e a foto e sincronizar progresso entre dispositivos.

## Foto quadrada e moderação
Na página **Meu espaço → Seu nome e foto**, escolha arquivo de imagem, arraste na prévia, ajuste zoom e confirme. A foto é recortada para formato quadrado e convertida em imagem WebP de até aproximadamente 60 KB antes do envio. Cada conta pode **alterar a foto até duas vezes por dia**, com **2 horas entre mudanças**; remover a própria foto também conta como mudança. Não enviamos o arquivo original.

O **fundador** pode consultar as cotas individuais, corrigi-las para o dia atual e alterar manualmente o apelido de outra conta, com registro de auditoria. Também acessa **Administração → Usuários → [usuário]** para visualizar a foto que foi enviada e pode remover imagem, bloquear novos envios, bloquear ou liberar mudanças do apelido. A autorização também é validada na função SQL; ocultar botões não é a regra de segurança.

## Modo de treino
Na primeira visita, o treinador de F2L/OLL/PLL entra no **Sequencial**. Trocas para Competitivo, Aleatório, Adaptativo e outros modos ficam guardadas como preferência de treino no navegador. Ao retornar, a última seleção continua ativa.

## Conquistas, recordes e compartilhamento
Na página **Evolução**, novas conquistas consideram registros de F2L, OLL, PLL, Cross, sequências de dias e tempos válidos do cronômetro. XP por conquistas é calculado pelos marcos desbloqueados, sem multiplicar o bônus a cada renderização.

O usuário pode baixar ou compartilhar cartões PNG verticais (1080 × 1920) de **recorde**, **dias de treino** e **conquista**. O cartão de recorde mostra o melhor tempo e os cinco melhores resultados. No cronômetro 3×3, quando há novo recorde válido, aparecem atalhos para gerar o cartão, opcionalmente com uma foto escolhida ou tirada no celular; a foto extra só é usada na montagem local do PNG. O menu de compartilhamento depende do navegador e dos aplicativos instalados: WhatsApp, Instagram e Facebook podem aparecer, mas o site não publica automaticamente nessas redes.


## Avisos administrativos pendentes

Em **Administração → Usuários**, selecione uma conta e utilize **Enviar aviso direto**. Os recados podem ter prioridade Normal ou Importante, com limite de 8 por hora e 24 em 24 horas para o mesmo destinatário. O usuário vê o aviso na tela onde estiver — página inicial, F2L, OLL, PLL, Cross, cronômetro, importação ou Studio. A mensagem **permanece pendente e reaparece até que ele clique em “Marcar como lida”**. A confirmação é registrada no Supabase, inclusive para outros aparelhos. Os avisos são consultados periodicamente enquanto o site está aberto, sem notificação push fora do navegador.

A moderação permite banimento/desbanimento, suspensão, ajustes de XP, estatísticas, bloqueio de foto e nome, exclusão de foto, correção do apelido e reposição dos limites diários. A alteração do nome administrativo libera imediatamente o apelido anterior. O banco verifica autorização do fundador, valida o novo nome e registra a ação.

## Limites
- Os testes do GitHub verificam a integração e a sintaxe, **não** confirmam a execução do SQL no banco remoto do usuário.
- Fotos são visíveis ao proprietário e ao administrador fundador no app, sob as políticas RLS da tabela.
- Para conquistas Cross e recordes, só entram atividades realmente registradas no site.
