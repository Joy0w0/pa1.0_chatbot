export default {
  apps: [{
    name: 'aidd-monitoring-tool',
    script: 'npm',
    args: 'run dev',
    cwd: '/home/user/webapp',
    env: {
      NODE_ENV: 'development'
    }
  }]
};