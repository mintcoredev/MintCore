export class MintCore {
  constructor({ modules = [], config = {} }) {
    this.modules = new Map();
    this.config = config;
    this.registry = {};

    for (const mod of modules) {
      this.registerModule(mod);
    }
  }

  registerModule(mod) {
    if (!mod.id) throw new Error("Module missing id");
    this.modules.set(mod.id, mod);
  }

  async init() {
    for (const mod of this.modules.values()) {
      if (mod.init) await mod.init(this);
      if (mod.actions) {
        this.registry[mod.id] = mod.actions;
      }
    }
  }

  listModules() {
    return [...this.modules.keys()];
  }

  call(actionPath) {
    const [moduleId, actionName] = actionPath.split(".");
    const mod = this.registry[moduleId];
    if (!mod) throw new Error(`Module not found: ${moduleId}`);
    const action = mod[actionName];
    if (!action) throw new Error(`Action not found: ${actionPath}`);
    return action();
  }
}
