import app from './src/app.js';
import env from './src/config/env.js';

const PORT = env.port;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${env.nodeEnv}`);
});

process.on('SIGINT', () => {
    console.log('Shutting down server...');
    process.exit();
});
