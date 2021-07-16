import { WorkerDataProvider } from '@flowmap.blue/data';
import { expose } from 'comlink';

expose(new WorkerDataProvider());
