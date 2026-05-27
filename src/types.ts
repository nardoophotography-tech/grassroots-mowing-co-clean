"scripts": {
    "dev": "npm run predev && concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "predev": "npx kill-port 3000 5173 || true",
    "dev:server": "tsx watch server.ts",
    "dev:client": "vite",
    "build": "tsc -b && vite build",
    "start": "tsx server.ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tsx": "^4.16.0",
    "typescript": "^5.5.3"
  }