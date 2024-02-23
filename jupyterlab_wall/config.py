from traitlets import Dict, Unicode, Integer
from traitlets.config import Configurable

class AlertsConfig(Configurable):
    alerts = Dict(
        key_trait = Unicode(),
        per_key_traits = {"message": Unicode(), "watch_file": Unicode(), "priority": Integer()}).tag(config=True)

    def get_alerts_config(self):
        out = {k: self.alerts[k] for k in self.alerts}
        with open('/tmp/alerts_config_debug', 'w') as f:
            f.write('alerts config')
            f.write(self.alerts.__str__())
            for k in out:
                f.write("{}: {}\n".format(k, out[k]))
        return out
