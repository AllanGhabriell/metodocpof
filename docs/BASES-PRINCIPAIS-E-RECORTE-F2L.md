# Bibliotecas principais por etapa + recortes F2L

Atualizações:
- O administrador fundador pode escolher **separadamente** a biblioteca principal de F2L, OLL e PLL em **Meu espaço → Administração → Bases principais**.
- F2L e PLL oferecem **Original**, desde que não tenha sido excluída. OLL oferece somente bibliotecas criadas e publicadas pelo administrador.
- O padrão é público e persistido no Supabase. Os alunos iniciam com essa escolha; durante a sessão podem selecionar outra biblioteca publicada.
- A base original não fica automaticamente pública. Só a etapa explicitamente configurada para Original pode ser lida pelos visitantes. As outras continuam restritas.
- O importador de PDF aplica recorte mais justo aos diagramas tridimensionais F2L; OLL/PLL conservam suas medidas anteriores.
- Cada recorte importado pode ser reposicionado usando ↑ ↓ ← → e redimensionado com + / −, mantendo saída WebP quadrada de 288 × 288 px.
- Um recorte editado volta para **Pendente** e precisa ser aprovado e publicado novamente.

## Ativação no banco

Execute no Supabase → SQL Editor o arquivo único:
`supabase/CFOP_BASES_PRINCIPAIS_COPIAR_COLAR.sql`

O arquivo instala a base privada (se faltar) e a configuração por etapa. Não requer reexecução das migrações antigas. Ele pressupõe que `000007_libraries.sql` já tenha sido aplicado.

## Como escolher o padrão

1. Entre com `coelhodatoca124@gmail.com` em `studio.html?page=admin-defaults`.
2. Em F2L, selecione **Original** ou biblioteca pública.
3. Em OLL, selecione uma biblioteca OLL publicada (não existe Original de OLL).
4. Em PLL, selecione **Original** ou biblioteca pública.
5. Clique **Salvar padrão** para cada uma das etapas.

Nenhuma biblioteca é publicada implicitamente; os casos de uma biblioteca personalizada devem estar aprovados antes de selecioná-la. As escolhas dos alunos podem ser alteradas durante a sessão, sem mudar o padrão global.

## Como corrigir as imagens já importadas

Abra `importer.html`, escolha a mesma biblioteca e importe novamente o PDF F2L. O novo enquadramento só se aplica a um **novo processamento**. Revise os recortes; se algum ainda estiver deslocado, use setas e zoom no cartão do caso. Aprove os casos corrigidos e publique novamente. O conteúdo público só muda depois de publicar.

## Notas de segurança e offline

- O padrão e a leitura da base publicada são protegidos por RLS e pelas funções do Supabase.
- O treino offline usa arquivos da aplicação e bibliotecas já armazenadas no navegador. O padrão mais recente passa a valer depois da sincronização.
- A base original da hospedagem GitHub Pages não fica realmente privada enquanto seus arquivos antigos permanecerem públicos no repositório. Esse controle restringe o acesso pelo aplicativo e banco.
