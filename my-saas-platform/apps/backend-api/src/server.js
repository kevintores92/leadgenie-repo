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

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Backend API listening on ${port}`);
});
