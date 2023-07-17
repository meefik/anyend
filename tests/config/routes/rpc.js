export default [{
  path: '/rpc',
  method: 'post',
  rpc: {
    async hello (id, params, req) {
      return {
        say: `Hello ${params.name}`
      };
    }
  }
}];
