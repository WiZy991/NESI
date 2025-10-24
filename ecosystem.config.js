module.exports = {
	apps: [
		{
			name: 'nesi-app',
			script: 'npm',
			args: 'start',
			cwd: '/home/nesi/nesi-app',
			instances: 'max', // Использует все CPU ядра для лучшей производительности
			exec_mode: 'cluster',
			env: {
				NODE_ENV: 'production',
				PORT: 3000,
			},
			error_file: '/home/nesi/logs/nesi-error.log',
			out_file: '/home/nesi/logs/nesi-out.log',
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
			merge_logs: true,
			autorestart: true,
			watch: false,
			max_memory_restart: '1G',
			exp_backoff_restart_delay: 100,
			// Настройки для graceful shutdown
			kill_timeout: 5000,
			listen_timeout: 3000,
			shutdown_with_message: true,
		},
	],
}
