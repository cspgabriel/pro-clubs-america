# Pacotes mobile com PWABuilder

O empacotamento usa os serviços atuais do PWABuilder, sem Capacitor e sem GitHub
Actions. A antiga CLI `@pwabuilder/cli` foi arquivada; por isso o script local
chama diretamente os empacotadores oficiais usados pelo site PWABuilder.

```bash
npm run build:mobile
```

Por padrão, a origem de desenvolvimento do script é a URL técnica do Pages. Os
pacotes de produção atuais foram gerados para o domínio canônico ativo:

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

Depois da primeira geração, o script reutiliza automaticamente a chave contida
no ZIP Android ignorado pelo Git e incrementa o `versionCode`. Isso evita trocar
a identidade criptográfica do aplicativo em uma atualização. Não apague o ZIP,
o `signing.keystore` ou o arquivo local de informações da chave antes de guardar
uma cópia segura fora do repositório.

Estado verificado em 10/08/2026:

- Android para `proclubsamerica.com`: APK assinado, AAB assinado e projeto TWA;
- iOS para `proclubsamerica.com`: projeto Xcode/WKWebView;
- Digital Asset Links publicado para `com.proclubsamerica.app` com o certificado
  do pacote Android atual.

O pacote iOS contém o projeto, mas a Apple exige macOS, Xcode, conta Apple
Developer e assinatura para produzir o IPA e enviar à App Store.

## Compilação e envio do iOS pelo GitHub Actions

Não há macOS nesta operação, então o projeto Xcode gerado pelo PWABuilder é
versionado em `ios/` e compilado por `.github/workflows/ios-release.yml` em um
runner `macos-14` (`workflow_dispatch`). O passo de envio é opcional: a entrada
`upload` começa em `false`, de modo que a execução padrão só produz o `.ipa`
como artefato do workflow.

Regerar o pacote com o PWABuilder sobrescreve `mobile-packages/`, não `ios/`.
Ao trocar de pacote, reaplique em `ios/` os ajustes de conformidade abaixo,
que não vêm do gerador:

- `PrivacyInfo.xcprivacy` declarado e referenciado no `project.pbxproj`
  (sem ele o upload falha com ITMS-91053);
- `UIRequiredDeviceCapabilities` com `arm64` — o template traz `armv7`, 32-bit,
  que a App Store não aceita;
- `Entitlements.plist` sem as chaves `com.apple.security.*`, que são de sandbox
  macOS e quebram o provisionamento iOS;
- `NSAllowsArbitraryLoads` em `false`, `WKAppBoundDomains` sem duplicatas e
  `LSApplicationCategoryType` como `public.app-category.sports`.

Secrets exigidos pelo workflow:

| Secret | Origem |
| --- | --- |
| `IOS_DIST_CERT_P12_BASE64` | certificado Apple Distribution exportado como `.p12` |
| `IOS_DIST_CERT_PASSWORD` | senha definida na exportação do `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | perfil App Store do App ID `com.proclubsamerica.app` |
| `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_API_KEY_P8_BASE64` | App Store Connect API key |

## Login Google

O Android TWA abre a origem HTTPS no Chrome e usa o fluxo Web do Firebase. No
iOS, os domínios do Google e do Firebase foram adicionados à lista permitida do
wrapper. O login deve ser validado em dispositivo real antes da submissão às
lojas.
