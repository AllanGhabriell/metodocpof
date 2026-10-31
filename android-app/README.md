# Academia CFOP — aplicativo Android

Este projeto compila um **APK Android real**, com ícone, nome "Academia CFOP", tela própria sem barra de endereços e navegação pelo botão Voltar.

## Como baixar o APK

1. Abra [GitHub Actions — Academia CFOP APK](https://github.com/AllanGhabriell/metodocpof/actions/workflows/android-apk.yml).
2. Abra a execução **mais recente que terminou com sucesso**.
3. Em **Artifacts**, baixe `academia-cfop-android-apk` (ZIP).
4. Extraia o arquivo `app-debug.apk` e abra no celular Android.
5. Caso o Android solicite, permita "Instalar aplicativos desconhecidos" para seu gerenciador de arquivos.

O arquivo ZIP não é o APK: **extraia antes de instalar**.

**Compatibilidade:** Android 10 ou superior. O APK é assinado automaticamente com a chave temporária de depuração do GitHub Actions e é destinado a testes e uso pessoal. Como a assinatura pode mudar entre compilações, outra versão pode exigir a desinstalação da anterior. Para distribuição estável é necessário configurar uma assinatura de lançamento (keystore) privada, que **não deve ser publicada no GitHub**.

## Comportamento do aplicativo

- Abre `https://allanghabriell.github.io/metodocpof/` dentro da interface própria do aplicativo.
- Mantém acesso a Timer 3×3, Cross, F2L, OLL, PLL, conta e perfil.
- Salva dados do site no armazenamento local do aplicativo e utiliza o cache do service worker quando disponível.
- Respeita a navegação interna, o botão Voltar, upload de fotos/backup e downloads.
- Cartões PNG e arquivos CSV/JSON podem ser compartilhados pelo Android ou salvos em `Downloads/Academia CFOP`.
- Links externos são abertos no navegador, não dentro do aplicativo.

## Atenção aos dados e login

**O histórico salvo no Chrome não aparece automaticamente no APK.** Android WebView usa outro armazenamento. Antes de trocar de dispositivo ou desinstalar o APK, exporte os tempos pelo Histórico e importe-os no aplicativo. O login na mesma conta sincroniza apenas os dados que a versão atual da Academia CFOP efetivamente sincroniza no Supabase; ele não copia todos os tempos locais automaticamente.

O login por **e-mail e senha** funciona dentro do aplicativo conforme a configuração do Supabase. O **Google OAuth** é aberto no navegador externo por exigência de segurança do provedor e **pode não retornar a sessão ao APK**. Para evitar esse problema, prefira e-mail e senha. Caso precise especificamente do login Google integrado, uma versão futura poderá usar autenticação nativa com deep links e configuração do provedor.

Como o APK é uma interface para o site hospedado no GitHub Pages, **é necessária internet na primeira abertura**. Alguns arquivos já visitados poderão funcionar sem conexão, mas contas, sincronização e funções online continuam exigindo internet.

## Compilação local

Abra `android-app/` no Android Studio com JDK 17 e Android SDK 35, ou use:

```bash
cd android-app
gradle :app:assembleDebug
```

O APK será criado em `app/build/outputs/apk/debug/app-debug.apk`.

## Segurança

- Apenas páginas da origem oficial `allanghabriell.github.io/metodocpof/` são abertas internamente.
- Tráfego HTTP não criptografado está desativado.
- O compartilhamento nativo não expõe chaves ou credenciais do Supabase.
- O projeto não contém senha, token secreto ou chave de assinatura Android.

## Para publicar na Play Store

O projeto atual é um wrapper Android para instalação própria. Para disponibilização em loja e atualizações instaláveis sem desinstalação, gere uma **chave de assinatura de produção permanente**, assine uma variante release e considere requisitos de Play Console, privacidade e compatibilidade.
