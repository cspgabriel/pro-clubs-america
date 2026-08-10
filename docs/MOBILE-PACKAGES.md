# Pacotes mobile com PWABuilder

O empacotamento usa os serviços atuais do PWABuilder, sem Capacitor e sem GitHub
Actions. A antiga CLI `@pwabuilder/cli` foi arquivada; por isso o script local
chama diretamente os empacotadores oficiais usados pelo site PWABuilder.

```bash
npm run build:mobile
```

Por padrão, a origem é `https://pro-clubs-america.pages.dev/`. Para empacotar o
domínio próprio depois da ativação:

```bash
PWA_URL=https://proclubsamerica.com npm run build:mobile
```

Artefatos em `mobile-packages/`:

- `pro-clubs-america-android.zip`: APK de teste, AAB para Google Play, chave de
  assinatura gerada e projeto-fonte TWA;
- `pro-clubs-america-ios.zip`: projeto Xcode baseado em WKWebView;
- `package-result.json`: resultado reproduzível da geração.

O Android pode ser testado imediatamente com o APK contido no ZIP. Antes da
publicação, preserve a chave de assinatura e publique o `assetlinks.json`
fornecido no pacote em `/.well-known/assetlinks.json`.

O pacote iOS contém o projeto, mas a Apple exige macOS, Xcode, conta Apple
Developer e assinatura para produzir o IPA e enviar à App Store.

## Login Google

O Android TWA abre a origem HTTPS no Chrome e usa o fluxo Web do Firebase. No
iOS, os domínios do Google e do Firebase foram adicionados à lista permitida do
wrapper. O login deve ser validado em dispositivo real antes da submissão às
lojas.
