"""Install the real app on clean simulators and retain launch/screenshots for review."""
import json, os, subprocess, time
from pathlib import Path

def run(*args):
    return subprocess.check_output(args, text=True).strip()

output=Path(os.environ['OUTPUT'])
available=json.loads(run('xcrun','simctl','list','devices','available','--json'))['devices']
ios=[d for runtime,devices in available.items() if 'iOS-26' in runtime for d in devices]
results=[]
for family, preferred in [('iPhone','Pro Max'),('iPad','13-inch')]:
    candidates=[d for d in ios if family in d['name']]
    assert candidates, f'No {family} iOS 26 simulator installed'
    device=next((d for d in candidates if preferred in d['name']),candidates[0])
    udid=device['udid']
    if device['state']!='Booted': run('xcrun','simctl','boot',udid)
    run('xcrun','simctl','bootstatus',udid,'-b')
    run('xcrun','simctl','install',udid,os.environ['APP'])
    launch=run('xcrun','simctl','launch',udid,os.environ['BUNDLE_ID'])
    pid=launch.rsplit(':',1)[-1].strip()
    time.sleep(25)
    # A successful launch alone is insufficient: fail if the process died on startup.
    subprocess.run(['ps','-p',pid],check=True,stdout=subprocess.DEVNULL)
    run('xcrun','simctl','io',udid,'screenshot',str(output/(family+'-launch.png')))
    results.append({'device':device['name'],'launch':launch,'aliveAfterSeconds':25,'screenshot':family+'-launch.png'})
    run('xcrun','simctl','terminate',udid,os.environ['BUNDLE_ID'])
    run('xcrun','simctl','shutdown',udid)
(output/'simulator-smoke.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
