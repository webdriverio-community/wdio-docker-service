import fetch from 'node-fetch';

function Ping(url: URL) {
    return fetch(url);
}

class PingClass {
    Ping(url: URL) {
        return fetch(url);
    }
}

export default PingClass;
export { Ping };
