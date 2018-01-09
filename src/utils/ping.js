import fetch from 'node-fetch';

function Ping(url) {
    return fetch(url);
}

export default Ping;
