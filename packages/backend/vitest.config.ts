import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      DOCKER_HOST: `unix://${process.env['HOME']}/.colima/default/docker.sock`,
      TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE: '/var/run/docker.sock',
    },
  },
});
