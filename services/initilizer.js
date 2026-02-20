import { Planner } from '../planner/planner.js';
import { Executor } from '../executor/executor.js';

const planner = new Planner();
const executor = new Executor();

export { planner, executor };