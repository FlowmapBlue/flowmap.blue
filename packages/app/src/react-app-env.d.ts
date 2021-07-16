/// <reference types="react-scripts" />
declare module 'worker-loader!*' {
  class WebpackWorker extends Worker {
    constructor();
  }

  export default WebpackWorker;
}
