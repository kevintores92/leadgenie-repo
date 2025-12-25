const app = require('./app');

// Handle unhandled promise rejections (like Redis connection failures)
process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process
});

process.on('uncaughtException', (error) => {
  console.warn('Uncaught Exception:', error);
  // Don't exit the process
});

console.log('Starting server...');
const port = process.env.PORT || 5000;
console.log(`Attempting to listen on port ${port}`);

const server = app.listen(port, () => {
  console.log(`Backend API listening on ${port}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

server.on('close', () => {
  console.log('Server closed');
});
