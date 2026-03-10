export default {
  id: "hello",

  init(core) {
    console.log("hello module initialized");
  },

  actions: {
    sayHello() {
      return {
        ok: true,
        message: "Hello from MintCore!"
      };
    }
  }
};
