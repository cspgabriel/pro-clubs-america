#!/bin/bash
set -euo pipefail
MODE="${1:-compile}"
: "${IOS_FOLDER:?}" "${IOS_TARGET:?}" "${BUNDLE_ID:?}" "${TEAM_ID:?}"
: "${BUILD_NUMBER:=1}" "${MARKETING_VERSION:=1.0.0}"
[[ "$BUILD_NUMBER" =~ ^[1-9][0-9]{0,8}$ ]] || { echo 'Invalid build number'; exit 1; }
[[ "$MARKETING_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Invalid version'; exit 1; }
WORKSPACE="$IOS_FOLDER/$IOS_TARGET.xcworkspace"
PROJECT="$IOS_FOLDER/$IOS_TARGET.xcodeproj/project.pbxproj"
OUTPUT="$RUNNER_TEMP/ios-output"
mkdir -p "$OUTPUT"
export OUTPUT PROJECT
if [[ "$MODE" == prepare ]]; then
  python3 - <<'PY'
import os, re
from pathlib import Path
p=Path(os.environ['PROJECT']); s=p.read_text()
s=re.sub(r'MARKETING_VERSION = [^;]*;', 'MARKETING_VERSION = '+os.environ['MARKETING_VERSION']+';',s)
s=re.sub(r'CURRENT_PROJECT_VERSION = [^;]*;', 'CURRENT_PROJECT_VERSION = '+os.environ['BUILD_NUMBER']+';',s)
p.write_text(s)
PY
  (cd "$IOS_FOLDER" && pod install --repo-update)
  # Apply manual signing only to the app target, never to CocoaPods resource targets.
  if [[ "${SIGNED:-false}" == true ]]; then
    : "${CERT_P12:?Missing distribution certificate}" "${CERT_PASSWORD:?Missing certificate password}" "${PROFILE:?Missing profile}"
    umask 077
    printf '%s' "$CERT_P12" | base64 --decode > "$RUNNER_TEMP/dist.p12"
    printf '%s' "$PROFILE" | base64 --decode > "$RUNNER_TEMP/profile.mobileprovision"
    security cms -D -i "$RUNNER_TEMP/profile.mobileprovision" > "$RUNNER_TEMP/profile.plist"
    python3 - <<'PY'
import os, plistlib, datetime
from pathlib import Path
p=plistlib.loads((Path(os.environ['RUNNER_TEMP'])/'profile.plist').read_bytes())
assert os.environ['TEAM_ID'] in p['TeamIdentifier'], 'Wrong Apple team'
assert p['Entitlements']['application-identifier']==os.environ['TEAM_ID']+'.'+os.environ['BUNDLE_ID'], 'Wrong app profile'
assert p['ExpirationDate'] > datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None), 'Expired profile'
assert not p['Entitlements'].get('get-task-allow', False), 'Development profile cannot publish'
assert not p.get('ProvisionedDevices') and not p.get('ProvisionsAllDevices'), 'App Store profile required'
with open(os.environ['GITHUB_ENV'],'a') as f: f.write('PROFILE_UUID='+p['UUID']+'\n')
PY
    PROFILE_UUID=$(/usr/libexec/PlistBuddy -c 'Print UUID' "$RUNNER_TEMP/profile.plist")
    KEYCHAIN="$RUNNER_TEMP/signing.keychain-db"
    KEYCHAIN_PASSWORD=$(uuidgen)
    security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
    security set-keychain-settings -lut 21600 "$KEYCHAIN"
    security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
    security import "$RUNNER_TEMP/dist.p12" -P "$CERT_PASSWORD" -t cert -f pkcs12 -k "$KEYCHAIN" -T /usr/bin/codesign
    security set-key-partition-list -S apple-tool:,apple:,codesign: -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN" >/dev/null
    security list-keychains -d user -s "$KEYCHAIN" login.keychain-db
    mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
    cp "$RUNNER_TEMP/profile.mobileprovision" "$HOME/Library/MobileDevice/Provisioning Profiles/$PROFILE_UUID.mobileprovision"
    export PROFILE_UUID
    ruby -rxcodeproj -e '
      p=Xcodeproj::Project.open(ENV.fetch("PROJECT").sub("/project.pbxproj", ""))
      t=p.targets.find {|target| target.name == ENV.fetch("IOS_TARGET")}; abort "Missing app target" unless t
      t.build_configurations.each do |config|
        config.build_settings["CODE_SIGN_STYLE"]="Manual"
        config.build_settings["CODE_SIGN_IDENTITY"]="Apple Distribution"
        config.build_settings["DEVELOPMENT_TEAM"]=ENV.fetch("TEAM_ID")
        config.build_settings["PROVISIONING_PROFILE_SPECIFIER"]=ENV.fetch("PROFILE_UUID")
      end
      p.save'
  fi
elif [[ "$MODE" == compile ]]; then
  xcodebuild build -workspace "$WORKSPACE" -scheme "$IOS_TARGET" -configuration Release \
    -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO \
    -resultBundlePath "$OUTPUT/device-build.xcresult" > "$OUTPUT/device-build.log" 2>&1 || { tail -n 90 "$OUTPUT/device-build.log"; exit 1; }
  tail -n 5 "$OUTPUT/device-build.log"
elif [[ "$MODE" == simulator ]]; then
  xcodebuild build -workspace "$WORKSPACE" -scheme "$IOS_TARGET" -configuration Debug \
    -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath "$RUNNER_TEMP/simulator-build" \
    CODE_SIGNING_ALLOWED=NO > "$OUTPUT/simulator-build.log" 2>&1 || { tail -n 90 "$OUTPUT/simulator-build.log"; exit 1; }
  APP=$(find "$RUNNER_TEMP/simulator-build/Build/Products/Debug-iphonesimulator" -maxdepth 1 -name '*.app' -print -quit)
  test -n "$APP"
  export APP
  python3 scripts/ios-simulator-smoke.py
elif [[ "$MODE" == archive ]]; then
  xcodebuild archive -workspace "$WORKSPACE" -scheme "$IOS_TARGET" -configuration Release \
    -destination 'generic/platform=iOS' -archivePath "$RUNNER_TEMP/App.xcarchive" \
    > "$OUTPUT/archive.log" 2>&1 || { tail -n 90 "$OUTPUT/archive.log"; exit 1; }
  python3 - <<'PY'
import os, plistlib
from pathlib import Path
p={'method':'app-store-connect','teamID':os.environ['TEAM_ID'],'signingStyle':'manual','uploadSymbols':True,'provisioningProfiles':{os.environ['BUNDLE_ID']:os.environ['PROFILE_UUID']}}
(Path(os.environ['RUNNER_TEMP'])/'ExportOptions.plist').write_bytes(plistlib.dumps(p))
PY
  xcodebuild -exportArchive -archivePath "$RUNNER_TEMP/App.xcarchive" \
    -exportOptionsPlist "$RUNNER_TEMP/ExportOptions.plist" -exportPath "$OUTPUT/export" \
    > "$OUTPUT/export.log" 2>&1 || { tail -n 90 "$OUTPUT/export.log"; exit 1; }
elif [[ "$MODE" == upload ]]; then
  : "${ASC_KEY_ID:?}" "${ASC_ISSUER_ID:?}" "${ASC_KEY_P8:?}"
  [[ "$ASC_KEY_ID" =~ ^[A-Z0-9]+$ ]] || exit 1
  umask 077
  mkdir -p "$HOME/.appstoreconnect/private_keys"
  KEY_FILE="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
  printf '%s' "$ASC_KEY_P8" | base64 --decode > "$KEY_FILE"
  trap 'rm -f "$KEY_FILE"' EXIT
  IPA=$(find "$OUTPUT/export" -maxdepth 1 -name '*.ipa' -print -quit)
  test -n "$IPA"
  xcrun altool --validate-app -f "$IPA" -t ios --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
  xcrun altool --upload-app -f "$IPA" -t ios --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
else
  echo 'Unknown mode'; exit 1
fi
