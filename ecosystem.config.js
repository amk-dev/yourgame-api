module.exports = {
	apps: [
		{
			name: 'yourgame-staging',
			script: 'dist/index.js',
			node_args: '--require dotenv/config',
		},
	],
}
