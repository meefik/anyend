import { EventEmitter } from 'node:events';

class LifecycleEmitter extends EventEmitter {}
const lifecycleEmitter = new LifecycleEmitter();

export default lifecycleEmitter;
