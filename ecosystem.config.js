module.exports = {
    apps: [
        {
            name: 'apitth',
            script: './server.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            restart_delay: 5000,

            env: {
                NODE_ENV: 'development',
            },

            env_development: {
                NODE_ENV: 'development',
            },

            env_production: {
                NODE_ENV: 'production',
            },
        },
    ],
};
