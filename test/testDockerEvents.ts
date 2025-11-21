import DockerEventsListener from '@root/utils/dockerEventsListener.js';
const del = new DockerEventsListener();

del.on('container.create', (event) => {
    console.log(event);
});

del.on('container.health_status', (event) => {
    console.log(event);
});

del.on('container.die', (event) => {
    console.log(event);
});

del.on('image.pull', (event) => {
    console.log(event);
});

del.connect({
    filter: ['\'type=image\'', '\'type=container\'', '\'type=network\''],
});
