import nodemailer from 'nodemailer';
import { config as serpConfig, getJson as serpWebSearch } from 'serpapi';
// import { whatsapp } from 'node-whatsapp';

// whatsapp.login('yourphonenumber@whatsapp.net', 'yourpassword');

class Tool {
    constructor(name, description, permission = null) {
        this.name = name;
        this.description = description;
        this.permission = permission; // e.g., "weather:read", "db:read"
    }
    async call(input, context = {}) {
        throw new Error('call() not implemented for ' + this.name);
    }
}

class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.permissions = new Map(); // userId => Set(permission)
    }
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    get(name) {
        return this.tools.get(name);
    }
    // simple permission check
    userHasPermission(userId, permission) {
        if (!permission) return true; // public tool
        const set = this.permissions.get(userId);
        return set && set.has(permission);
    }
    grant(userId, permission) {
        if (!this.permissions.has(userId)) this.permissions.set(userId, new Set());
        this.permissions.get(userId).add(permission);
    }
}

class EmailSenderTool extends Tool {
    constructor() {
        super('send_email', 'Send an email to a specified address with subject and body', 'email:send');
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }
    async call(input) {
        try {
            const { to, subject, body } = input;
            const result = await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to,
                subject,
                html: body,
            });
            return { ok: true, result };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }
}

class WebSearchTool extends Tool {
    constructor() {
        super('web_search', 'Search the web for a query and return the top 3 results', 'web:search');

        serpConfig.api_key = process.env.SERP_API_KEY;
        serpConfig.timeout = 60000;
    }

    async call(input) {
        try {
            const { query } = input;

            const response = await serpWebSearch({
                engine: "google",
                q: query
            });

            // Debug
            console.log('WebSearchTool response received');

            // IMPORTANT FIX
            const results = response.organic_results || [];

            const formatted = results.slice(0, 3).map(r => ({
                title: r.title,
                link: r.link,
                snippet: r.snippet
            }));

            return {
                ok: true,
                result: formatted.length ? formatted : "No results found"
            };

        } catch (err) {
            console.log('Error in WebSearchTool:', err.message);

            return {
                ok: false,
                error: err.message
            };
        }
    }
}

class WhatsAppSenderTool extends Tool {
    constructor() {
        super('send_whatsapp', 'Send a WhatsApp message to a specified phone number with message content', 'whatsapp:send');
    }
    async call(input) {
        try {
            const { to, message } = input;
            const whatsapp = {
                to,
                message
            };
            // throw new Error('WhatsApp API integration not implemented yet');
            return { ok: true, result: whatsapp };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }
}

import { spawn } from 'child_process';
import { runWithQueue } from './terminalQueue';
// 5) Terminal Tool: execute terminal commands (use with caution)

const forbidden = ['rm', 'sudo', 'shutdown', 'reboot'];
function validateCmd(cmd) {
    return !forbidden.some(f => cmd.includes(f));
}

class TerminalTool extends Tool {
    constructor() {
        super('terminal', 'Provide and exicute terminal commands (linux/mac/windows).', 'terminal:exec');
    }

    async call(input) {
        try {
            const { cmd } = input;
            if (!cmd) return { ok: false, error: 'cmd required' };
            if (!validateCmd(cmd)) {
                return { ok: false, error: 'Forbidden command' };
            }

            // const result = await runTerminalCommand(cmd);
            const result = await runWithQueue(() => runInDocker(cmd));
            if (result.stderr) {
                return { ok: false, result }
            }
            return { ok: true, result };
        } catch (err) {
            console.error('Terminal command error:', err);
            return { ok: false, error: 'exec_error: ' + err.message };
        }
    }
}

function runTerminalCommand(cmd) {
    return new Promise((resolve, reject) => {
        // split command for spawn
        const parts = cmd.split(' ');
        const command = parts[0];
        const args = parts.slice(1);

        const child = spawn(command, args, { shell: true });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            resolve({
                stdout,
                stderr,
                code
            });
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
}

function runInDocker(cmd, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const dockerCmd = [
            'run', // run a container
            '--rm', // remove container after execution
            '--network', 'none', // no internet (important)
            '--memory', '128m', // limit memory (128MB)
            '--cpus', '0.5', // limit CPU (0.5 cores)
            'ubuntu', //base image
            'bash', // command to run
            '-c', // execute command
            cmd,
        ];

        const child = spawn('docker', dockerCmd);

        let stdout = '';
        let stderr = '';

        const timer = setTimeout(() => {
            child.kill('SIGKILL'); // forcefully terminates a child process immediately without allowing cleanup.
            reject(new Error('Execution timeout'));
        }, timeout);

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        })

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        })

        child.on('close', (code) => {
            clearTimeout(timer);
            resolve({
                stdout,
                stderr,
                code
            })
        })

        child.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        })
    })
}


export { Tool, ToolRegistry, EmailSenderTool, WhatsAppSenderTool, WebSearchTool, TerminalTool };