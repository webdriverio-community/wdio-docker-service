const del = require('../lib/utils/dockerEventsListener').default;

del.on('container.create', (event) => {
    console.log(event);
});

del.on('container.die', (event) => {
    console.log(event);
});

del.connect({
    filter: ['\'type=container\'', '\'type=network\''],
});
