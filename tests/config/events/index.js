export default {
  async startup () {
    console.log('startup event');
  },
  async shutdown () {
    console.log('shutdown event');
  }
};
