import app from './src/app.js';
import env, { maskMongoUri } from './src/config/env.js';

const PORT = env.port;

if (env.mongodbUri) {
    console.log(`MongoDB URI loaded: ${maskMongoUri(env.mongodbUri)}`);
} else {
    console.warn('MongoDB URI loaded: not configured');
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${env.nodeEnv}`);
});

process.on('SIGINT', () => {
    console.log('Shutting down server...');
    process.exit();
});
