import nodemailer from 'nodemailer';
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
            return { ok: true, result: whatsapp };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }
}

export { Tool, ToolRegistry, EmailSenderTool, WhatsAppSenderTool };