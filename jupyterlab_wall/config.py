from traitlets import Dict, Unicode, Integer
from traitlets.config import Configurable

class AlertsConfig(Configurable):
    alerts = Dict(
        key_trait = Unicode(),
        per_key_traits = {"message": Unicode(), "watch_file": Unicode(), "priority": Integer()}).tag(config=True)

    def get_alerts_config(self):
        out = {k: self.alerts[k] for k in self.alerts}
        return out
