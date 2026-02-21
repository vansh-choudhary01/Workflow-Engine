import { Planner } from '../planner/planner.js';
import { Executor } from '../executor/executor.js';
import { EmailSenderTool, ToolRegistry, WhatsAppSenderTool } from '../tools/tools.js';

const toolRegistry = new ToolRegistry();
toolRegistry.register(new EmailSenderTool());
toolRegistry.register(new WhatsAppSenderTool());

const planner = new Planner(toolRegistry.tools);
const executor = new Executor(toolRegistry);

export { planner, executor };