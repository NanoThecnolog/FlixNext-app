# Configuração do aplicativo Android

As propriedades públicas ficam em `app.json`. Segredos e endereços internos não
devem entrar nesse arquivo nem usar o prefixo `EXPO_PUBLIC_`.

## Identidade e versão

- `expo.name`: nome exibido no aparelho e na loja.
- `expo.slug`: identificador do projeto no Expo/EAS; evite alterá-lo após publicar.
- `expo.version`: versão visível, por exemplo `1.2.0`.
- `expo.android.package`: application ID único. Depois da primeira publicação na
  Play Store, `br.com.flixnext.android` não poderá ser trocado para atualizar o app.
- `expo.android.versionCode`: inteiro sempre crescente em cada envio à Play Store.
- `expo.scheme`: abre links como `flixnext://details/123` quando o deep linking for
  implementado.

Para a próxima versão, por exemplo:

```json
{
  "version": "1.1.0",
  "android": {
    "versionCode": 2
  }
}
```

## Ícone adaptativo

Crie `assets/` na raiz do app e exporte:

- `icon.png`: 1024 x 1024, imagem quadrada completa;
- `adaptive-icon.png`: 1024 x 1024, somente o símbolo em PNG transparente;
- `splash-icon.png`: símbolo central em PNG transparente;
- `monochrome-icon.png`: versão monocromática para ícones temáticos do Android 13+.

O símbolo importante do ícone adaptativo deve ficar dentro da área segura central,
pois cada fabricante aplica uma máscara diferente. Depois, complete `app.json`:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#141414",
        "monochromeImage": "./assets/monochrome-icon.png"
      }
    },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-icon.png",
          "imageWidth": 200,
          "backgroundColor": "#141414"
        }
      ]
    ]
  }
}
```

Antes de adicionar o plugin acima, instale a versão compatível com o SDK do Expo:

```bash
npx expo install expo-splash-screen
```

Não use uma captura retangular ou o logotipo com texto como foreground adaptativo:
ele será recortado em aparelhos que usam ícones circulares.

## Manifest Android e permissões

No fluxo gerenciado do Expo, `app.json` e os config plugins geram o
`AndroidManifest.xml`. Edite o manifest nativo manualmente somente se o projeto
`android/` gerado passar a ser mantido no Git.

Este app bloqueia `RECORD_AUDIO`, pois o player não grava áudio. Confira o manifest
final sempre que adicionar um pacote:

```bash
npx expo prebuild --platform android
sed -n '1,240p' android/app/src/main/AndroidManifest.xml
```

`expo prebuild` pode atualizar arquivos nativos. Faça isso com o Git limpo para
conseguir revisar o resultado.

## Ambiente

O único endereço necessário no app é o frontend Next.js:

```dotenv
EXPO_PUBLIC_FRONTEND_URL=https://flixnext.com.br
```

Ele é público e incorporado ao bundle. Tokens do TMDB, `API_KEY`, URLs privadas do
DBmanager, mensageria, assinatura e backend permanecem exclusivamente no servidor
Next.js.

## Verificação e build

```bash
npm run typecheck
npm run config
npx expo-doctor
npx eas-cli login
npx eas-cli build:configure
npm run build:preview
npm run build
```

Use o perfil `preview` para APK interno e `production` para o AAB enviado à Play
Store. Antes de produção, valide login, troca de dispositivo, reprodução de filme,
episódios, retomada de progresso e Minha Lista em um aparelho físico.
