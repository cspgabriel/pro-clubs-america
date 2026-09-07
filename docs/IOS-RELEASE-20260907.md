# Release iOS

Estado: preparação, ainda não enviado à Apple.

Bundle com.proclubsamerica.app; Team BUK3X7JL65 confirmado. Workflow iOS Release usa Xcode 26.3, compilação para dispositivo e inicialização real em simuladores iPhone/iPad com screenshots. Push na branch de preparação executa build sem assinatura.

Secrets exigidos para IPA: IOS_DIST_CERT_P12_BASE64, IOS_DIST_CERT_PASSWORD, IOS_PROVISIONING_PROFILE_BASE64. Para upload: ASC_KEY_ID, ASC_ISSUER_ID, ASC_API_KEY_P8_BASE64. Nunca versionar seus valores.

Firebase Messaging nativo ainda não configurado: chamadas são protegidas para evitar falha na inicialização. Notificações nativas não estão prontas. A autenticação web existente foi preservada. Conferir login real, navegação, upload/PDF e exclusão de conta antes da revisão.

A captura de inicialização não comprova todos os fluxos. Completar metadados, capturas reais, privacidade do serviço web e conta de revisão antes do envio.

SDK mínimo Apple: https://developer.apple.com/news/?id=ueeok6yw
