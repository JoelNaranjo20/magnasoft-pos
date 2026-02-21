const { app } = require('electron');
app.on('ready', () => {
    console.log('ELECTRON_IS_WORKING');
    app.quit();
});
