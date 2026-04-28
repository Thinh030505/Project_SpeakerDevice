import env from './env.js';

const emailConfig = {
    host: env.emailHost,
    port: env.emailPort,
    secure: env.emailSecure,
    auth: {
        user: env.emailUser,
        pass: env.emailPass
    },
    from: {
        name: env.emailFromName,
        address: env.emailUser
    }
};

export default emailConfig;
