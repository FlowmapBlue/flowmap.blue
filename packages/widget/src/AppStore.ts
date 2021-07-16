import { wrap } from 'comlink';
import { WorkerDataProvider } from '@flowmap.blue/data';
/* eslint-disable import/no-webpack-loader-syntax */
// @ts-ignore
import AppWorkerDataProvider from 'worker-loader!./AppWorkerDataProvider';
import { createCoreAppStore } from '@flowmap.blue/core';

const workerDataProvider = wrap<WorkerDataProvider>(new AppWorkerDataProvider());

export const { useAppStore, useFlowMapStore } = createCoreAppStore(workerDataProvider);
