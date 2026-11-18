// This module throws while it is evaluated, before the host can create the plugin.
function fail(): never {
  throw new Error('broken at load');
}

export default fail();
