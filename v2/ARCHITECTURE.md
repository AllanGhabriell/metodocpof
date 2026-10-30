# CFOP Studio — arquitetura e roteiro técnico

## Estado atual
O site é hospedável como arquivos estáticos e o ponto de entrada público é `/index.html`, que carrega `/v2/app.css` e `/v2/app.js`. A navegação e o cronômetro básico usam JavaScript no navegador; os tempos ficam em `localStorage`. Não existe autenticação, backend ou motor matemático de cubo implementado.

## Organização
- `/index.html`: entrada pública da aplicação.
- `/v2/app.css`: estilos, responsividade e efeitos de movimento reduzido.
- `/v2/app.js`: interface atual; deve ser dividida em módulos conforme a migração.
- `/v2/data/schema.json`: contrato inicial de dados, não uma biblioteca preenchida.
- `/v2/tests/`: testes de regressão.
- `/.github/workflows/cfop-checks.yml`: validação automática em alterações do repositório.

## Diretrizes para as próximas etapas
1. Separar o motor de cubo da apresentação: notação, estado, aplicação de movimentos, inversão, validação e scramble devem ser funções testáveis sem DOM.
2. Construir visualizadores 2D/3D consumindo o **mesmo estado** do motor; a câmera não altera o estado lógico.
3. Cadastrar casos com IDs estáveis e algoritmos associados a estados verificados; nunca preencher a biblioteca com exemplos apresentados como casos oficiais.
4. Manter conteúdo técnico de implementação fora da interface pública.
5. Persistir configurações e resoluções localmente em modo visitante; implementar migração versionada quando houver sincronização.
6. Autenticação e painel administrativo precisam de backend e regras de autorização no servidor; GitHub Pages isolado não oferece isso.
7. Separar navegação, componentes, serviços, dados e testes gradualmente, evitando reescrever funcionalidades que já funcionam.

## Modelo de dados
O contrato em `data/schema.json` define as coleções `cases`, `solves`, `progress` e `settings`. Ele é um projeto de estrutura, não uma validação de algoritmos nem uma implementação de armazenamento.

## Verificação
Execute `node --check v2/app.js` e `node --test v2/tests/*.test.mjs` na raiz do repositório. O workflow do GitHub Actions executa esses comandos em pushes e pull requests.

## Próxima etapa
Implementar o motor matemático 3×3 e seus testes de invariantes antes de conectar diagramas, casos ou prévias do cronômetro.

## Área de revisão de casos (incremento de 30/10/2026)
A navegação **Revisão** permite cadastrar casos individualmente, preencher setup, solução, diagrama de referência (faces com nove adesivos e `?` para posições não especificadas), estado esperado (54 adesivos), executar verificações e registrar uma aprovação local. A aprovação é anulada sempre que o caso é editado ou importado. O arquivo JSON pode ser exportado para preservar e transferir rascunhos.

**Limites:** essa revisão é um espaço de trabalho no navegador, não um painel administrativo autenticado. A marcação de aprovação não identifica juridicamente nem autentica o proprietário; não libera conteúdo global no site e não sincroniza dispositivos. Para publicação real é necessário autenticação segura, backend e regras de autorização. O sistema também ainda não fez a conferência visual independente dos diagramas dos PDFs, nem o cadastro completo dos 119 casos. A interpretação de movimentos simultâneos entre chaves nos casos G exige implementação específica e validação antes da importação.

## Responsabilidades do proprietário
1. Revisar visualmente os diagramas e algoritmos de cada caso depois da importação e dos testes automáticos.
2. Aprovar cada caso na interface de revisão quando estiver correto.
3. Para contas e administração online: escolher e autorizar uma infraestrutura de autenticação e armazenamento, com acesso seguro. Não compartilhar senhas ou tokens no código público.
4. Avaliar a experiência final no próprio celular e computador.

As demais tarefas técnicas, testes, layout e publicação do código são de desenvolvimento.
